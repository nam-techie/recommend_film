// Separate storage prevents playback/heartbeat room writes from overwriting appearance.
export class CinemaCharacterStore {
  constructor(redis = null) { this.redis = redis; this.rooms = new Map() }
  key(roomId) { return `watch-party:characters:${roomId}` }
  async read(roomId) {
    if (this.redis) {
      const values = await this.redis.hGetAll(this.key(roomId))
      return Object.fromEntries(Object.entries(values).map(([id, value]) => [id, JSON.parse(value)]))
    }
    return this.rooms.get(roomId) || {}
  }
  async update(room, memberId, gender, initialize = false) {
    if (this.redis) {
      const value = await this.redis.eval(`
        local old = redis.call('HGET', KEYS[1], ARGV[1])
        if old and ARGV[3] == '1' then return old end
        local revision = old and cjson.decode(old).characterRevision or 0
        local next = cjson.encode({characterGender=ARGV[2], characterRevision=revision+1})
        redis.call('HSET', KEYS[1], ARGV[1], next)
        redis.call('EXPIRE', KEYS[1], ARGV[4])
        return next
      `, { keys: [this.key(room.id)], arguments: [memberId, gender, initialize ? '1' : '0', String(Math.max(1, Math.ceil((room.expiresAt - Date.now()) / 1000) + 60))] })
      return JSON.parse(value)
    }
    const members = this.rooms.get(room.id) || {}
    if (initialize && members[memberId]) return members[memberId]
    const value = { characterGender: gender, characterRevision: (members[memberId]?.characterRevision || 0) + 1 }
    members[memberId] = value; this.rooms.set(room.id, members)
    return value
  }
  async hydrate(room) {
    if (!room) return room
    const values = await this.read(room.id)
    for (const [id, value] of Object.entries(values)) if (room.members[id]) Object.assign(room.members[id], value)
    return room
  }
  async delete(roomId) { if (this.redis) await this.redis.del(this.key(roomId)); else this.rooms.delete(roomId) }
}

export function registerCharacterHandler(socket, { io, store, characters }) {
  socket.on('cinema:character', async (payload, ack) => {
    try {
      const { roomId, memberId, deviceRole } = socket.data.identity
      if (deviceRole === 'remote') return ack?.({ ok: false, code: 'SCREEN_ONLY' })
      if (!payload || !['male', 'female'].includes(payload.gender) ||
        Object.keys(payload).some(key => !['gender', 'initialize'].includes(key)) ||
        (payload.initialize !== undefined && typeof payload.initialize !== 'boolean')) return ack?.({ ok: false, code: 'INVALID_CHARACTER' })
      const room = await store.getRoom(roomId)
      if (!room?.members[memberId]?.connected || ['closing', 'closed'].includes(room.status) || room.expiresAt <= Date.now()) return ack?.({ ok: false, code: 'ROOM_NOT_FOUND' })
      if (!(await store.allow(`character:${roomId}:${memberId}`, 12, 5000))) return ack?.({ ok: false, code: 'RATE_LIMITED' })
      const character = await characters.update(room, memberId, payload.gender, payload.initialize)
      const update = { memberId, ...character }
      io.to(roomId).emit('cinema:character', update)
      ack?.({ ok: true, ...update })
    } catch { ack?.({ ok: false, code: 'CHARACTER_UNAVAILABLE' }) }
  })
}
