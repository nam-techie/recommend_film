import crypto from 'node:crypto'

const scrypt = (value, salt) => new Promise((resolve, reject) => crypto.scrypt(value, salt, 64, (error, key) => error ? reject(error) : resolve(key)))

export async function hashRoomPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const key = await scrypt(password, salt)
  return `${salt}:${key.toString('hex')}`
}

export async function verifyRoomPassword(password, stored) {
  const [salt, expectedHex] = String(stored || '').split(':')
  if (!salt || !expectedHex) return false
  const actual = await scrypt(password, salt)
  const expected = Buffer.from(expectedHex, 'hex')
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

export function sourceCapability(episode) {
  return episode?.linkM3u8 ? 'full' : episode?.linkEmbed ? 'limited' : 'unavailable'
}

export function isAllowedClientOrigin(origin, configuredOrigins = []) {
  if (!origin) return true
  const normalized = String(origin).replace(/\/$/, '')
  if (configuredOrigins.includes(normalized)) return true
  try {
    const url = new URL(normalized)
    return ['http:', 'https:'].includes(url.protocol) && ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
  } catch {
    return false
  }
}

export function chooseHostSuccessor(members, currentHostMemberId) {
  return Object.values(members)
    .filter((member) => member.connected && member.memberId !== currentHostMemberId)
    .sort((a, b) => a.joinedAt - b.joinedAt || a.memberId.localeCompare(b.memberId))[0] || null
}

export function applyVoicePermission(room, enabled) {
  room.voiceEnabled = Boolean(enabled)
  if (!room.voiceEnabled) {
    Object.values(room.members || {}).forEach((member) => {
      member.micEnabled = false
      member.voiceJoined = false
    })
  }
  return room
}

export function applyMemberMicState(room, memberId, micEnabled) {
  const member = room.members?.[memberId]
  if (!member) return { ok: false, code: 'ROOM_NOT_FOUND' }
  if (micEnabled && !room.voiceEnabled) return { ok: false, code: 'VOICE_DISABLED' }

  member.micEnabled = Boolean(micEnabled)
  member.voiceJoined = Boolean(room.voiceEnabled)
  return { ok: true, member }
}
