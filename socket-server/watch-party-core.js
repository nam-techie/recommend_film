import crypto from 'node:crypto'
import { TrackSource } from 'livekit-server-sdk'

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

export function findDeniedMediaEpisode(episodes, configuredHosts = []) {
  return (episodes || []).find((episode) => episode?.linkM3u8 && !isAllowedMediaUrl(episode.linkM3u8, configuredHosts)) || null
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

export function connectedMemberCount(room) {
  return Object.values(room?.members || {}).filter((member) => member.connected).length
}

export function clearRoomHost(room) {
  const previousHostMemberId = room.hostMemberId || ''
  const previousHost = room.members?.[previousHostMemberId]
  if (previousHost) previousHost.role = 'viewer'
  room.hostMemberId = ''
  room.hostReconnectDeadline = null
  return previousHostMemberId
}

export function claimVacantHost(room, memberId) {
  const member = room?.members?.[memberId]
  if (!member?.connected) return false
  const currentHost = room.members?.[room.hostMemberId]
  if (currentHost?.connected && currentHost.memberId !== memberId) return false
  for (const candidate of Object.values(room.members || {})) {
    if (candidate.memberId !== memberId && candidate.role === 'host') candidate.role = 'viewer'
  }
  member.role = 'host'
  room.hostMemberId = memberId
  room.hostReconnectDeadline = null
  room.status = 'active'
  room.playback.revision += 1
  return true
}

export function markRoomOccupied(room) {
  room.emptySince = null
  room.lifecycle = { ...(room.lifecycle || { hardExpiresAt: room.expiresAt }), emptySince: null, deleteAt: null }
  if (room.status === 'empty_grace') room.status = 'active'
  return room
}

export function markRoomEmpty(room, now, emptyTtlMs) {
  room.emptySince = now
  room.status = 'empty_grace'
  room.lifecycle = { ...(room.lifecycle || { hardExpiresAt: room.expiresAt }), emptySince: now, deleteAt: now + emptyTtlMs }
  return room
}

export function shouldCloseEmptyRoom(room, now) {
  return Boolean(room?.lifecycle?.deleteAt && room.lifecycle.deleteAt <= now)
}

export function isPublicRoomDiscoverable(room) {
  return Boolean(room?.accessMode === 'public' && room.status !== 'closed' && room.status !== 'closing' && connectedMemberCount(room) > 0)
}

export function applyVoicePermission(room, enabled) {
  room.voiceEnabled = Boolean(enabled)
  return room
}

export function buildVoiceGrant(roomId) {
  return { roomJoin: true, room: roomId, canSubscribe: true, canPublish: true, canPublishData: false, canPublishSources: [TrackSource.MICROPHONE] }
}

export function findEligibleInvitingMember(room, uid) {
  return Object.values(room?.members || {}).find((member) => member.uid === uid && !member.isAnonymous) || null
}

export const REMOTE_PAIRING_TTL_MS = 120_000
const REMOTE_COMMANDS = new Set(['play', 'pause', 'toggle', 'seek', 'seek_relative', 'volume', 'mute', 'fullscreen', 'resync'])
const clampNumber = (value, min, max, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback
}

export function createPairingRecord(roomId, memberId, now, ttlMs = REMOTE_PAIRING_TTL_MS) {
  return { roomId, memberId, createdAt: now, expiresAt: now + ttlMs }
}

export function isPairingUsable(record, roomId, now) {
  return Boolean(record && record.roomId === roomId && record.memberId && record.expiresAt > now)
}

export function sanitizeScreenState(payload) {
  const episodeId = String(payload?.episodeId || '').slice(0, 120)
  if (!episodeId) return null
  return {
    episodeId,
    currentTime: clampNumber(payload?.currentTime, 0, 86_400),
    duration: clampNumber(payload?.duration, 0, 86_400),
    isPlaying: Boolean(payload?.isPlaying),
    volume: clampNumber(payload?.volume, 0, 1, 1),
    muted: Boolean(payload?.muted),
    volumeWritable: payload?.volumeWritable !== false,
    playerState: String(payload?.playerState || 'idle').slice(0, 32),
  }
}

export function normalizeRemoteCommand(payload) {
  const type = String(payload?.type || '')
  if (!REMOTE_COMMANDS.has(type)) return null
  if (type === 'seek') return { type, value: clampNumber(payload?.value, 0, 86_400) }
  if (type === 'seek_relative') return { type, value: clampNumber(payload?.value, -600, 600) }
  if (type === 'volume') return { type, value: clampNumber(payload?.value, 0, 1, 1) }
  if (type === 'mute' || type === 'fullscreen') return { type, value: Boolean(payload?.value) }
  return { type }
}

// Remote handsets share their member's identity but must never keep that member
// marked as present: a room with only handsets attached has nothing playing.
export function attachDeviceSocket(member, socketId, deviceRole) {
  const key = deviceRole === 'remote' ? 'remoteSocketIds' : 'socketIds'
  member[key] = [...new Set([...(member[key] || []), socketId])]
  member.connected = (member.socketIds || []).length > 0
  return member
}

export function detachDeviceSocket(member, socketId) {
  member.socketIds = (member.socketIds || []).filter((value) => value !== socketId)
  member.remoteSocketIds = (member.remoteSocketIds || []).filter((value) => value !== socketId)
  member.connected = member.socketIds.length > 0
  return member
}

export function remoteDeviceCount(member) {
  return (member?.remoteSocketIds || []).length
}
