import 'server-only'

import { randomUUID } from 'crypto'
import { getDatabase } from 'firebase-admin/database'
import { getFirebaseAdminApp } from '@/lib/server/firebase-admin'
import type { AnalyticsMovieRow, AnalyticsOverview, AnalyticsTotals, PlaybackHeartbeat, PlaybackSessionRecord, PlaybackSessionStart } from '@/lib/analytics'
import { applyPlaybackHeartbeat, EMPTY_ANALYTICS_TOTALS } from '@/lib/analytics'

const HEARTBEAT_CAP_SECONDS = 20
const STALE_SESSION_MS = 60_000
const MAX_SESSION_MS = 12 * 60 * 60_000

function cleanText(value: string, max: number) { return value.trim().slice(0, max) }
function cleanKey(value: string) { return value.trim().replace(/[.#$\[\]/]/g, '-').slice(0, 160) }
export function vietnamDayKey(value: number) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value) }

export async function startPlaybackSession(uid: string, input: PlaybackSessionStart) {
  const movieSlug = cleanKey(input.movieSlug || '')
  const episodeKey = cleanKey(input.episodeKey || '')
  if (!movieSlug || !episodeKey) throw new Error('Thiếu phim hoặc tập để bắt đầu analytics.')
  const now = Date.now()
  const id = randomUUID()
  const record: PlaybackSessionRecord = {
    id, uid, movieSlug, episodeKey,
    movieTitle: cleanText(input.movieTitle || movieSlug, 180),
    episodeName: cleanText(input.episodeName || '', 120),
    duration: Number.isFinite(input.duration) ? Math.max(0, Math.min(input.duration, 24 * 60 * 60)) : 0,
    genres: [...new Set((input.genres || []).map((genre) => cleanText(genre, 60)).filter(Boolean))].slice(0, 8),
    source: input.source === 'watch_party' ? 'watch_party' : 'solo',
    roomId: input.roomId ? cleanKey(input.roomId) : undefined,
    startedAt: now, lastHeartbeatAt: now, endedAt: null, lastSequence: 0, lastPosition: 0,
    activeSeconds: 0, isPlaying: true, visible: true, pictureInPicture: false,
    qualified: false, completed: false, finalized: false, rollupApplied: false,
  }
  await getDatabase(getFirebaseAdminApp()).ref(`analytics/playbackSessions/${id}`).set(record)
  return { sessionId: id, heartbeatIntervalMs: 15_000, staleAfterMs: STALE_SESSION_MS }
}

export async function heartbeatPlaybackSession(uid: string, sessionId: string, heartbeat: PlaybackHeartbeat) {
  const ref = getDatabase(getFirebaseAdminApp()).ref(`analytics/playbackSessions/${cleanKey(sessionId)}`)
  const now = Date.now()
  let accepted = false
  await ref.transaction((current: PlaybackSessionRecord | null) => {
    if (!current || current.uid !== uid || current.finalized || now - current.startedAt > MAX_SESSION_MS) return current
    const result = applyPlaybackHeartbeat(current, heartbeat, now, HEARTBEAT_CAP_SECONDS)
    accepted = result.accepted
    return result.record
  })
  return { accepted, serverTime: now }
}

async function increment(path: string, amount: number) {
  if (!amount) return
  await getDatabase(getFirebaseAdminApp()).ref(path).transaction((value) => (Number(value) || 0) + amount)
}

async function applySessionRollup(session: PlaybackSessionRecord) {
  const database = getDatabase(getFirebaseAdminApp())
  const sessionRef = database.ref(`analytics/playbackSessions/${session.id}`)
  let ownsRollup = false
  await sessionRef.transaction((current: PlaybackSessionRecord | null) => {
    if (!current || !current.finalized || current.rollupApplied) return current
    ownsRollup = true
    return { ...current, rollupApplied: true }
  })
  if (!ownsRollup) return

  const day = vietnamDayKey(session.endedAt || Date.now())
  const qualified = session.qualified ? 1 : 0
  const completed = session.qualified && session.completed ? 1 : 0
  const base = `analytics/aggregates`
  const movie = `${base}/movieDaily/${day}/${cleanKey(session.movieSlug)}`
  const user = `${base}/userDaily/${session.uid}/${day}`
  await database.ref(movie).update({ slug: session.movieSlug, title: session.movieTitle, genres: session.genres || [], updatedAt: Date.now() })
  await Promise.all([
    increment(`${base}/globalDaily/${day}/playStarts`, 1), increment(`${base}/globalDaily/${day}/qualifiedViews`, qualified),
    increment(`${base}/globalDaily/${day}/activeSeconds`, session.activeSeconds), increment(`${base}/globalDaily/${day}/completedViews`, completed),
    increment(`${movie}/playStarts`, 1), increment(`${movie}/qualifiedViews`, qualified), increment(`${movie}/activeSeconds`, session.activeSeconds), increment(`${movie}/completedViews`, completed),
    increment(`${user}/playStarts`, 1), increment(`${user}/qualifiedViews`, qualified), increment(`${user}/activeSeconds`, session.activeSeconds), increment(`${user}/completedViews`, completed),
  ])
  if (session.qualified) {
    const marker = database.ref(`${base}/uniqueViewers/${day}/${cleanKey(session.movieSlug)}/${session.uid}`)
    let created = false
    await marker.transaction((value) => { if (value) return value; created = true; return true })
    if (created) {
      await Promise.all([increment(`${base}/globalDaily/${day}/uniqueViewers`, 1), increment(`${movie}/uniqueViewers`, 1)])
    }
  }
  for (const genre of session.genres || []) {
    const key = cleanKey(genre.toLocaleLowerCase('vi-VN'))
    await database.ref(`${base}/genreDaily/${day}/${key}`).update({ genre, updatedAt: Date.now() })
    await Promise.all([increment(`${base}/genreDaily/${day}/${key}/qualifiedViews`, qualified), increment(`${base}/genreDaily/${day}/${key}/activeSeconds`, session.activeSeconds)])
  }
}

export async function finalizePlaybackSession(uid: string, sessionId: string) {
  const ref = getDatabase(getFirebaseAdminApp()).ref(`analytics/playbackSessions/${cleanKey(sessionId)}`)
  const now = Date.now()
  let finalized: PlaybackSessionRecord | null = null
  await ref.transaction((current: PlaybackSessionRecord | null) => {
    if (!current || current.uid !== uid || current.finalized) return current
    finalized = { ...current, isPlaying: false, finalized: true, endedAt: now }
    return finalized
  })
  if (finalized) await applySessionRollup(finalized)
  return { finalized: Boolean(finalized) }
}

export async function finalizeStalePlaybackSessions() {
  const database = getDatabase(getFirebaseAdminApp())
  const snapshot = await database.ref('analytics/playbackSessions').orderByChild('finalized').equalTo(false).limitToFirst(500).get()
  const values = (snapshot.val() || {}) as Record<string, PlaybackSessionRecord>
  let finalized = 0
  for (const session of Object.values(values)) {
    if (Date.now() - session.lastHeartbeatAt <= STALE_SESSION_MS) continue
    if ((await finalizePlaybackSession(session.uid, session.id)).finalized) finalized += 1
  }
  return finalized
}

export async function maintainAnalyticsRetention() {
  const database = getDatabase(getFirebaseAdminApp())
  const now = Date.now()
  const [presence, oldSessions, recommendationEvents] = await Promise.all([
    database.ref('presenceConnections').get(),
    database.ref('analytics/playbackSessions').orderByChild('startedAt').endAt(now - 90 * 86_400_000).limitToFirst(1000).get(),
    database.ref('personalization/recommendationEvents').get(),
  ])
  const onlineNow = Object.values((presence.val() || {}) as Record<string, Record<string, true>>).filter((connections) => Object.keys(connections || {}).length > 0).length
  const bucket = Math.floor(now / 300_000) * 300_000
  const updates: Record<string, number | null> = { [`analytics/aggregates/presence5m/${bucket}/online`]: onlineNow, [`analytics/aggregates/presence5m/${bucket}/recordedAt`]: now }
  Object.keys(oldSessions.val() || {}).forEach((id) => { updates[`analytics/playbackSessions/${id}`] = null })
  let deletedRecommendationEvents = 0
  Object.entries((recommendationEvents.val() || {}) as Record<string, Record<string, { createdAt?: number }>>).forEach(([uid, events]) => Object.entries(events || {}).forEach(([id, event]) => {
    if (Number(event.createdAt) < now - 30 * 86_400_000) { updates[`personalization/recommendationEvents/${uid}/${id}`] = null; deletedRecommendationEvents += 1 }
  }))
  await database.ref().update(updates)
  return { onlineNow, deletedSessions: Object.keys(oldSessions.val() || {}).length, deletedRecommendationEvents }
}

function sumTotals(target: AnalyticsTotals, value?: Partial<AnalyticsTotals> | null) {
  if (!value) return target
  target.qualifiedViews += Number(value.qualifiedViews) || 0; target.uniqueViewers += Number(value.uniqueViewers) || 0
  target.activeSeconds += Number(value.activeSeconds) || 0; target.completedViews += Number(value.completedViews) || 0; target.playStarts += Number(value.playStarts) || 0
  return target
}

export async function getAnalyticsOverview(range: '7d' | '30d' | '90d' = '30d'): Promise<AnalyticsOverview> {
  const days = Number(range.slice(0, -1))
  const keys = Array.from({ length: days }, (_, index) => vietnamDayKey(Date.now() - index * 86_400_000))
  const database = getDatabase(getFirebaseAdminApp())
  const sessionCutoff = Date.now() - STALE_SESSION_MS
  const playbackSessionsRef = database.ref('analytics/playbackSessions')
  const recentSessionsPromise = playbackSessionsRef.orderByChild('lastHeartbeatAt').startAt(sessionCutoff).get().catch(async (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    if (!message.toLowerCase().includes('index not defined')) throw error
    // Compatibility fallback while the new Firebase .indexOn rule is waiting to be deployed.
    // This keeps the admin dashboard available; production should still deploy the index.
    return playbackSessionsRef.get()
  })
  const [globalRows, movieRows, genreRows, sessions, presence, presenceBuckets] = await Promise.all([
    Promise.all(keys.map((day) => database.ref(`analytics/aggregates/globalDaily/${day}`).get())),
    Promise.all(keys.map((day) => database.ref(`analytics/aggregates/movieDaily/${day}`).get())),
    Promise.all(keys.map((day) => database.ref(`analytics/aggregates/genreDaily/${day}`).get())),
    recentSessionsPromise,
    database.ref('presenceConnections').get(),
    database.ref('analytics/aggregates/presence5m').orderByKey().startAt(String(Date.now() - days * 86_400_000)).get(),
  ])
  const totals = { ...EMPTY_ANALYTICS_TOTALS }
  globalRows.forEach((row) => sumTotals(totals, row.val()))
  const movies = new Map<string, AnalyticsMovieRow>()
  movieRows.forEach((row) => Object.values((row.val() || {}) as Record<string, AnalyticsMovieRow>).forEach((movie) => {
    const current = movies.get(movie.slug) || { slug: movie.slug, title: movie.title, genres: movie.genres || [], ...EMPTY_ANALYTICS_TOTALS }
    sumTotals(current, movie); movies.set(movie.slug, current)
  }))
  const genres = new Map<string, { genre: string; qualifiedViews: number; activeSeconds: number }>()
  genreRows.forEach((row) => Object.values((row.val() || {}) as Record<string, { genre: string; qualifiedViews: number; activeSeconds: number }>).forEach((genre) => {
    const current = genres.get(genre.genre) || { genre: genre.genre, qualifiedViews: 0, activeSeconds: 0 }
    current.qualifiedViews += Number(genre.qualifiedViews) || 0; current.activeSeconds += Number(genre.activeSeconds) || 0; genres.set(genre.genre, current)
  }))
  const activeSessions = Object.values((sessions.val() || {}) as Record<string, PlaybackSessionRecord>).filter((session) => session.lastHeartbeatAt >= sessionCutoff && !session.finalized && session.isPlaying)
  const onlineNow = Object.values((presence.val() || {}) as Record<string, Record<string, true>>).filter((connections) => Object.keys(connections || {}).length > 0).length
  const peakOnline = Math.max(0, ...Object.values((presenceBuckets.val() || {}) as Record<string, { online?: number }>).map((value) => Number(value.online) || 0))
  return {
    generatedAt: Date.now(), range, since: globalRows.some((row) => row.exists()) ? Date.now() - (days - 1) * 86_400_000 : null,
    totals, concurrentViewers: new Set(activeSessions.map((session) => session.uid)).size, onlineNow, peakOnline,
    topMovies: [...movies.values()].sort((a, b) => b.qualifiedViews - a.qualifiedViews).slice(0, 20),
    topGenres: [...genres.values()].sort((a, b) => b.qualifiedViews - a.qualifiedViews).slice(0, 12),
  }
}

export async function getAnalyticsMovies(range: '7d' | '30d' | '90d' = '30d', sort: 'qualifiedViews' | 'watchHours' | 'completion' = 'qualifiedViews') {
  const days = Number(range.slice(0, -1))
  const keys = Array.from({ length: days }, (_, index) => vietnamDayKey(Date.now() - index * 86_400_000))
  const database = getDatabase(getFirebaseAdminApp())
  const rows = await Promise.all(keys.map((day) => database.ref(`analytics/aggregates/movieDaily/${day}`).get()))
  const movies = new Map<string, AnalyticsMovieRow>()
  rows.forEach((row) => Object.values((row.val() || {}) as Record<string, AnalyticsMovieRow>).forEach((movie) => {
    const current = movies.get(movie.slug) || { slug: movie.slug, title: movie.title, genres: movie.genres || [], ...EMPTY_ANALYTICS_TOTALS }
    sumTotals(current, movie); movies.set(movie.slug, current)
  }))
  const items = [...movies.values()].map((movie) => ({
    ...movie,
    watchHours: Math.round(movie.activeSeconds / 36) / 100,
    completionRate: movie.qualifiedViews ? Math.round(movie.completedViews / movie.qualifiedViews * 1000) / 10 : 0,
  })).sort((left, right) => sort === 'watchHours' ? right.activeSeconds - left.activeSeconds : sort === 'completion' ? right.completionRate - left.completionRate : right.qualifiedViews - left.qualifiedViews)
  return { generatedAt: Date.now(), range, sort, items }
}

export async function getAnalyticsMovie(slug: string, range: '7d' | '30d' | '90d' = '30d') {
  const movieSlug = cleanKey(slug)
  const days = Number(range.slice(0, -1))
  const keys = Array.from({ length: days }, (_, index) => vietnamDayKey(Date.now() - index * 86_400_000)).reverse()
  const database = getDatabase(getFirebaseAdminApp())
  const snapshots = await Promise.all(keys.map((day) => database.ref(`analytics/aggregates/movieDaily/${day}/${movieSlug}`).get()))
  const totals: AnalyticsMovieRow = { slug: movieSlug, title: movieSlug, genres: [], ...EMPTY_ANALYTICS_TOTALS }
  const daily = snapshots.map((snapshot, index) => {
    const value = (snapshot.val() || {}) as Partial<AnalyticsMovieRow>
    if (value.title) totals.title = value.title
    if (value.genres?.length) totals.genres = value.genres
    sumTotals(totals, value)
    return { day: keys[index], ...EMPTY_ANALYTICS_TOTALS, ...value }
  })
  return {
    generatedAt: Date.now(), range, movie: {
      ...totals,
      watchHours: Math.round(totals.activeSeconds / 36) / 100,
      completionRate: totals.qualifiedViews ? Math.round(totals.completedViews / totals.qualifiedViews * 1000) / 10 : 0,
    }, daily,
  }
}
