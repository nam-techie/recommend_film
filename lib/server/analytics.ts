import { getOnlineSnapshot, sampleOnlinePeak, pruneOnlineSessions } from '@/lib/server/online-presence'
import 'server-only'

import { randomUUID } from 'crypto'
import { getDatabase } from 'firebase-admin/database'
import { getFirebaseAdminApp } from '@/lib/server/firebase-admin'
import { MonetizationError } from '@/lib/server/monetization-error'
import type { AnalyticsHealth, AnalyticsMovieRow, AnalyticsOverview, AnalyticsTotals, PlaybackHeartbeat, PlaybackSessionRecord, PlaybackSessionStart, PlaybackSource } from '@/lib/analytics'
import { applyPlaybackHeartbeat, EMPTY_ANALYTICS_TOTALS } from '@/lib/analytics'

const HEARTBEAT_CAP_SECONDS = 20
const STALE_SESSION_MS = 60_000
const MAX_SESSION_MS = 12 * 60 * 60_000
const PLAYBACK_GRANT_TTL_MS = 5 * 60_000

interface PlaybackGrantRecord {
  id: string
  uid: string
  movieSlug: string
  episodeKey: string
  source: Exclude<PlaybackSource, 'estimated_embed'>
  roomId?: string
  issuedAt: number
  expiresAt: number
  usedClientSessionId?: string
  usedSessionId?: string
}

interface AnalyticsHealthRecord {
  firstSessionAt?: number
  lastSessionStartedAt?: number
  lastSuccessfulStartAt?: number
  lastSuccessfulHeartbeatAt?: number
  lastSuccessfulFinalizeAt?: number
  lastCronAt?: number
  lastRollupAt?: number
  lastErrorCode?: string
  lastErrorAt?: number
}

function database() { return getDatabase(getFirebaseAdminApp()) }
function cleanText(value: string, max: number) { return value.trim().slice(0, max) }
function cleanKey(value: string) { return value.trim().replace(/[.#$\[\]/]/g, '-').slice(0, 160) }
function validClientSessionId(value: string) { return /^[A-Za-z0-9_-]{8,100}$/.test(value) }
export function vietnamDayKey(value: number) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value) }

async function recordHealthSuccess(field: keyof AnalyticsHealthRecord, at = Date.now()) {
  await database().ref('analytics/health').update({ [field]: at })
}

async function recordHealthError(error: unknown) {
  const code = error instanceof MonetizationError ? error.code : 'ANALYTICS_INTERNAL_ERROR'
  await database().ref('analytics/health').update({ lastErrorCode: code, lastErrorAt: Date.now() }).catch(() => undefined)
}

export async function issuePlaybackGrant(uid: string, input: { movieSlug: string; episodeKey: string; source: 'solo' | 'watch_party'; roomId?: string; grantId?: string }) {
  const movieSlug = cleanKey(input.movieSlug)
  const episodeKey = cleanKey(input.episodeKey)
  if (!movieSlug || !episodeKey) throw new MonetizationError('INVALID_WATCH_TARGET', 'Phim hoặc tập phim không hợp lệ.')
  const id = cleanKey(input.grantId || randomUUID())
  const now = Date.now()
  const value: PlaybackGrantRecord = { id, uid, movieSlug, episodeKey, source: input.source, ...(input.roomId ? { roomId: cleanKey(input.roomId) } : {}), issuedAt: now, expiresAt: now + PLAYBACK_GRANT_TTL_MS }
  const ref = database().ref(`analytics/playbackGrants/${id}`)
  const result = await ref.transaction((current: PlaybackGrantRecord | null) => current || value, undefined, false)
  const grant = result.snapshot.val() as PlaybackGrantRecord
  if (grant.uid !== uid || grant.movieSlug !== movieSlug || grant.episodeKey !== episodeKey || grant.source !== input.source) throw new MonetizationError('PLAYBACK_GRANT_CONFLICT', 'Playback grant đã được dùng cho nội dung khác.', 409)
  return { grantId: grant.id, expiresAt: grant.expiresAt }
}

export async function startPlaybackSession(uid: string, input: PlaybackSessionStart) {
  try {
    const movieSlug = cleanKey(input.movieSlug || '')
    const episodeKey = cleanKey(input.episodeKey || '')
    const grantId = cleanKey(input.grantId || '')
    const clientSessionId = cleanKey(input.clientSessionId || '')
    if (!movieSlug || !episodeKey || !grantId || !validClientSessionId(clientSessionId)) throw new MonetizationError('INVALID_PLAYBACK_START', 'Thiếu playback grant hoặc mã phiên client hợp lệ.')
    const now = Date.now()
    const grantRef = database().ref(`analytics/playbackGrants/${grantId}`)
    let failure: MonetizationError | null = null
    let sessionId = ''
    const result = await grantRef.transaction((current: PlaybackGrantRecord | null) => {
      if (!current || current.uid !== uid) { failure = new MonetizationError('PLAYBACK_GRANT_NOT_FOUND', 'Playback grant không tồn tại.', 404); return }
      if (current.expiresAt < now) { failure = new MonetizationError('PLAYBACK_GRANT_EXPIRED', 'Playback grant đã hết hạn.', 410); return }
      if (current.movieSlug !== movieSlug || current.episodeKey !== episodeKey) { failure = new MonetizationError('PLAYBACK_GRANT_TARGET_MISMATCH', 'Playback grant không khớp phim hoặc tập.', 409); return }
      if (input.mode === 'estimated_embed' && current.source !== 'solo') { failure = new MonetizationError('ESTIMATED_MODE_NOT_ALLOWED', 'Player nhúng chỉ hỗ trợ phiên xem cá nhân.', 409); return }
      if (current.usedClientSessionId && current.usedClientSessionId !== clientSessionId) { failure = new MonetizationError('PLAYBACK_GRANT_ALREADY_USED', 'Playback grant đã được dùng.', 409); return }
      sessionId = current.usedSessionId || randomUUID()
      return { ...current, usedClientSessionId: clientSessionId, usedSessionId: sessionId }
    }, undefined, false)
    if (!result.committed) throw failure || new MonetizationError('PLAYBACK_GRANT_CLAIM_FAILED', 'Không thể xác nhận playback grant.', 503)
    const existing = await database().ref(`analytics/playbackSessions/${sessionId}`).get()
    if (existing.exists()) return { sessionId, heartbeatIntervalMs: 15_000, staleAfterMs: STALE_SESSION_MS, reliability: (existing.val() as PlaybackSessionRecord).reliability || 'verified' }
    const grant = result.snapshot.val() as PlaybackGrantRecord
    const reliability = input.mode === 'estimated_embed' ? 'estimated_embed' as const : 'verified' as const
    const record: PlaybackSessionRecord = {
      id: sessionId, uid, grantId, clientSessionId, movieSlug, episodeKey,
      movieTitle: cleanText(input.movieTitle || movieSlug, 180), episodeName: cleanText(input.episodeName || '', 120),
      duration: Number.isFinite(input.duration) ? Math.max(0, Math.min(input.duration, 24 * 60 * 60)) : 0,
      genres: [...new Set((input.genres || []).map((genre) => cleanText(genre, 60)).filter(Boolean))].slice(0, 8),
      source: reliability === 'estimated_embed' ? 'estimated_embed' : grant.source,
      ...(grant.roomId ? { roomId: grant.roomId } : {}), reliability, dayKey: vietnamDayKey(now),
      startedAt: now, lastHeartbeatAt: now, endedAt: null, lastSequence: 0, lastPosition: 0,
      activeSeconds: 0, isPlaying: true, visible: true, pictureInPicture: false,
      qualified: false, completed: false, finalized: false, rollupApplied: false,
    }
    await database().ref(`analytics/playbackSessions/${sessionId}`).set(record)
    await database().ref('analytics/health').transaction((current: AnalyticsHealthRecord | null) => ({
      ...(current || {}), firstSessionAt: current?.firstSessionAt || now, lastSessionStartedAt: now, lastSuccessfulStartAt: now,
    }))
    return { sessionId, heartbeatIntervalMs: 15_000, staleAfterMs: STALE_SESSION_MS, reliability }
  } catch (error) {
    await recordHealthError(error)
    throw error
  }
}

export async function heartbeatPlaybackSession(uid: string, sessionIdValue: string, heartbeat: PlaybackHeartbeat) {
  try {
    const sessionId = cleanKey(sessionIdValue)
    const ref = database().ref(`analytics/playbackSessions/${sessionId}`)
    const now = Date.now()
    let accepted = false
    let failure: MonetizationError | null = null
    const result = await ref.transaction((current: PlaybackSessionRecord | null) => {
      if (!current || current.uid !== uid) { failure = new MonetizationError('PLAYBACK_SESSION_NOT_FOUND', 'Playback session không tồn tại.', 404); return }
      if (current.finalized) return current
      if (now - current.startedAt > MAX_SESSION_MS) { failure = new MonetizationError('PLAYBACK_SESSION_EXPIRED', 'Playback session đã hết hạn.', 410); return }
      const next = applyPlaybackHeartbeat(current, heartbeat, now, HEARTBEAT_CAP_SECONDS)
      accepted = next.accepted
      return next.record
    }, undefined, false)
    if (!result.committed && failure) throw failure
    if (accepted) await recordHealthSuccess('lastSuccessfulHeartbeatAt', now)
    return { accepted, serverTime: now }
  } catch (error) {
    await recordHealthError(error)
    throw error
  }
}

async function markDirtyDay(dayKey: string) {
  await database().ref(`analytics/dirtyDays/${dayKey}`).set({ updatedAt: Date.now() })
}

export async function finalizePlaybackSession(uid: string, sessionIdValue: string) {
  try {
    const sessionId = cleanKey(sessionIdValue)
    const ref = database().ref(`analytics/playbackSessions/${sessionId}`)
    const now = Date.now()
    let finalized: PlaybackSessionRecord | null = null
    await ref.transaction((current: PlaybackSessionRecord | null) => {
      if (!current || current.uid !== uid || current.finalized) return current
      finalized = { ...current, isPlaying: false, finalized: true, endedAt: now }
      return finalized
    }, undefined, false)
    if (finalized && (finalized as PlaybackSessionRecord).reliability === 'verified') await markDirtyDay((finalized as PlaybackSessionRecord).dayKey || vietnamDayKey((finalized as PlaybackSessionRecord).endedAt || now))
    if (finalized) await recordHealthSuccess('lastSuccessfulFinalizeAt', now)
    return { finalized: Boolean(finalized) }
  } catch (error) {
    await recordHealthError(error)
    throw error
  }
}

export async function finalizeStalePlaybackSessions() {
  const snapshot = await database().ref('analytics/playbackSessions').orderByChild('finalized').equalTo(false).limitToFirst(500).get()
  const values = (snapshot.val() || {}) as Record<string, PlaybackSessionRecord>
  let finalized = 0
  for (const session of Object.values(values)) {
    if (Date.now() - session.lastHeartbeatAt <= STALE_SESSION_MS) continue
    if ((await finalizePlaybackSession(session.uid, session.id)).finalized) finalized += 1
  }
  return finalized
}

function addTotals(target: AnalyticsTotals, session: PlaybackSessionRecord) {
  target.playStarts += 1
  target.activeSeconds += session.activeSeconds
  if (session.qualified) target.qualifiedViews += 1
  if (session.qualified && session.completed) target.completedViews += 1
}

export async function rebuildDirtyAnalyticsDays(limit = 10) {
  const dirtySnapshot = await database().ref('analytics/dirtyDays').orderByKey().limitToFirst(Math.max(1, Math.min(31, limit))).get()
  const dirtyDays = (dirtySnapshot.val() || {}) as Record<string, { updatedAt: number }>
  let rebuilt = 0
  for (const [dayKey, marker] of Object.entries(dirtyDays)) {
    const sessionsSnapshot = await database().ref('analytics/playbackSessions').orderByChild('dayKey').equalTo(dayKey).get()
    const sessions = Object.values((sessionsSnapshot.val() || {}) as Record<string, PlaybackSessionRecord>).filter((session) => session.finalized && session.reliability === 'verified')
    const global = { ...EMPTY_ANALYTICS_TOTALS }
    const movies: Record<string, AnalyticsMovieRow & { updatedAt: number }> = {}
    const users: Record<string, AnalyticsTotals & { updatedAt: number }> = {}
    const genres: Record<string, { genre: string; qualifiedViews: number; activeSeconds: number; updatedAt: number }> = {}
    const uniqueByMovie = new Map<string, Set<string>>()
    for (const session of sessions) {
      addTotals(global, session)
      const movieKey = cleanKey(session.movieSlug)
      const movie = movies[movieKey] || { slug: session.movieSlug, title: session.movieTitle, genres: session.genres || [], ...EMPTY_ANALYTICS_TOTALS, updatedAt: Date.now() }
      addTotals(movie, session); movies[movieKey] = movie
      const user = users[session.uid] || { ...EMPTY_ANALYTICS_TOTALS, updatedAt: Date.now() }
      addTotals(user, session); users[session.uid] = user
      if (session.qualified) {
        const set = uniqueByMovie.get(movieKey) || new Set<string>(); set.add(session.uid); uniqueByMovie.set(movieKey, set)
      }
      for (const genre of session.genres || []) {
        const key = cleanKey(genre.toLocaleLowerCase('vi-VN'))
        const row = genres[key] || { genre, qualifiedViews: 0, activeSeconds: 0, updatedAt: Date.now() }
        if (session.qualified) row.qualifiedViews += 1
        row.activeSeconds += session.activeSeconds
        genres[key] = row
      }
    }
    const uniqueMarkers: Record<string, Record<string, true>> = {}
    uniqueByMovie.forEach((uids, movieKey) => {
      uniqueMarkers[movieKey] = Object.fromEntries([...uids].map((uid) => [uid, true]))
      movies[movieKey].uniqueViewers = uids.size
      global.uniqueViewers += uids.size
    })
    const previousUsers = await database().ref(`analytics/dayUsers/${dayKey}`).get()
    const updates: Record<string, unknown> = {
      [`analytics/aggregates/globalDaily/${dayKey}`]: { ...global, updatedAt: Date.now() },
      [`analytics/aggregates/movieDaily/${dayKey}`]: Object.keys(movies).length ? movies : null,
      [`analytics/aggregates/genreDaily/${dayKey}`]: Object.keys(genres).length ? genres : null,
      [`analytics/aggregates/uniqueViewers/${dayKey}`]: Object.keys(uniqueMarkers).length ? uniqueMarkers : null,
      [`analytics/dayUsers/${dayKey}`]: Object.keys(users).length ? Object.fromEntries(Object.keys(users).map((uid) => [uid, true])) : null,
      'analytics/health/lastRollupAt': Date.now(),
    }
    Object.keys(previousUsers.val() || {}).forEach((uid) => { updates[`analytics/aggregates/userDaily/${uid}/${dayKey}`] = null })
    Object.entries(users).forEach(([uid, totals]) => { updates[`analytics/aggregates/userDaily/${uid}/${dayKey}`] = totals })
    sessions.forEach((session) => { updates[`analytics/playbackSessions/${session.id}/rollupApplied`] = true })
    await database().ref().update(updates)
    await database().ref(`analytics/dirtyDays/${dayKey}`).transaction((current: { updatedAt?: number } | null) => current?.updatedAt === marker.updatedAt ? null : current)
    rebuilt += 1
  }
  return rebuilt
}

export async function maintainAnalyticsRetention() {
  const now = Date.now()
  const [presence, oldSessions, oldGrants, recommendationEvents] = await Promise.all([
    getOnlineSnapshot(),
    database().ref('analytics/playbackSessions').orderByChild('startedAt').endAt(now - 90 * 86_400_000).limitToFirst(1000).get(),
    database().ref('analytics/playbackGrants').orderByChild('expiresAt').endAt(now - 86_400_000).limitToFirst(1000).get(),
    database().ref('personalization/recommendationEvents').get(),
  ])
  const onlineNow = presence.onlineNow
  await Promise.all([sampleOnlinePeak(onlineNow, now), pruneOnlineSessions()])
  const updates: Record<string, number | null> = { 'analytics/health/lastCronAt': now }
  Object.keys(oldSessions.val() || {}).forEach((id) => { updates[`analytics/playbackSessions/${id}`] = null })
  Object.keys(oldGrants.val() || {}).forEach((id) => { updates[`analytics/playbackGrants/${id}`] = null })
  let deletedRecommendationEvents = 0
  Object.entries((recommendationEvents.val() || {}) as Record<string, Record<string, { createdAt?: number }>>).forEach(([uid, events]) => Object.entries(events || {}).forEach(([id, event]) => {
    if (Number(event.createdAt) < now - 30 * 86_400_000) { updates[`personalization/recommendationEvents/${uid}/${id}`] = null; deletedRecommendationEvents += 1 }
  }))
  await database().ref().update(updates)
  return { onlineNow, deletedSessions: Object.keys(oldSessions.val() || {}).length, deletedGrants: Object.keys(oldGrants.val() || {}).length, deletedRecommendationEvents }
}

function sumTotals(target: AnalyticsTotals, value?: Partial<AnalyticsTotals> | null) {
  if (!value) return target
  target.qualifiedViews += Number(value.qualifiedViews) || 0; target.uniqueViewers += Number(value.uniqueViewers) || 0
  target.activeSeconds += Number(value.activeSeconds) || 0; target.completedViews += Number(value.completedViews) || 0; target.playStarts += Number(value.playStarts) || 0
  return target
}

function rangeKeys(range: '7d' | '30d' | '90d') {
  const days = Number(range.slice(0, -1))
  return { days, keys: Array.from({ length: days }, (_, index) => vietnamDayKey(Date.now() - index * 86_400_000)) }
}

export async function getAnalyticsOverview(range: '7d' | '30d' | '90d' = '30d'): Promise<AnalyticsOverview> {
  const { days, keys } = rangeKeys(range)
  const sessionCutoff = Date.now() - STALE_SESSION_MS
  const [globalRows, movieRows, genreRows, sessions, presence, presenceBuckets, health] = await Promise.all([
    Promise.all(keys.map((day) => database().ref(`analytics/aggregates/globalDaily/${day}`).get())),
    Promise.all(keys.map((day) => database().ref(`analytics/aggregates/movieDaily/${day}`).get())),
    Promise.all(keys.map((day) => database().ref(`analytics/aggregates/genreDaily/${day}`).get())),
    database().ref('analytics/playbackSessions').orderByChild('lastHeartbeatAt').startAt(sessionCutoff).get(),
    getOnlineSnapshot(),
    database().ref('analytics/aggregates/onlinePresence5m').orderByKey().startAt(String(Date.now() - days * 86_400_000)).get(),
    database().ref('analytics/health').get(),
  ])
  const totals = { ...EMPTY_ANALYTICS_TOTALS }; globalRows.forEach((row) => sumTotals(totals, row.val()))
  const movies = new Map<string, AnalyticsMovieRow>()
  movieRows.forEach((row) => Object.values((row.val() || {}) as Record<string, AnalyticsMovieRow>).forEach((movie) => { const current = movies.get(movie.slug) || { slug: movie.slug, title: movie.title, genres: movie.genres || [], ...EMPTY_ANALYTICS_TOTALS }; sumTotals(current, movie); movies.set(movie.slug, current) }))
  const genres = new Map<string, { genre: string; qualifiedViews: number; activeSeconds: number }>()
  genreRows.forEach((row) => Object.values((row.val() || {}) as Record<string, { genre: string; qualifiedViews: number; activeSeconds: number }>).forEach((genre) => { const current = genres.get(genre.genre) || { genre: genre.genre, qualifiedViews: 0, activeSeconds: 0 }; current.qualifiedViews += Number(genre.qualifiedViews) || 0; current.activeSeconds += Number(genre.activeSeconds) || 0; genres.set(genre.genre, current) }))
  const activeSessions = Object.values((sessions.val() || {}) as Record<string, PlaybackSessionRecord>).filter((session) => session.lastHeartbeatAt >= sessionCutoff && !session.finalized && session.isPlaying && (session.visible || session.pictureInPicture) && session.reliability === 'verified')
  const onlineNow = presence.onlineNow
  const peakOnline = Math.max(onlineNow, ...Object.values((presenceBuckets.val() || {}) as Record<string, { online?: number }>).map((value) => Number(value.online) || 0))
  return { generatedAt: Date.now(), range, since: Number((health.val() as AnalyticsHealthRecord | null)?.firstSessionAt) || null, totals, concurrentViewers: new Set(activeSessions.map((session) => session.uid)).size, onlineNow, interactingNow: presence.interactingNow, peakOnline, topMovies: [...movies.values()].sort((a, b) => b.qualifiedViews - a.qualifiedViews).slice(0, 20), topGenres: [...genres.values()].sort((a, b) => b.qualifiedViews - a.qualifiedViews).slice(0, 12) }
}

export async function getAnalyticsMovies(range: '7d' | '30d' | '90d' = '30d', sort: 'qualifiedViews' | 'watchHours' | 'completion' = 'qualifiedViews') {
  const { keys } = rangeKeys(range)
  const rows = await Promise.all(keys.map((day) => database().ref(`analytics/aggregates/movieDaily/${day}`).get()))
  const movies = new Map<string, AnalyticsMovieRow>()
  rows.forEach((row) => Object.values((row.val() || {}) as Record<string, AnalyticsMovieRow>).forEach((movie) => { const current = movies.get(movie.slug) || { slug: movie.slug, title: movie.title, genres: movie.genres || [], ...EMPTY_ANALYTICS_TOTALS }; sumTotals(current, movie); movies.set(movie.slug, current) }))
  const items = [...movies.values()].map((movie) => ({ ...movie, watchHours: Math.round(movie.activeSeconds / 36) / 100, completionRate: movie.qualifiedViews ? Math.round(movie.completedViews / movie.qualifiedViews * 1000) / 10 : 0 })).sort((left, right) => sort === 'watchHours' ? right.activeSeconds - left.activeSeconds : sort === 'completion' ? right.completionRate - left.completionRate : right.qualifiedViews - left.qualifiedViews)
  return { generatedAt: Date.now(), range, sort, items }
}

export async function getAnalyticsMovie(slug: string, range: '7d' | '30d' | '90d' = '30d') {
  const movieSlug = cleanKey(slug); const { keys: reverseKeys } = rangeKeys(range); const keys = reverseKeys.reverse()
  const snapshots = await Promise.all(keys.map((day) => database().ref(`analytics/aggregates/movieDaily/${day}/${movieSlug}`).get()))
  const totals: AnalyticsMovieRow = { slug: movieSlug, title: movieSlug, genres: [], ...EMPTY_ANALYTICS_TOTALS }
  const daily = snapshots.map((snapshot, index) => { const value = (snapshot.val() || {}) as Partial<AnalyticsMovieRow>; if (value.title) totals.title = value.title; if (value.genres?.length) totals.genres = value.genres; sumTotals(totals, value); return { day: keys[index], ...EMPTY_ANALYTICS_TOTALS, ...value } })
  return { generatedAt: Date.now(), range, movie: { ...totals, watchHours: Math.round(totals.activeSeconds / 36) / 100, completionRate: totals.qualifiedViews ? Math.round(totals.completedViews / totals.qualifiedViews * 1000) / 10 : 0 }, daily }
}

export async function getAnalyticsHealth(): Promise<AnalyticsHealth> {
  const [healthSnapshot, dirtySnapshot, openSnapshot, aggregateSnapshot] = await Promise.all([
    database().ref('analytics/health').get(), database().ref('analytics/dirtyDays').get(),
    database().ref('analytics/playbackSessions').orderByChild('finalized').equalTo(false).limitToFirst(501).get(),
    database().ref('analytics/aggregates/globalDaily').limitToFirst(1).get(),
  ])
  const health = (healthSnapshot.val() || {}) as AnalyticsHealthRecord
  const dirtyDays = Object.keys(dirtySnapshot.val() || {}).length
  const openSessions = Object.keys(openSnapshot.val() || {}).length
  const recentError = health.lastErrorAt && Date.now() - health.lastErrorAt < 15 * 60_000
  const collectionState = recentError ? 'degraded' : dirtyDays ? 'delayed_rollup' : !health.firstSessionAt ? 'not_collecting' : !aggregateSnapshot.exists() ? 'collecting_no_data' : 'available'
  return { collectionState, firstSessionAt: health.firstSessionAt || null, lastSessionStartedAt: health.lastSessionStartedAt || null, lastSuccessfulStartAt: health.lastSuccessfulStartAt || null, lastSuccessfulHeartbeatAt: health.lastSuccessfulHeartbeatAt || null, lastSuccessfulFinalizeAt: health.lastSuccessfulFinalizeAt || null, lastCronAt: health.lastCronAt || null, dirtyDays, openSessions, lastErrorCode: health.lastErrorCode || null, lastErrorAt: health.lastErrorAt || null }
}
