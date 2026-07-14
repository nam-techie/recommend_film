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

export function isAllowedMediaUrl(value, configuredHosts = []) {
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    if (!['http:', 'https:'].includes(url.protocol)) return false
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false
    if (/^10\.|^127\.|^169\.254\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false
    if (/^v\d+\.kkphimplayer\d*\.com$/.test(host) || host === 'kkphimplayer.com' || host.endsWith('.kkphimplayer.com')) return true
    if (host === 's3.phim1280.tv') return true
    return configuredHosts.some((entry) => {
      const rule = String(entry || '').trim().toLowerCase()
      if (!rule) return false
      if (rule.startsWith('*.')) {
        const suffix = rule.slice(2)
        return host === suffix || host.endsWith(`.${suffix}`)
      }
      return host === rule
    })
  } catch {
    return false
  }
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
  return room
}

export function buildVoiceGrant(roomId) {
  return { roomJoin: true, room: roomId, canSubscribe: true, canPublish: true, canPublishData: false, canPublishSources: ['microphone'] }
}
