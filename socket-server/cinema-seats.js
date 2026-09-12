// Seat state is separate from room snapshots so unrelated room writes cannot
// overwrite reservations. Redis performs each claim atomically across workers.
export const SEAT_GRACE_MS = 90_000
export const seatCapacity = () => 36
export const isVipSeat = (seatId) => typeof seatId === 'string' && /^V[1-4]$/.test(seatId)
export function validSeat(seatId) {
  return typeof seatId === 'string' && (/^[A-H][1-4]$/.test(seatId) || isVipSeat(seatId))
}
export function transitionSeats(state, operation, memberId, seatId, now, capacity, ultra = false) {
  const next = structuredClone(state || { revision: 0, reservations: {} })
  let changed = false
  for (const [id, reservation] of Object.entries(next.reservations)) {
    if (reservation.expiresAt <= now || !validSeat(reservation.seatId)) { delete next.reservations[id]; changed = true }
  }
  if (isVipSeat(next.reservations[memberId]?.seatId) && !ultra && operation === 'renew') { delete next.reservations[memberId]; changed = true }
  let code
  if (operation === 'claim') {
    if (!validSeat(seatId, capacity)) code = 'INVALID_SEAT'
    else if (isVipSeat(seatId) && !ultra) code = 'ULTRA_REQUIRED'
    else if (Object.entries(next.reservations).some(([id, item]) => id !== memberId && item.seatId === seatId)) code = 'SEAT_TAKEN'
    else { next.reservations[memberId] = { seatId, expiresAt: now + SEAT_GRACE_MS }; changed = true }
  } else if (operation === 'renew' && next.reservations[memberId]) {
    next.reservations[memberId].expiresAt = now + SEAT_GRACE_MS; changed = true
  } else if (operation === 'release' && next.reservations[memberId]) {
    delete next.reservations[memberId]; changed = true
  }
  if (changed) next.revision += 1
  return { ok: !code, ...(code ? { code } : {}), state: next }
}

const SCRIPT = `
local raw = redis.call('GET', KEYS[1])
local state = raw and cjson.decode(raw) or {revision=0,reservations={}}
local op, member, seat = ARGV[1], ARGV[2], ARGV[3]
local now, grace, capacity = tonumber(ARGV[4]), tonumber(ARGV[5]), tonumber(ARGV[6])
local changed, code = false, nil
local ultra = ARGV[8] == '1'
local function valid(id) return string.match(id, '^[A-H][1-4]$') or string.match(id, '^V[1-4]$') end
for id, item in pairs(state.reservations) do
  if item.expiresAt <= now or not valid(item.seatId) then state.reservations[id]=nil; changed=true end
end
if op == 'renew' and state.reservations[member] and string.match(state.reservations[member].seatId, '^V[1-4]$') and not ultra then state.reservations[member]=nil; changed=true end
if op == 'claim' then
  local allowed = valid(seat)
  if not allowed then code='INVALID_SEAT' elseif string.match(seat, '^V[1-4]$') and not ultra then code='ULTRA_REQUIRED' else
    for id,item in pairs(state.reservations) do
      if id ~= member and item.seatId == seat then code='SEAT_TAKEN' end
    end
    if not code then state.reservations[member]={seatId=seat,expiresAt=now+grace}; changed=true end
  end
elseif op == 'renew' and state.reservations[member] then
  state.reservations[member].expiresAt=now+grace; changed=true
elseif op == 'release' and state.reservations[member] then
  state.reservations[member]=nil; changed=true
end
if changed then state.revision=state.revision+1 end
redis.call('SET',KEYS[1],cjson.encode(state),'EX',ARGV[7])
return cjson.encode({ok=not code,code=code,state=state})
`

export class CinemaSeatStore {
  constructor(redis = null) { this.redis = redis; this.rooms = new Map() }
  async update(room, operation = 'read', memberId = '', seatId = '', now = Date.now()) {
    let result
    const capacity = seatCapacity()
    const ultra = room.members?.[memberId]?.accountPlan === 'ultra'
    if (this.redis) {
      result = JSON.parse(await this.redis.eval(SCRIPT, {
        keys: [`watch-party:seats:${room.id}`],
        arguments: [operation, memberId, seatId, String(now), String(SEAT_GRACE_MS), String(capacity), String(Math.max(1, Math.ceil((room.expiresAt - now) / 1000) + 60)), ultra ? '1' : '0'],
      }))
    } else {
      result = transitionSeats(this.rooms.get(room.id), operation, memberId, seatId, now, capacity, ultra)
      this.rooms.set(room.id, result.state)
    }
    return { ok: result.ok, code: result.code, snapshot: { revision: result.state.revision, capacity,
      seats: Object.fromEntries(Object.entries(result.state.reservations).map(([id, item]) => [item.seatId, id])),
    } }
  }
  async delete(roomId) {
    this.rooms.delete(roomId)
    if (this.redis) await this.redis.del(`watch-party:seats:${roomId}`)
  }
}
