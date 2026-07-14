import http from 'node:http'
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { createClient } from 'redis'
import { createAdapter } from '@socket.io/redis-adapter'
import { Server } from 'socket.io'
import { z } from 'zod'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk'
import { applyVoicePermission, buildVoiceGrant, chooseHostSuccessor, hashRoomPassword, isAllowedClientOrigin, isAllowedMediaUrl, sourceCapability, verifyRoomPassword } from './watch-party-core.js'
import dotenv from 'dotenv'

if (process.env.NODE_ENV !== 'production') dotenv.config({ path: new URL('../.env', import.meta.url) })

const PORT = Number(process.env.PORT || 4001)
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const REDIS_URL = process.env.REDIS_URL || ''
const TOKEN_SECRET = process.env.WATCH_PARTY_TOKEN_SECRET || (IS_PRODUCTION ? '' : 'dev-only-change-me')
const ROOM_TTL_SECONDS = Number(process.env.ROOM_TTL_SECONDS || 14400)
const EMPTY_ROOM_TTL_SECONDS = Number(process.env.EMPTY_ROOM_TTL_SECONDS || 300)
const HOST_GRACE_SECONDS = Number(process.env.HOST_GRACE_SECONDS || 15)
const MAX_ROOM_MEMBERS = Number(process.env.MAX_ROOM_MEMBERS || 50)
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGINS || (IS_PRODUCTION ? '' : 'http://localhost:3000,http://localhost:8080'))
  .split(',').map((value) => value.trim().replace(/\/$/, '')).filter(Boolean)
const MEDIA_ALLOWED_HOSTS = (process.env.MEDIA_ALLOWED_HOSTS || '')
  .split(',').map((value) => value.trim().toLowerCase()).filter(Boolean)
const LIVEKIT_URL = process.env.LIVEKIT_URL || ''
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || ''
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || ''
const voiceConfigured = Boolean(LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET)
const livekitRooms = voiceConfigured ? new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET) : null

if (!TOKEN_SECRET) throw new Error('WATCH_PARTY_TOKEN_SECRET is required in production')
if (IS_PRODUCTION && !REDIS_URL) throw new Error('REDIS_URL is required in production')
if (IS_PRODUCTION && CLIENT_ORIGINS.length === 0) throw new Error('CLIENT_ORIGINS is required in production')

let adminAuth = null
try {
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  const serviceAccount = rawServiceAccount ? JSON.parse(rawServiceAccount) : null
  const projectId = serviceAccount?.project_id || process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  if (serviceAccount || projectId) {
    const app = getApps()[0] || initializeApp(serviceAccount ? { credential: cert(serviceAccount) } : { projectId })
    adminAuth = getAuth(app)
  }
} catch (error) {
  console.error('Firebase Admin initialization failed:', error instanceof Error ? error.message : String(error))
}

const allowedReactions = new Set(['❤️', '😂', '🔥', '😮', '👏', '😢'])
const roomKey = (id) => `watch-party:room:${id}`
const publicRoomsKey = 'watch-party:rooms:public'
const allRoomsKey = 'watch-party:rooms:all'
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
  password: z.string().min(6).max(64).optional(), movie: movieSchema, initialEpisodeId: z.string().optional()
}).refine((input) => input.accessMode !== 'password' || Boolean(input.password), { message: 'Password is required', path: ['password'] })
const joinRoomSchema = z.object({ displayName: z.string().trim().min(1).max(30), password: z.string().max(64).optional(), firebaseIdToken: z.string().min(1).max(5000), anonymous: z.boolean().optional().default(false) })
const playbackSchema = z.object({
  episodeId: z.string().min(1).max(120), currentTime: z.number().finite().nonnegative(), isPlaying: z.boolean(),
  action: z.enum(['play', 'pause', 'seek', 'heartbeat']), clientEventId: z.string().min(8).max(100)
})
class MemoryStore {
  constructor() { this.rooms = new Map(); this.dedupe = new Map() }
  async ping() { return 'PONG' }
  async getRoom(id) { const room = this.rooms.get(id); if (!room) return null; if (room.expiresAt <= Date.now()) { this.rooms.delete(id); return null } return structuredClone(room) }
  async setRoom(room) { this.rooms.set(room.id, structuredClone(room)) }
  async deleteRoom(id) { this.rooms.delete(id) }
  async listRooms() { return [...this.rooms.values()].filter((room) => room.accessMode === 'public' && room.status !== 'closed' && room.expiresAt > Date.now()).map((room) => structuredClone(room)) }
  async listAllRooms() { return [...this.rooms.values()].filter((room) => room.expiresAt > Date.now()).map((room) => structuredClone(room)) }
  async dedupeEvent(roomId, eventId) { const key = `${roomId}:${eventId}`; if (this.dedupe.has(key)) return false; this.dedupe.set(key, Date.now()); return true }
  async allow(key, limit, windowMs) { return rateLimit(key, limit, windowMs) }
}

class RedisStore {
  constructor(client) { this.client = client }
  async ping() { return this.client.ping() }
  async getRoom(id) { const value = await this.client.get(roomKey(id)); return value ? JSON.parse(value) : null }
  async setRoom(room) {
    const ttl = Math.max(1, Math.ceil((room.expiresAt - Date.now()) / 1000))
    await this.client.set(roomKey(room.id), JSON.stringify(room), { EX: ttl })
    await this.client.zAdd(allRoomsKey, [{ score: room.createdAt, value: room.id }])
    if (room.accessMode === 'public' && room.status !== 'closed') await this.client.zAdd(publicRoomsKey, [{ score: room.createdAt, value: room.id }])
    else await this.client.zRem(publicRoomsKey, room.id)
  }
  async deleteRoom(id) { await Promise.all([this.client.del(roomKey(id)), this.client.zRem(publicRoomsKey, id), this.client.zRem(allRoomsKey, id)]) }
  async listRooms() {
    const ids = await this.client.zRange(publicRoomsKey, 0, -1, { REV: true })
    const rooms = await Promise.all(ids.map((id) => this.getRoom(id)))
    const expired = ids.filter((_, index) => !rooms[index])
    if (expired.length) await this.client.zRem(publicRoomsKey, expired)
    return rooms.filter(Boolean)
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
  hostName: room.members[room.hostMemberId]?.displayName || 'Host',
  userCount: Object.values(room.members).filter((member) => member.connected).length,
  createdAt: room.createdAt, expiresAt: room.expiresAt, status: room.status
})
const clientMember = (member) => {
  const copy = structuredClone(member)
  delete copy.uid; delete copy.socketIds
  return copy
}
const clientRoom = (room) => {
  const copy = structuredClone(room)
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

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin
  if (origin && originAllowed(origin)) res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.writeHead(204).end()
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const ip = req.socket.remoteAddress || 'unknown'
  try {
    if (url.pathname === '/health') return json(res, 200, { ok: true })
    if (url.pathname === '/ready') { await store.ping(); return json(res, 200, { ok: true, store: redisClient ? 'redis' : 'memory', voiceConfigured }) }
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
      const fallbackAvailable = Boolean(input.linkEmbed)
      return json(res, 200, { hlsReachable, contentType, errorCode, fallbackAvailable, capability: hlsReachable ? 'full' : fallbackAvailable ? 'limited' : 'unavailable' })
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
      const participantToken = await createVoiceToken(room, member)
      return json(res, 200, { serverUrl: LIVEKIT_URL, participantToken })
    }
    if (req.method === 'POST' && url.pathname === '/api/rooms') {
      const authToken = bearer(req)
      if (!authToken) return json(res, 401, { code: 'AUTH_REQUIRED', error: 'Bạn cần đăng nhập Google để tạo phòng.' })
      const owner = await verifyFirebaseToken(authToken)
      if (!(await store.allow(`create:${ip}`, 5, 600_000))) return json(res, 429, { code: 'RATE_LIMITED', error: 'Bạn đã tạo quá nhiều phòng.' })
      const input = createRoomSchema.parse(await readBody(req)); let code = roomCode(); while (await store.getRoom(code)) code = roomCode()
      const now = Date.now(); const memberId = id('member'); const initial = input.movie.episodes.find((episode) => episode.id === input.initialEpisodeId) || input.movie.episodes.find((episode) => episode.linkM3u8)
      if (!initial?.linkM3u8) return json(res, 400, { code: 'HLS_REQUIRED', error: 'Xem chung cần ít nhất một nguồn HLS để đồng bộ chính xác.' })
      const initialProbe = await probeHlsSource(initial.linkM3u8)
      if (!initialProbe.hlsReachable) return json(res, 400, { code: initialProbe.errorCode || 'HLS_UNREACHABLE', error: initialProbe.errorCode === 'MEDIA_HOST_DENIED' ? 'Host HLS chưa được máy chủ cho phép.' : 'Máy chủ không tải được nguồn HLS đã chọn.' })
      const displayName = String(owner.name || owner.email?.split('@')[0] || 'Host').trim().slice(0, 30)
      const member = { memberId, displayName, role: 'host', uid: owner.uid, avatar: owner.picture, isAnonymous: false, joinedAt: now, lastSeenAt: now, connected: false, socketIds: [] }
      const room = { id: code, roomName: input.roomName || input.movie.title, accessMode: input.accessMode, passwordHash: input.accessMode === 'password' ? await hashRoomPassword(input.password) : undefined, syncCapability: sourceCapability(initial) === 'full' ? 'full' : 'limited', ownerUid: owner.uid, ownerDisplayName: displayName, ownerAvatar: owner.picture, movie: { ...input.movie, episodes: input.movie.episodes.map((episode) => ({ ...episode, capability: sourceCapability(episode) })) },
        playback: { episodeId: initial.id, currentTime: 0, isPlaying: false, revision: 0, serverUpdatedAt: now, updatedBy: memberId, action: 'pause' },
        members: { [memberId]: member }, messages: [], hostMemberId: memberId, controlMode: 'host_only', voiceEnabled: false, createdAt: now, expiresAt: now + ROOM_TTL_SECONDS * 1000, status: 'active', emptySince: now }
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
      room.members[room.hostMemberId].role = 'viewer'; member.role = 'host'; room.hostMemberId = member.memberId; room.status = 'active'; room.playback.revision += 1
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
  const room = await store.getRoom(roomId); if (!room || room.status !== 'host_reconnecting') return
  const successor = chooseHostSuccessor(room.members, room.hostMemberId)
  if (!successor) return
  const previous = room.hostMemberId; room.members[previous].role = 'viewer'; successor.role = 'host'; room.hostMemberId = successor.memberId; room.status = 'active'; room.playback.revision += 1
  await store.setRoom(room); io.to(room.id).emit('host:changed', { previousHostMemberId: previous, hostMemberId: room.hostMemberId, room: clientRoom(room) }); log('host_transferred', { roomId, hostMemberId: room.hostMemberId })
}

io.on('connection', async (socket) => {
  const { roomId, memberId } = socket.data.identity; let room = await store.getRoom(roomId); if (!room) return socket.disconnect(true)
  const member = room.members[memberId]; member.connected = true; member.lastSeenAt = Date.now(); member.socketIds = [...new Set([...member.socketIds, socket.id])]; room.emptySince = null
  if (memberId === room.hostMemberId && room.status === 'host_reconnecting') { room.status = 'active'; room.hostReconnectDeadline = null; clearTimeout(hostTimers.get(roomId)); hostTimers.delete(roomId); log('host_resumed', { roomId }) }
  socket.join(roomId); socket.join(`${roomId}:${memberId}`); await store.setRoom(room); socket.emit('room:snapshot', clientRoom(room)); socket.to(roomId).emit('room:member_joined', clientMember(member)); io.emit('room:list_changed')

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
    const fresh = await store.getRoom(roomId); if (!fresh || fresh.hostMemberId !== memberId || fresh.status !== 'active') return ack?.({ ok: false, code: 'HOST_ONLY' })
    const episode = fresh.movie.episodes.find((item) => item.id === payload?.episodeId); if (!episode) return ack?.({ ok: false, code: 'EPISODE_NOT_FOUND' })
    if (!episode.linkM3u8) return ack?.({ ok: false, code: 'HLS_REQUIRED' })
    fresh.syncCapability = 'full'; fresh.playback = { episodeId: episode.id, currentTime: 0, isPlaying: false, revision: fresh.playback.revision + 1, serverUpdatedAt: Date.now(), updatedBy: memberId, action: 'episode_change' }
    await store.setRoom(fresh); io.to(roomId).emit('episode:sync', { room: clientRoom(fresh), playback: fresh.playback }); ack?.({ ok: true, revision: fresh.playback.revision })
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

  const disconnectMember = async () => {
    const fresh = await store.getRoom(roomId); if (!fresh?.members[memberId]) return
    const current = fresh.members[memberId]; current.socketIds = current.socketIds.filter((socketId) => socketId !== socket.id); current.connected = current.socketIds.length > 0; current.lastSeenAt = Date.now()
    if (!current.connected) socket.to(roomId).emit('room:member_left', { memberId })
    if (memberId === fresh.hostMemberId && !current.connected) {
      fresh.status = 'host_reconnecting'; fresh.hostReconnectDeadline = Date.now() + HOST_GRACE_SECONDS * 1000; io.to(roomId).emit('host:reconnecting', { graceSeconds: HOST_GRACE_SECONDS }); clearTimeout(hostTimers.get(roomId)); hostTimers.set(roomId, setTimeout(() => transferHost(roomId), HOST_GRACE_SECONDS * 1000))
    }
    if (!Object.values(fresh.members).some((item) => item.connected)) fresh.emptySince = Date.now()
    await store.setRoom(fresh); io.emit('room:list_changed')
  }
  socket.on('room:leave', async () => { await disconnectMember(); socket.disconnect(true) })
  socket.on('disconnect', disconnectMember)
})

setInterval(async () => {
  try {
    for (const room of await store.listAllRooms()) {
      if (room.status === 'host_reconnecting' && room.hostReconnectDeadline && room.hostReconnectDeadline <= Date.now()) await transferHost(room.id)
      if (room.emptySince && Date.now() - room.emptySince > EMPTY_ROOM_TTL_SECONDS * 1000) { await store.deleteRoom(room.id); io.to(room.id).emit('room:closed', { code: 'EMPTY_ROOM' }); log('room_closed', { roomId: room.id, reason: 'empty' }) }
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
