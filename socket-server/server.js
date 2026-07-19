import http from 'node:http'
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { createClient } from 'redis'
import { createAdapter } from '@socket.io/redis-adapter'
import { Server } from 'socket.io'
import { z } from 'zod'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getDatabase } from 'firebase-admin/database'
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk'
import nodemailer from 'nodemailer'
import { applyVoicePermission, buildVoiceGrant, chooseHostSuccessor, claimVacantHost, clearRoomHost, connectedMemberCount, findDeniedMediaEpisode, findEligibleInvitingMember, hashRoomPassword, isAllowedClientOrigin, isAllowedMediaUrl, isPublicRoomDiscoverable, markRoomEmpty, markRoomOccupied, shouldCloseEmptyRoom, sourceCapability, verifyRoomPassword } from './watch-party-core.js'
import dotenv from 'dotenv'

if (process.env.NODE_ENV !== 'production') dotenv.config({ path: new URL('../.env', import.meta.url) })

const PORT = Number(process.env.PORT || 4001)
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const REDIS_URL = process.env.REDIS_URL || ''
const TOKEN_SECRET = process.env.WATCH_PARTY_TOKEN_SECRET || (IS_PRODUCTION ? '' : 'dev-only-change-me')
const ROOM_TTL_SECONDS = Number(process.env.ROOM_TTL_SECONDS || 43200)
const EMPTY_ROOM_TTL_SECONDS = Number(process.env.EMPTY_ROOM_TTL_SECONDS || 300)
const HOST_GRACE_SECONDS = Number(process.env.HOST_GRACE_SECONDS || 30)
const MAX_ROOM_MEMBERS = Number(process.env.MAX_ROOM_MEMBERS || 50)
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGINS || (IS_PRODUCTION ? '' : 'http://localhost:3000,http://localhost:8080'))
  .split(',').map((value) => value.trim().replace(/\/$/, '')).filter(Boolean)
const MEDIA_ALLOWED_HOSTS = (process.env.MEDIA_ALLOWED_HOSTS || '')
  .split(',').map((value) => value.trim().toLowerCase()).filter(Boolean)
const LIVEKIT_URL = process.env.LIVEKIT_URL || ''
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || ''
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || ''
const APP_BASE_URL = (process.env.APP_BASE_URL || CLIENT_ORIGINS[0] || 'http://localhost:3000').replace(/\/$/, '')
const MAIL_HOST = process.env.MAIL_HOST || 'smtp.gmail.com'
const MAIL_PORT = Number(process.env.MAIL_PORT || 587)
const MAIL_SECURE = String(process.env.MAIL_SECURE || 'false').toLowerCase() === 'true'
const MAIL_USERNAME = process.env.MAIL_USERNAME || ''
const MAIL_PASSWORD = process.env.MAIL_PASSWORD || ''
const MAIL_FROM = process.env.MAIL_FROM || MAIL_USERNAME
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'CineMind'
const mailConfigured = Boolean(MAIL_USERNAME && MAIL_PASSWORD && MAIL_FROM)
const mailTransporter = mailConfigured ? nodemailer.createTransport({ host: MAIL_HOST, port: MAIL_PORT, secure: MAIL_SECURE, auth: { user: MAIL_USERNAME, pass: MAIL_PASSWORD } }) : null
const voiceConfigured = Boolean(LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET)
const livekitRooms = voiceConfigured ? new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET) : null

if (!TOKEN_SECRET) throw new Error('WATCH_PARTY_TOKEN_SECRET is required in production')
if (IS_PRODUCTION && !REDIS_URL) throw new Error('REDIS_URL is required in production')
if (IS_PRODUCTION && CLIENT_ORIGINS.length === 0) throw new Error('CLIENT_ORIGINS is required in production')

let adminAuth = null
let adminDb = null
try {
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  const serviceAccount = rawServiceAccount ? JSON.parse(rawServiceAccount) : null
  const projectId = serviceAccount?.project_id || process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const databaseURL = process.env.FIREBASE_DATABASE_URL || process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
  if (serviceAccount || projectId) {
    const app = getApps()[0] || initializeApp({ ...(serviceAccount ? { credential: cert(serviceAccount) } : { projectId }), ...(databaseURL ? { databaseURL } : {}) })
    adminAuth = getAuth(app)
    if (databaseURL) adminDb = getDatabase(app)
  }
} catch (error) {
  console.error('Firebase Admin initialization failed:', error instanceof Error ? error.message : String(error))
}

const allowedReactions = new Set(['❤️', '😂', '🔥', '😮', '👏', '😢'])
const roomKey = (id) => `watch-party:room:${id}`
const publicRoomsKey = 'watch-party:rooms:public'
const allRoomsKey = 'watch-party:rooms:all'
const ownerRoomKey = (uid) => `watch-party:owner-room:${uid}`
const dedupeKey = (roomId, eventId) => `watch-party:dedupe:${roomId}:${eventId}`

const episodeSchema = z.object({
  id: z.string().trim().min(1).max(120), name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(120), serverName: z.string().trim().min(1).max(120),
  serverIndex: z.coerce.number().int().nonnegative(), episodeIndex: z.coerce.number().int().nonnegative(),
  linkM3u8: z.string().url().optional(), linkEmbed: z.string().url().optional(),
  capability: z.enum(['full', 'limited', 'unavailable']).optional()
}).refine((episode) => episode.linkM3u8 || episode.linkEmbed, 'Episode source is required')
const movieSchema = z.object({
  slug: z.string().trim().min(1).max(140), title: z.string().trim().min(1).max(180),
  originalTitle: z.string().trim().max(180).optional(), poster: z.string().url().optional(), episodes: z.array(episodeSchema).min(1).max(500)
}).refine((movie) => new Set(movie.episodes.map((episode) => episode.id)).size === movie.episodes.length, 'Episode IDs must be unique')
const createRoomSchema = z.object({
  roomName: z.string().trim().max(80).optional(), accessMode: z.enum(['public', 'link_only', 'password']).default('link_only'),
  password: z.string().min(6).max(64).optional(), movie: movieSchema, initialEpisodeId: z.string().optional(),
  playbackPolicy: z.object({ autoNext: z.boolean() }).optional(),
  replaceActiveRoom: z.boolean().optional().default(false), expectedActiveRoomId: z.string().max(12).optional()
}).refine((input) => input.accessMode !== 'password' || Boolean(input.password), { message: 'Password is required', path: ['password'] })
const joinRoomSchema = z.object({ displayName: z.string().trim().min(1).max(30), password: z.string().max(64).optional(), firebaseIdToken: z.string().min(1).max(5000), anonymous: z.boolean().optional().default(false) })
const playbackSchema = z.object({
  episodeId: z.string().min(1).max(120), currentTime: z.number().finite().nonnegative(), isPlaying: z.boolean(),
  action: z.enum(['play', 'pause', 'seek', 'heartbeat']), clientEventId: z.string().min(8).max(100)
})
const episodeChangeSchema = z.object({
  episodeId: z.string().min(1).max(120),
  reason: z.enum(['episode_list', 'previous', 'next', 'auto_next']).optional().default('episode_list'),
  shouldPlay: z.boolean().optional().default(false),
  clientEventId: z.string().min(8).max(100).optional()
})
const policySchema = z.object({ autoNext: z.boolean(), clientEventId: z.string().min(8).max(100) })
const emailLookupSchema = z.object({ email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()) })
const roomInviteSchema = z.object({ friendUid: z.string().trim().min(1).max(128) })
class MemoryStore {
  constructor() { this.rooms = new Map(); this.dedupe = new Map(); this.ownerRooms = new Map() }
  async ping() { return 'PONG' }
  async getRoom(id) { const room = this.rooms.get(id); return room ? structuredClone(room) : null }
  async setRoom(room) { this.rooms.set(room.id, structuredClone(room)); if (room.ownerUid && room.status !== 'closed') this.ownerRooms.set(room.ownerUid, room.id) }
  async deleteRoom(id) { const room = this.rooms.get(id); this.rooms.delete(id); if (room?.ownerUid && this.ownerRooms.get(room.ownerUid) === id) this.ownerRooms.delete(room.ownerUid) }
  async getActiveRoomByOwner(uid) { const id = this.ownerRooms.get(uid); return id ? this.getRoom(id) : null }
  async listRooms() { return [...this.rooms.values()].filter((room) => isPublicRoomDiscoverable(room) && room.expiresAt > Date.now()).map((room) => structuredClone(room)) }
  async listAllRooms() { return [...this.rooms.values()].map((room) => structuredClone(room)) }
  async dedupeEvent(roomId, eventId) { const key = `${roomId}:${eventId}`; if (this.dedupe.has(key)) return false; this.dedupe.set(key, Date.now()); return true }
  async allow(key, limit, windowMs) { return rateLimit(key, limit, windowMs) }
}

class RedisStore {
  constructor(client) { this.client = client }
  async ping() { return this.client.ping() }
  async getRoom(id) { const value = await this.client.get(roomKey(id)); return value ? JSON.parse(value) : null }
  async setRoom(room) {
    const ttl = Math.max(1, Math.ceil((room.expiresAt - Date.now()) / 1000) + 60)
    await this.client.set(roomKey(room.id), JSON.stringify(room), { EX: ttl })
    await this.client.zAdd(allRoomsKey, [{ score: room.createdAt, value: room.id }])
    if (room.ownerUid && room.status !== 'closed') await this.client.set(ownerRoomKey(room.ownerUid), room.id, { EX: ttl })
    if (isPublicRoomDiscoverable(room)) await this.client.zAdd(publicRoomsKey, [{ score: room.createdAt, value: room.id }])
    else await this.client.zRem(publicRoomsKey, room.id)
  }
  async deleteRoom(id) { const room = await this.getRoom(id); await Promise.all([this.client.del(roomKey(id)), this.client.zRem(publicRoomsKey, id), this.client.zRem(allRoomsKey, id), ...(room?.ownerUid ? [this.client.del(ownerRoomKey(room.ownerUid))] : [])]) }
  async getActiveRoomByOwner(uid) { const id = await this.client.get(ownerRoomKey(uid)); return id ? this.getRoom(id) : null }
  async listRooms() {
    const ids = await this.client.zRange(publicRoomsKey, 0, -1, { REV: true })
    const rooms = await Promise.all(ids.map((id) => this.getRoom(id)))
    const expired = ids.filter((_, index) => !rooms[index])
    if (expired.length) await this.client.zRem(publicRoomsKey, expired)
    const visible = rooms.filter((room) => room && isPublicRoomDiscoverable(room))
    const hidden = rooms.flatMap((room, index) => room && !isPublicRoomDiscoverable(room) ? [ids[index]] : [])
    if (hidden.length) await this.client.zRem(publicRoomsKey, hidden)
    return visible
  }
  async listAllRooms() {
    const ids = await this.client.zRange(allRoomsKey, 0, -1)
    const rooms = await Promise.all(ids.map((id) => this.getRoom(id)))
    const expired = ids.filter((_, index) => !rooms[index])
    if (expired.length) await this.client.zRem(allRoomsKey, expired)
    return rooms.filter(Boolean)
  }
  async dedupeEvent(roomId, eventId) { return Boolean(await this.client.set(dedupeKey(roomId, eventId), '1', { NX: true, EX: 60 })) }
  async allow(key, limit, windowMs) {
    const redisKey = `watch-party:rate:${key}:${Math.floor(Date.now() / windowMs)}`
    const count = await this.client.incr(redisKey)
    if (count === 1) await this.client.pExpire(redisKey, windowMs)
    return count <= limit
  }
}

let redisClient = null
let store = new MemoryStore()
if (REDIS_URL) {
  redisClient = createClient({ url: REDIS_URL })
  redisClient.on('error', (error) => log('redis_error', { error: error.message }))
  await redisClient.connect()
  store = new RedisStore(redisClient)
}

const log = (event, data = {}) => console.log(JSON.stringify({ timestamp: new Date().toISOString(), event, ...data }))
const deleteVoiceRoom = async (roomId, attempt = 1) => {
  if (!livekitRooms) return
  try { await livekitRooms.deleteRoom(roomId) }
  catch (error) {
    if (String(error?.code || '').toLowerCase() === 'not_found') return
    if (attempt < 3) return new Promise((resolve) => setTimeout(() => resolve(deleteVoiceRoom(roomId, attempt + 1)), 250 * 2 ** (attempt - 1)))
    log('voice_room_delete_failed', { roomId, attempts: attempt, error: error instanceof Error ? error.message : String(error) })
  }
}
const id = (prefix) => `${prefix}_${crypto.randomUUID().replaceAll('-', '')}`
const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character])
const roomCode = () => { const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from({ length: 6 }, () => chars[crypto.randomInt(chars.length)]).join('') }
const originAllowed = (origin) => isAllowedClientOrigin(origin, CLIENT_ORIGINS)
const corsOrigin = (origin, callback) => callback(null, originAllowed(origin))
const signToken = (room, member) => jwt.sign({ roomId: room.id, memberId: member.memberId, roleAtIssue: member.role, sessionId: id('session') }, TOKEN_SECRET, { expiresIn: Math.max(1, Math.floor((room.expiresAt - Date.now()) / 1000)) })
const verifyToken = (token) => jwt.verify(token, TOKEN_SECRET)
const createVoiceToken = async (room, member) => {
  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity: member.memberId, name: member.displayName, ttl: '10m' })
  token.addGrant(buildVoiceGrant(room.id))
  return token.toJwt()
}
const verifyFirebaseToken = async (token) => {
  if (!adminAuth) throw Object.assign(new Error('Firebase Admin is not configured'), { statusCode: 503, code: 'AUTH_NOT_CONFIGURED' })
  try { return await adminAuth.verifyIdToken(token) } catch { throw Object.assign(new Error('Bạn cần đăng nhập Google để tạo phòng.'), { statusCode: 401, code: 'AUTH_REQUIRED' }) }
}
const bearer = (req) => String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1]
const publicRoom = (room) => ({
  id: room.id, roomName: room.roomName, accessMode: room.accessMode, requiresPassword: room.accessMode === 'password', syncCapability: room.syncCapability,
  movie: { slug: room.movie.slug, title: room.movie.title, poster: room.movie.poster },
  episode: room.movie.episodes.find((episode) => episode.id === room.playback.episodeId),
  playback: { currentTime: room.playback.currentTime, isPlaying: room.playback.isPlaying },
  hostName: room.members[room.hostMemberId]?.displayName || 'Đang chờ host',
  userCount: Object.values(room.members).filter((member) => member.connected).length,
  createdAt: room.createdAt, expiresAt: room.expiresAt, status: room.status,
  deleteAt: room.lifecycle?.deleteAt || null,
  playbackPolicy: room.playbackPolicy || { autoNext: true }
})
const clientMember = (member) => {
  const copy = structuredClone(member)
  delete copy.uid; delete copy.socketIds
  return copy
}
const clientRoom = (room) => {
  const copy = structuredClone(room)
  copy.playbackPolicy ||= { autoNext: true }
  delete copy.passwordHash
  for (const member of Object.values(copy.members)) { delete member.uid; delete member.socketIds }
  return copy
}
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)) }
const readBody = async (req) => { const chunks = []; let size = 0; for await (const chunk of req) { size += chunk.length; if (size > 1_000_000) throw new Error('PAYLOAD_TOO_LARGE'); chunks.push(chunk) } return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') }
const mediaAllowed = (value) => isAllowedMediaUrl(value, MEDIA_ALLOWED_HOSTS)
const redirectStatuses = new Set([301, 302, 303, 307, 308])
async function fetchAllowedMedia(sourceUrl, options = {}, maxRedirects = 5) {
  let currentUrl = sourceUrl
  for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
    if (!mediaAllowed(currentUrl)) throw Object.assign(new Error('Nguồn media không được cho phép.'), { statusCode: 403, code: 'MEDIA_HOST_DENIED' })
    const response = await fetch(currentUrl, { ...options, redirect: 'manual' })
    if (!redirectStatuses.has(response.status)) return { response, finalUrl: currentUrl }
    const location = response.headers.get('location')
    if (!location) return { response, finalUrl: currentUrl }
    currentUrl = new URL(location, currentUrl).href
  }
  throw Object.assign(new Error('Nguồn media chuyển hướng quá nhiều lần.'), { statusCode: 502, code: 'TOO_MANY_REDIRECTS' })
}
async function probeHlsSource(sourceUrl, timeoutMs = 5000) {
  if (!sourceUrl || !mediaAllowed(sourceUrl)) return { hlsReachable: false, errorCode: 'MEDIA_HOST_DENIED' }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const { response, finalUrl } = await fetchAllowedMedia(sourceUrl, { method: 'GET', headers: { Range: 'bytes=0-1024' }, signal: controller.signal })
    const contentType = response.headers.get('content-type') || undefined
    const hlsReachable = response.ok && (contentType?.includes('mpegurl') || new URL(finalUrl).pathname.endsWith('.m3u8'))
    return { hlsReachable, contentType, errorCode: hlsReachable ? undefined : 'UPSTREAM_ERROR' }
  } catch (error) {
    return { hlsReachable: false, errorCode: error?.code || (error?.name === 'AbortError' ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_ERROR') }
  } finally {
    clearTimeout(timer)
  }
}
const proxyPath = (value) => `/api/media/proxy?url=${encodeURIComponent(value)}`
const rewriteHlsManifest = (manifest, sourceUrl) => manifest.split(/\r?\n/).map((line) => {
  if (!line) return line
  if (!line.startsWith('#')) return proxyPath(new URL(line, sourceUrl).href)
  return line.replace(/URI="([^"]+)"/g, (_match, uri) => `URI="${proxyPath(new URL(uri, sourceUrl).href)}"`)
}).join('\n')

const rateLimits = new Map()
function rateLimit(key, limit, windowMs) {
  const now = Date.now(); const values = (rateLimits.get(key) || []).filter((time) => now - time < windowMs)
  if (values.length >= limit) return false
  values.push(now); rateLimits.set(key, values); return true
}

async function closeRoom(roomId, reason = 'host_closed') {
  const room = await store.getRoom(roomId)
  if (!room) return false
  room.status = 'closing'
  if (adminDb) {
    try {
      const inviteSnapshot = await adminDb.ref('watchPartyInvites').orderByChild('roomId').equalTo(roomId).get()
      const inviteUpdates = {}
      inviteSnapshot.forEach((child) => { if (child.val()?.status === 'pending') { inviteUpdates[`${child.key}/status`] = reason === 'hard_expired' ? 'expired' : 'cancelled'; inviteUpdates[`${child.key}/updatedAt`] = Date.now() } })
      if (Object.keys(inviteUpdates).length) await adminDb.ref('watchPartyInvites').update(inviteUpdates)
    } catch (error) { log('invite_status_cleanup_failed', { roomId, error: error instanceof Error ? error.message : String(error) }) }
  }
  room.lifecycle = { ...(room.lifecycle || { hardExpiresAt: room.expiresAt }), closedAt: Date.now(), closeReason: reason }
  io.to(room.id).emit('room:closed', { code: reason.toUpperCase(), reason })
  await store.deleteRoom(room.id)
  io.in(room.id).disconnectSockets(true)
  await deleteVoiceRoom(room.id)
  clearTimeout(hostTimers.get(room.id)); hostTimers.delete(room.id)
  io.emit('room:list_changed')
  log('room_closed', { roomId: room.id, reason })
  return true
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const requestId = String(req.headers['rndr-id'] || req.headers['cf-ray'] || id('request'))
  const requestStartedAt = Date.now()
  if (url.pathname.startsWith('/api/') && url.pathname !== '/api/media/proxy') {
    res.once('finish', () => log('http_request', {
      requestId,
      method: req.method,
      path: url.pathname,
      status: res.statusCode,
      durationMs: Date.now() - requestStartedAt,
      origin: origin || undefined,
    }))
  }
  if (origin && originAllowed(origin)) res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.writeHead(204).end()
  const ip = req.socket.remoteAddress || 'unknown'
  try {
    if (url.pathname === '/health') return json(res, 200, { ok: true })
    if (url.pathname === '/ready') { await store.ping(); return json(res, 200, { ok: true, store: redisClient ? 'redis' : 'memory', voiceConfigured, mailConfigured, socialDatabaseConfigured: Boolean(adminDb) }) }
    if (req.method === 'GET' && url.pathname === '/api/media/proxy') {
      const sourceUrl = url.searchParams.get('url') || ''
      if (!mediaAllowed(sourceUrl)) return json(res, 403, { code: 'MEDIA_HOST_DENIED', error: 'Nguồn media không được cho phép.' })
      const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 20_000)
      try {
        const headers = {}; if (req.headers.range) headers.Range = req.headers.range
        const { response: upstream, finalUrl } = await fetchAllowedMedia(sourceUrl, { headers, signal: controller.signal })
        if (!upstream.ok) return json(res, upstream.status, { code: 'UPSTREAM_ERROR', error: `Nguồn media trả về ${upstream.status}.` })
        const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
        const isManifest = contentType.includes('mpegurl') || new URL(finalUrl).pathname.endsWith('.m3u8')
        res.statusCode = upstream.status
        res.setHeader('Content-Type', isManifest ? 'application/vnd.apple.mpegurl' : contentType)
        res.setHeader('Cache-Control', isManifest ? 'public, max-age=5' : 'public, max-age=3600')
        res.setHeader('Access-Control-Allow-Origin', origin && originAllowed(origin) ? origin : CLIENT_ORIGINS[0] || '*')
        const contentRange = upstream.headers.get('content-range'); if (contentRange) res.setHeader('Content-Range', contentRange)
        const acceptRanges = upstream.headers.get('accept-ranges'); if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges)
        if (isManifest) return res.end(rewriteHlsManifest(await upstream.text(), finalUrl))
        return res.end(Buffer.from(await upstream.arrayBuffer()))
      } finally { clearTimeout(timer) }
    }
    if (req.method === 'POST' && url.pathname === '/api/media/probe') {
      const input = z.object({ linkM3u8: z.string().url().optional(), linkEmbed: z.string().url().optional() }).parse(await readBody(req))
      const { hlsReachable, contentType, errorCode } = input.linkM3u8 ? await probeHlsSource(input.linkM3u8) : { hlsReachable: false, contentType: undefined, errorCode: undefined }
      const directAllowed = Boolean(input.linkM3u8 && mediaAllowed(input.linkM3u8))
      const fallbackAvailable = Boolean(input.linkEmbed)
      return json(res, 200, { hlsReachable, directAllowed, contentType, errorCode, fallbackAvailable, capability: directAllowed ? 'full' : fallbackAvailable ? 'limited' : 'unavailable' })
    }
    if (req.method === 'POST' && url.pathname === '/api/friends/lookup-email') {
      const authToken = bearer(req); if (!authToken) return json(res, 401, { code: 'AUTH_REQUIRED', error: 'Bạn cần đăng nhập để tìm bằng email.' })
      const actor = await verifyFirebaseToken(authToken)
      if (!adminDb) return json(res, 503, { code: 'SOCIAL_DATABASE_NOT_CONFIGURED', error: 'Dịch vụ tìm bạn chưa được cấu hình.' })
      if (!(await store.allow(`email-lookup:${actor.uid}`, 10, 60_000))) return json(res, 429, { code: 'RATE_LIMITED', error: 'Bạn tìm bằng email quá nhiều lần. Hãy thử lại sau một phút.' })
      const { email } = emailLookupSchema.parse(await readBody(req))
      try {
        const account = await adminAuth.getUserByEmail(email)
        const profileSnapshot = await adminDb.ref(`publicProfiles/${account.uid}`).get()
        if (!profileSnapshot.exists()) return json(res, 200, { found: false })
        const profile = profileSnapshot.val()
        return json(res, 200, { found: true, profile: { uid: profile.uid, username: profile.username, displayName: profile.displayName, avatar: profile.avatar || undefined, favoriteGenres: profile.favoriteGenres || [], createdAt: profile.createdAt, updatedAt: profile.updatedAt, isPublic: Boolean(profile.isPublic), showRecentMovies: Boolean(profile.showRecentMovies), showWatchlist: Boolean(profile.showWatchlist), showActivity: Boolean(profile.showActivity), allowWatchPartyInvites: profile.allowWatchPartyInvites !== false } })
      } catch (error) {
        if (String(error?.code || '').includes('user-not-found')) return json(res, 200, { found: false })
        throw error
      }
    }
    const inviteMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{6})\/invites$/i)
    if (req.method === 'POST' && inviteMatch) {
      const authToken = bearer(req); if (!authToken) return json(res, 401, { code: 'AUTH_REQUIRED', error: 'Bạn cần đăng nhập để mời bạn bè.' })
      const actor = await verifyFirebaseToken(authToken)
      if (!adminDb) return json(res, 503, { code: 'SOCIAL_DATABASE_NOT_CONFIGURED', error: 'Dịch vụ lời mời chưa được cấu hình.' })
      const roomId = inviteMatch[1].toUpperCase(); const room = await store.getRoom(roomId)
      if (!room) return json(res, 404, { code: 'ROOM_NOT_FOUND', error: 'Phòng không tồn tại hoặc đã hết hạn.' })
      const actorMember = findEligibleInvitingMember(room, actor.uid)
      if (!actorMember) return json(res, 403, { code: 'ROOM_MEMBER_REQUIRED', error: 'Bạn cần tham gia phòng bằng tài khoản để gửi lời mời.' })
      const { friendUid } = roomInviteSchema.parse(await readBody(req))
      if (friendUid === actor.uid) return json(res, 400, { code: 'INVALID_TARGET', error: 'Bạn không thể tự mời chính mình.' })
      if (!(await store.allow(`room-invite:${actor.uid}:${friendUid}:${roomId}`, 1, 60_000))) return json(res, 429, { code: 'DUPLICATE_INVITE', error: 'Bạn vừa mời người này. Hãy đợi một phút trước khi gửi lại.' })
      const [actorFriendship, targetFriendship, actorBlock, targetBlock, actorProfileSnapshot, targetProfileSnapshot, targetSettingsSnapshot] = await Promise.all([
        adminDb.ref(`friendships/${actor.uid}/${friendUid}`).get(), adminDb.ref(`friendships/${friendUid}/${actor.uid}`).get(), adminDb.ref(`blocks/${actor.uid}/${friendUid}`).get(), adminDb.ref(`blocks/${friendUid}/${actor.uid}`).get(), adminDb.ref(`publicProfiles/${actor.uid}`).get(), adminDb.ref(`publicProfiles/${friendUid}`).get(), adminDb.ref(`users/${friendUid}/settings`).get(),
      ])
      if (!actorFriendship.exists() || !targetFriendship.exists() || actorBlock.exists() || targetBlock.exists()) return json(res, 403, { code: 'FRIENDSHIP_REQUIRED', error: 'Bạn chỉ có thể mời bạn bè chưa chặn nhau.' })
      const actorProfile = actorProfileSnapshot.val() || {}; const targetProfile = targetProfileSnapshot.val() || {}; const targetSettings = targetSettingsSnapshot.val() || {}
      if (targetProfile.allowWatchPartyInvites === false) return json(res, 403, { code: 'INVITES_DISABLED', error: 'Người bạn này đang tắt lời mời xem chung.' })
      const now = Date.now(); const inviteId = id('invite'); const notificationId = id('notification')
      const movieTitle = room.movie.title
      const updates = {
        [`watchPartyInvites/${inviteId}`]: { id: inviteId, roomId, inviterUid: actor.uid, recipientUid: friendUid, movieSlug: room.movie.slug, movieTitle, status: 'pending', createdAt: now, expiresAt: room.expiresAt },
        [`notifications/${friendUid}/${notificationId}`]: { id: notificationId, type: 'watch_party_invite', actorUid: actor.uid, actorName: actorProfile.displayName || actorMember.displayName, actorUsername: actorProfile.username || '', actorAvatar: actorProfile.avatar || null, roomId, movieSlug: room.movie.slug, read: false, createdAt: now },
      }
      await adminDb.ref().update(updates)
      let emailStatus = 'skipped'
      if (mailTransporter && targetSettings.emailNotifications !== false) {
        try {
          const targetAccount = await adminAuth.getUser(friendUid)
          if (targetAccount.email && targetAccount.emailVerified) {
            const joinUrl = `${APP_BASE_URL}/watch-party/${roomId}`; const safeActor = escapeHtml(actorProfile.displayName || actorMember.displayName); const safeMovie = escapeHtml(movieTitle)
            await mailTransporter.sendMail({ from: `"${MAIL_FROM_NAME}" <${MAIL_FROM}>`, to: targetAccount.email, subject: `${actorProfile.displayName || actorMember.displayName} mời bạn xem ${movieTitle}`, text: `${actorProfile.displayName || actorMember.displayName} mời bạn xem ${movieTitle} trên CineMind. Mã phòng: ${roomId}. Tham gia: ${joinUrl}`, html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111827"><h2>${safeActor} mời bạn xem chung</h2><p>Hai bạn có một buổi xem <strong>${safeMovie}</strong> đang chờ trên CineMind.</p><p>Mã phòng: <strong>${roomId}</strong></p><p><a href="${joinUrl}" style="display:inline-block;padding:12px 18px;background:#7c3aed;color:white;text-decoration:none;border-radius:10px">Tham gia xem chung</a></p><p style="color:#6b7280;font-size:13px">Phòng hết hạn lúc ${new Date(room.expiresAt).toISOString()}.</p></div>` })
            emailStatus = 'sent'
          }
        } catch (error) { emailStatus = 'failed'; log('invite_email_failed', { roomId, inviteId, recipientUid: friendUid, error: error instanceof Error ? error.message : String(error) }) }
      }
      return json(res, 200, { inviteId, inAppStatus: 'sent', emailStatus })
    }
    const voiceTokenMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{6})\/voice-token$/i)
    if (req.method === 'POST' && voiceTokenMatch) {
      if (!voiceConfigured) return json(res, 503, { code: 'VOICE_NOT_CONFIGURED', error: 'Dịch vụ voice chưa được cấu hình.' })
      const roomToken = bearer(req)
      if (!roomToken) return json(res, 401, { code: 'UNAUTHORIZED', error: 'Thiếu token phòng.' })
      let claims
      try { claims = verifyToken(roomToken) } catch { return json(res, 401, { code: 'UNAUTHORIZED', error: 'Token phòng không hợp lệ hoặc đã hết hạn.' }) }
      const roomId = voiceTokenMatch[1].toUpperCase()
      if (claims.roomId !== roomId) return json(res, 403, { code: 'ROOM_MISMATCH', error: 'Token không thuộc phòng này.' })
      const room = await store.getRoom(roomId); const member = room?.members?.[claims.memberId]
      if (!room || !member) return json(res, 404, { code: 'ROOM_NOT_FOUND', error: 'Phòng hoặc thành viên không còn tồn tại.' })
      if (!room.voiceEnabled) return json(res, 403, { code: 'VOICE_DISABLED', error: 'Host chưa bật voice cho phòng.' })
      if (!(await store.allow(`voice-token:${member.memberId}`, 10, 60_000))) return json(res, 429, { code: 'RATE_LIMITED', error: 'Bạn yêu cầu kết nối voice quá nhanh.' })
      try {
        const participantToken = await createVoiceToken(room, member)
        return json(res, 200, { serverUrl: LIVEKIT_URL, participantToken })
      } catch (error) {
        log('voice_token_error', { roomId, memberId: member.memberId, error: error instanceof Error ? error.message : String(error) })
        return json(res, 502, { code: 'VOICE_TOKEN_FAILED', error: 'Không thể tạo quyền truy cập LiveKit.' })
      }
    }
    if (req.method === 'GET' && url.pathname === '/api/users/me/active-room') {
      const authToken = bearer(req); if (!authToken) return json(res, 401, { code: 'AUTH_REQUIRED', error: 'Bạn cần đăng nhập.' })
      const owner = await verifyFirebaseToken(authToken); const activeRoom = await store.getActiveRoomByOwner(owner.uid)
      return json(res, 200, { room: activeRoom ? publicRoom(activeRoom) : null })
    }
    const closeMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{6})$/i)
    if (req.method === 'DELETE' && closeMatch) {
      const authToken = bearer(req); if (!authToken) return json(res, 401, { code: 'AUTH_REQUIRED', error: 'Bạn cần đăng nhập.' })
      const owner = await verifyFirebaseToken(authToken); const room = await store.getRoom(closeMatch[1].toUpperCase())
      if (!room) return json(res, 404, { code: 'ROOM_NOT_FOUND', error: 'Phòng không còn tồn tại.' })
      if (room.ownerUid !== owner.uid) return json(res, 403, { code: 'NOT_OWNER', error: 'Chỉ chủ phòng mới có thể kết thúc phòng.' })
      await closeRoom(room.id, 'host_closed'); return json(res, 200, { ok: true })
    }
    if (req.method === 'POST' && url.pathname === '/api/rooms') {
      const authToken = bearer(req)
      if (!authToken) return json(res, 401, { code: 'AUTH_REQUIRED', error: 'Bạn cần đăng nhập Google để tạo phòng.' })
      const owner = await verifyFirebaseToken(authToken)
      if (!(await store.allow(`create:${ip}`, 5, 600_000))) return json(res, 429, { code: 'RATE_LIMITED', error: 'Bạn đã tạo quá nhiều phòng.' })
      const input = createRoomSchema.parse(await readBody(req))
      const previousRoom = await store.getActiveRoomByOwner(owner.uid)
      if (previousRoom) {
        const replacementConfirmed = input.replaceActiveRoom && input.expectedActiveRoomId?.toUpperCase() === previousRoom.id
        if (!replacementConfirmed) return json(res, 409, { code: 'ACTIVE_ROOM_EXISTS', error: 'Bạn đang có một phòng hoạt động.', activeRoom: publicRoom(previousRoom) })
        await closeRoom(previousRoom.id, 'replaced')
      }
      let code = roomCode(); while (await store.getRoom(code)) code = roomCode()
      const now = Date.now(); const memberId = id('member'); const initial = input.movie.episodes.find((episode) => episode.id === input.initialEpisodeId) || input.movie.episodes.find((episode) => episode.linkM3u8)
      if (!initial?.linkM3u8) return json(res, 400, { code: 'HLS_REQUIRED', error: 'Xem chung cần ít nhất một nguồn HLS để đồng bộ chính xác.' })
      const deniedEpisode = findDeniedMediaEpisode(input.movie.episodes, MEDIA_ALLOWED_HOSTS)
      if (deniedEpisode) return json(res, 400, { code: 'MEDIA_HOST_DENIED', error: 'Host HLS chưa được máy chủ cho phép.' })
      const displayName = String(owner.name || owner.email?.split('@')[0] || 'Host').trim().slice(0, 30)
      const member = { memberId, displayName, role: 'host', uid: owner.uid, avatar: owner.picture, isAnonymous: false, joinedAt: now, lastSeenAt: now, connected: false, socketIds: [] }
      const room = { id: code, roomName: input.roomName || input.movie.title, accessMode: input.accessMode, passwordHash: input.accessMode === 'password' ? await hashRoomPassword(input.password) : undefined, syncCapability: sourceCapability(initial) === 'full' ? 'full' : 'limited', ownerUid: owner.uid, ownerDisplayName: displayName, ownerAvatar: owner.picture, movie: { ...input.movie, episodes: input.movie.episodes.map((episode) => ({ ...episode, capability: sourceCapability(episode) })) },
        playback: { episodeId: initial.id, currentTime: 0, isPlaying: false, revision: 0, serverUpdatedAt: now, updatedBy: memberId, action: 'pause' },
        members: { [memberId]: member }, messages: [], hostMemberId: memberId, controlMode: 'host_only', voiceEnabled: false,
        playbackPolicy: input.playbackPolicy || { autoNext: true }, createdAt: now, expiresAt: now + ROOM_TTL_SECONDS * 1000, status: 'empty_grace', emptySince: now,
        lifecycle: { emptySince: now, deleteAt: now + EMPTY_ROOM_TTL_SECONDS * 1000, hardExpiresAt: now + ROOM_TTL_SECONDS * 1000 } }
      await store.setRoom(room); log('room_created', { roomId: room.id, accessMode: room.accessMode, ownerUid: owner.uid })
      return json(res, 201, { roomId: room.id, roomToken: signToken(room, member), member, room: publicRoom(room), expiresAt: room.expiresAt })
    }
    const joinMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{6})\/join$/i)
    if (req.method === 'POST' && joinMatch) {
      const roomId = joinMatch[1].toUpperCase(); if (!(await store.allow(`join:${ip}:${roomId}`, 20, 60_000))) return json(res, 429, { code: 'RATE_LIMITED', error: 'Bạn thao tác quá nhanh.' })
      const input = joinRoomSchema.parse(await readBody(req)); const room = await store.getRoom(roomId)
      if (room?.accessMode === 'password' && !(await store.allow(`password:${ip}:${roomId}`, 5, 60_000))) return json(res, 429, { code: 'PASSWORD_RATE_LIMITED', error: 'Bạn nhập sai quá nhiều lần. Hãy thử lại sau một phút.' })
      if (room?.accessMode === 'password' && !(await verifyRoomPassword(input.password || '', room.passwordHash))) return json(res, 403, { code: 'WRONG_PASSWORD', error: 'Mật khẩu phòng không đúng.' })
      if (!room) return json(res, 404, { code: 'ROOM_NOT_FOUND', error: 'Phòng không tồn tại hoặc đã hết hạn.' })
      if (Object.keys(room.members).length >= MAX_ROOM_MEMBERS) return json(res, 409, { code: 'ROOM_FULL', error: 'Phòng đã đủ người.' })
      const account = await verifyFirebaseToken(input.firebaseIdToken)
      const now = Date.now(); const member = { memberId: id('member'), displayName: input.displayName, role: 'viewer', uid: account?.uid, avatar: input.anonymous ? undefined : account?.picture, isAnonymous: input.anonymous, joinedAt: now, lastSeenAt: now, connected: false, socketIds: [] }
      room.members[member.memberId] = member; await store.setRoom(room)
      if (adminDb) {
        try {
          const inviteSnapshot = await adminDb.ref('watchPartyInvites').orderByChild('recipientUid').equalTo(account.uid).get()
          const inviteUpdates = {}
          inviteSnapshot.forEach((child) => { const invite = child.val(); if (invite?.roomId === roomId && invite?.status === 'pending') { inviteUpdates[`${child.key}/status`] = 'accepted'; inviteUpdates[`${child.key}/acceptedAt`] = now; inviteUpdates[`${child.key}/updatedAt`] = now } })
          if (Object.keys(inviteUpdates).length) await adminDb.ref('watchPartyInvites').update(inviteUpdates)
        } catch (error) { log('invite_accept_update_failed', { roomId, recipientUid: account.uid, error: error instanceof Error ? error.message : String(error) }) }
      }
      return json(res, 201, { roomToken: signToken(room, member), member, room: publicRoom(room), expiresAt: room.expiresAt })
    }
    const reclaimMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{6})\/reclaim-host$/i)
    if (req.method === 'POST' && reclaimMatch) {
      const authToken = bearer(req); if (!authToken) return json(res, 401, { code: 'AUTH_REQUIRED', error: 'Bạn cần đăng nhập lại.' })
      const owner = await verifyFirebaseToken(authToken); const room = await store.getRoom(reclaimMatch[1].toUpperCase())
      if (!room) return json(res, 404, { code: 'ROOM_NOT_FOUND', error: 'Phòng không tồn tại hoặc đã hết hạn.' })
      if (room.ownerUid !== owner.uid) return json(res, 403, { code: 'NOT_OWNER', error: 'Tài khoản này không phải chủ phòng.' })
      const member = Object.values(room.members).find((item) => item.uid === owner.uid)
      if (!member) return json(res, 409, { code: 'OWNER_NOT_JOINED', error: 'Hãy tham gia phòng trước khi lấy lại quyền host.' })
      const currentHost = room.members[room.hostMemberId]
      if (currentHost) currentHost.role = 'viewer'
      member.role = 'host'; room.hostMemberId = member.memberId; room.status = 'active'; room.playback.revision += 1
      await store.setRoom(room); io.to(room.id).emit('host:changed', { hostMemberId: member.memberId, room: clientRoom(room) })
      return json(res, 200, { ok: true, roomToken: signToken(room, member) })
    }
    const previewMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{6})\/preview$/i)
    if (req.method === 'GET' && previewMatch) { const room = await store.getRoom(previewMatch[1].toUpperCase()); return room ? json(res, 200, publicRoom(room)) : json(res, 404, { code: 'ROOM_NOT_FOUND', error: 'Phòng không tồn tại hoặc đã hết hạn.' }) }
    if (req.method === 'GET' && url.pathname === '/api/rooms') {
      const search = (url.searchParams.get('search') || '').toLowerCase(); const limit = Math.min(24, Math.max(1, Number(url.searchParams.get('limit') || 12)))
      let rooms = (await store.listRooms()).filter((room) => !search || room.roomName.toLowerCase().includes(search) || room.movie.title.toLowerCase().includes(search))
      rooms.sort((a, b) => publicRoom(b).userCount - publicRoom(a).userCount || b.createdAt - a.createdAt)
      return json(res, 200, { rooms: rooms.slice(0, limit).map(publicRoom), nextCursor: null })
    }
    return json(res, 404, { code: 'NOT_FOUND', error: 'Không tìm thấy tài nguyên.' })
  } catch (error) {
    const validation = error instanceof z.ZodError
    log('http_error', { path: url.pathname, error: validation ? 'VALIDATION_ERROR' : error.message })
    const status = validation ? 400 : error.statusCode || (error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 500)
    return json(res, status, { code: validation ? 'VALIDATION_ERROR' : error.code || 'INTERNAL_ERROR', error: validation ? 'Dữ liệu không hợp lệ.' : error.statusCode ? error.message : 'Máy chủ gặp sự cố.' })
  }
})

const io = new Server(server, {
  cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
  allowRequest: (request, callback) => callback(null, originAllowed(request.headers.origin)),
  transports: ['websocket', 'polling'],
})
if (redisClient) { const sub = redisClient.duplicate(); await sub.connect(); io.adapter(createAdapter(redisClient, sub)) }

io.use(async (socket, next) => {
  try {
    const claims = verifyToken(socket.handshake.auth?.roomToken || '')
    const room = await store.getRoom(claims.roomId); const member = room?.members?.[claims.memberId]
    if (!room || !member) return next(new Error('UNAUTHORIZED'))
    socket.data.identity = { roomId: room.id, memberId: member.memberId }; next()
  } catch { next(new Error('UNAUTHORIZED')) }
})

const hostTimers = new Map()
async function saveAndBroadcast(room, event = 'room:snapshot') { await store.setRoom(room); io.to(room.id).emit(event, clientRoom(room)); io.emit('room:list_changed') }
async function transferHost(roomId) {
  const room = await store.getRoom(roomId); if (!room || !['host_reconnecting', 'empty_grace'].includes(room.status)) return
  const successor = chooseHostSuccessor(room.members, room.hostMemberId)
  if (!successor) {
    const previous = clearRoomHost(room)
    clearTimeout(hostTimers.get(roomId)); hostTimers.delete(roomId)
    await store.setRoom(room)
    io.to(room.id).emit('host:changed', { previousHostMemberId: previous, hostMemberId: '', room: clientRoom(room) })
    log('room_became_hostless', { roomId })
    return
  }
  const previous = clearRoomHost(room); successor.role = 'host'; room.hostMemberId = successor.memberId; room.status = 'active'; room.hostReconnectDeadline = null; room.playback.revision += 1
  clearTimeout(hostTimers.get(roomId)); hostTimers.delete(roomId)
  await store.setRoom(room); io.to(room.id).emit('host:changed', { previousHostMemberId: previous, hostMemberId: room.hostMemberId, room: clientRoom(room) }); log('host_transferred', { roomId, hostMemberId: room.hostMemberId })
}

io.on('connection', async (socket) => {
  const { roomId, memberId } = socket.data.identity; let room = await store.getRoom(roomId); if (!room) return socket.disconnect(true)
  const wasEmptyRoom = room.status === 'empty_grace' || connectedMemberCount(room) === 0
  const member = room.members[memberId]; member.connected = true; member.lastSeenAt = Date.now(); member.socketIds = [...new Set([...member.socketIds, socket.id])]; markRoomOccupied(room)
  const currentHost = room.members[room.hostMemberId]
  const claimedHost = (!room.hostMemberId || (wasEmptyRoom && !currentHost?.connected)) && claimVacantHost(room, memberId)
  if (claimedHost) { clearTimeout(hostTimers.get(roomId)); hostTimers.delete(roomId) }
  if (memberId === room.hostMemberId && room.status === 'host_reconnecting') { room.status = 'active'; room.hostReconnectDeadline = null; clearTimeout(hostTimers.get(roomId)); hostTimers.delete(roomId); log('host_resumed', { roomId }) }
  socket.join(roomId); socket.join(`${roomId}:${memberId}`); await store.setRoom(room); socket.emit('room:snapshot', clientRoom(room)); socket.to(roomId).emit('room:member_joined', clientMember(member)); io.emit('room:list_changed')
  if (claimedHost) { io.to(roomId).emit('host:changed', { previousHostMemberId: '', hostMemberId: memberId, room: clientRoom(room) }); log('host_claimed', { roomId, hostMemberId: memberId }) }

  socket.on('room:resume', async (ack) => { const fresh = await store.getRoom(roomId); ack?.({ ok: Boolean(fresh), room: fresh ? clientRoom(fresh) : null }); if (fresh) socket.emit('room:snapshot', clientRoom(fresh)) })
  socket.on('sync:request', async (payload, ack) => { const fresh = await store.getRoom(roomId); const response = { serverTime: Date.now(), clientSentAt: payload?.clientSentAt, playback: fresh?.playback }; ack?.(response); socket.emit('sync:pong', response) })
  socket.on('heartbeat:user', async () => { const fresh = await store.getRoom(roomId); if (fresh?.members[memberId]) { fresh.members[memberId].lastSeenAt = Date.now(); fresh.members[memberId].connected = true; await store.setRoom(fresh) } })
  socket.on('playback:update', async (payload, ack) => {
    const parsed = playbackSchema.safeParse(payload); const fresh = await store.getRoom(roomId)
    if (!parsed.success) return ack?.({ ok: false, code: 'VALIDATION_ERROR' })
    if (!fresh || fresh.hostMemberId !== memberId || fresh.status !== 'active') { log('playback_rejected', { roomId, memberId }); return ack?.({ ok: false, code: 'HOST_ONLY' }) }
    if (!(await store.allow(`playback:${memberId}`, 10, 1000))) return ack?.({ ok: false, code: 'RATE_LIMITED' })
    if (!(await store.dedupeEvent(roomId, parsed.data.clientEventId))) return ack?.({ ok: true, duplicate: true, revision: fresh.playback.revision })
    if (!fresh.movie.episodes.some((episode) => episode.id === parsed.data.episodeId)) return ack?.({ ok: false, code: 'EPISODE_NOT_FOUND' })
    fresh.playback = { ...parsed.data, revision: fresh.playback.revision + 1, serverUpdatedAt: Date.now(), updatedBy: memberId }; delete fresh.playback.clientEventId
    await store.setRoom(fresh); io.to(roomId).emit('playback:sync', fresh.playback); ack?.({ ok: true, revision: fresh.playback.revision, serverUpdatedAt: fresh.playback.serverUpdatedAt })
  })
  socket.on('episode:change', async (payload, ack) => {
    const parsed = episodeChangeSchema.safeParse(payload); const fresh = await store.getRoom(roomId)
    if (!parsed.success) return ack?.({ ok: false, code: 'VALIDATION_ERROR' })
    if (!fresh || fresh.hostMemberId !== memberId || fresh.status !== 'active') return ack?.({ ok: false, code: 'HOST_ONLY' })
    if (!(await store.allow(`episode:${memberId}`, 5, 2000))) return ack?.({ ok: false, code: 'RATE_LIMITED' })
    if (parsed.data.clientEventId && !(await store.dedupeEvent(roomId, parsed.data.clientEventId))) return ack?.({ ok: true, duplicate: true, revision: fresh.playback.revision })
    const episode = fresh.movie.episodes.find((item) => item.id === parsed.data.episodeId); if (!episode) return ack?.({ ok: false, code: 'EPISODE_NOT_FOUND' })
    if (!episode.linkM3u8) return ack?.({ ok: false, code: 'HLS_REQUIRED' })
    fresh.syncCapability = 'full'; fresh.playbackPolicy ||= { autoNext: true }
    fresh.playback = { episodeId: episode.id, currentTime: 0, isPlaying: parsed.data.shouldPlay, revision: fresh.playback.revision + 1, serverUpdatedAt: Date.now(), updatedBy: memberId, action: 'episode_change' }
    await store.setRoom(fresh); io.to(roomId).emit('episode:sync', { room: clientRoom(fresh), playback: fresh.playback }); ack?.({ ok: true, revision: fresh.playback.revision })
    log('episode_changed', { roomId, memberId, episodeId: episode.id, reason: parsed.data.reason, shouldPlay: parsed.data.shouldPlay })
  })
  socket.on('room:policy_update', async (payload, ack) => {
    const parsed = policySchema.safeParse(payload); const fresh = await store.getRoom(roomId)
    if (!parsed.success) return ack?.({ ok: false, code: 'VALIDATION_ERROR' })
    if (!fresh || fresh.hostMemberId !== memberId || fresh.status !== 'active') return ack?.({ ok: false, code: 'HOST_ONLY' })
    if (!(await store.dedupeEvent(roomId, parsed.data.clientEventId))) return ack?.({ ok: true, duplicate: true })
    fresh.playbackPolicy = { autoNext: parsed.data.autoNext }
    await store.setRoom(fresh)
    io.to(roomId).emit('room:policy_changed', { playbackPolicy: fresh.playbackPolicy })
    ack?.({ ok: true })
  })
  socket.on('chat:send', async (payload, ack) => {
    const fresh = await store.getRoom(roomId); const sender = fresh?.members[memberId]; const text = String(payload?.text || '').trim().replace(/\s+/g, ' ').slice(0, 200)
    if (!fresh || !sender || !text) return ack?.({ ok: false, code: 'VALIDATION_ERROR' })
    if (!(await store.allow(`chat:${memberId}`, 5, 10_000))) return ack?.({ ok: false, code: 'RATE_LIMITED' })
    const message = { id: id('message'), type: 'user', memberId, displayName: sender.displayName, text, timestamp: Date.now(), videoTime: fresh.playback.currentTime }
    fresh.messages = [...fresh.messages.slice(-99), message]; await store.setRoom(fresh); io.to(roomId).emit('chat:new', message); ack?.({ ok: true })
  })
  socket.on('reaction:send', async (payload, ack) => {
    const fresh = await store.getRoom(roomId); const sender = fresh?.members[memberId]; const emoji = String(payload?.emoji || '')
    if (!fresh || !sender || !allowedReactions.has(emoji)) return ack?.({ ok: false, code: 'VALIDATION_ERROR' })
    if (!(await store.allow(`reaction:${memberId}`, 5, 5000))) return ack?.({ ok: false, code: 'RATE_LIMITED' })
    io.to(roomId).emit('reaction:new', { id: id('reaction'), memberId, displayName: sender.displayName, emoji, timestamp: Date.now() }); ack?.({ ok: true })
  })
  socket.on('voice:permission', async (payload, ack) => {
    const fresh = await store.getRoom(roomId)
    if (!fresh || fresh.hostMemberId !== memberId) return ack?.({ ok: false, code: 'HOST_ONLY' })
    const enabled = Boolean(payload?.enabled)
    if (enabled && !voiceConfigured) return ack?.({ ok: false, code: 'VOICE_NOT_CONFIGURED' })
    applyVoicePermission(fresh, enabled)
    await store.setRoom(fresh)
    io.to(roomId).emit('voice:permission_changed', { enabled })
    if (!enabled) void deleteVoiceRoom(roomId)
    ack?.({ ok: true })
  })
  socket.on('room:close', async (ack) => {
    const fresh = await store.getRoom(roomId)
    if (!fresh || (fresh.hostMemberId !== memberId && fresh.ownerUid !== fresh.members[memberId]?.uid)) return ack?.({ ok: false, code: 'HOST_ONLY' })
    ack?.({ ok: true })
    setTimeout(() => { void closeRoom(roomId, 'host_closed') }, 0)
  })

  const disconnectMember = async () => {
    const fresh = await store.getRoom(roomId); if (!fresh?.members[memberId]) return
    const current = fresh.members[memberId]; current.socketIds = current.socketIds.filter((socketId) => socketId !== socket.id); current.connected = current.socketIds.length > 0; current.lastSeenAt = Date.now()
    if (!current.connected) socket.to(roomId).emit('room:member_left', { memberId })
    if (memberId === fresh.hostMemberId && !current.connected) {
      fresh.status = 'host_reconnecting'; fresh.hostReconnectDeadline = Date.now() + HOST_GRACE_SECONDS * 1000; io.to(roomId).emit('host:reconnecting', { graceSeconds: HOST_GRACE_SECONDS }); clearTimeout(hostTimers.get(roomId)); hostTimers.set(roomId, setTimeout(() => transferHost(roomId), HOST_GRACE_SECONDS * 1000))
    }
    if (!Object.values(fresh.members).some((item) => item.connected)) {
      markRoomEmpty(fresh, Date.now(), EMPTY_ROOM_TTL_SECONDS * 1000)
    }
    await store.setRoom(fresh); io.emit('room:list_changed')
  }
  socket.on('room:leave', async (ack) => { await disconnectMember(); await transferHost(roomId); ack?.({ ok: true }); setTimeout(() => socket.disconnect(true), 0) })
  socket.on('disconnect', disconnectMember)
})

setInterval(async () => {
  try {
    for (const room of await store.listAllRooms()) {
      if (room.status === 'host_reconnecting' && room.hostReconnectDeadline && room.hostReconnectDeadline <= Date.now()) await transferHost(room.id)
      if (room.lifecycle?.hardExpiresAt && room.lifecycle.hardExpiresAt - Date.now() <= 600_000 && !room.lifecycle.expiryWarningSentAt) { room.lifecycle.expiryWarningSentAt = Date.now(); await store.setRoom(room); io.to(room.id).emit('room:expiry_warning', { expiresAt: room.lifecycle.hardExpiresAt }) }
      if (room.lifecycle?.hardExpiresAt && room.lifecycle.hardExpiresAt <= Date.now()) { await closeRoom(room.id, 'hard_expired'); continue }
      if (shouldCloseEmptyRoom(room, Date.now()) || (room.emptySince && Date.now() - room.emptySince > EMPTY_ROOM_TTL_SECONDS * 1000)) await closeRoom(room.id, 'empty_timeout')
    }
  } catch (error) {
    log('room_cleanup_error', { error: error instanceof Error ? error.message : String(error) })
  }
}, 30_000).unref()

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Watch Party port ${PORT} is already in use. Stop the previous dev process before running npm run dev again.`)
    process.exitCode = 1
    return
  }
  log('server_error', { error: error.message })
})
server.listen(PORT, () => log('server_started', { port: PORT, store: redisClient ? 'redis' : 'memory' }))
