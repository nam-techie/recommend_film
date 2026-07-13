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

export function chooseHostSuccessor(members, currentHostMemberId) {
  return Object.values(members)
    .filter((member) => member.connected && member.memberId !== currentHostMemberId)
    .sort((a, b) => a.joinedAt - b.joinedAt || a.memberId.localeCompare(b.memberId))[0] || null
}
