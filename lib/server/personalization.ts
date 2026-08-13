import 'server-only'

import { randomUUID } from 'crypto'
import { getDatabase } from 'firebase-admin/database'
import { getFirebaseAdminApp } from '@/lib/server/firebase-admin'
import { fetchFeaturedMovies, type Movie } from '@/lib/api'
import { getPublicHomeContent } from '@/lib/server/content'
import type { PlaybackSessionRecord } from '@/lib/analytics'
import type { PersonalizedRecommendation, RecommendationEventInput, RecommendationEventType, RecommendationReasonCode, UserPersonalizationFeatures } from '@/lib/personalization'

const WINDOW_MS = 180 * 86_400_000

function timeBand(timestamp: number): keyof UserPersonalizationFeatures['preferredTimeBands'] {
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hourCycle: 'h23' }).format(timestamp))
  return hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
}

export async function computeUserFeatures(uid: string): Promise<UserPersonalizationFeatures> {
  const database = getDatabase(getFirebaseAdminApp())
  const sessionsRef = database.ref('analytics/playbackSessions')
  const sessionsPromise = sessionsRef.orderByChild('uid').equalTo(uid).get().catch(async (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    if (!message.toLowerCase().includes('index not defined')) throw error
    return sessionsRef.get()
  })
  const [sessionsSnapshot, settingsSnapshot] = await Promise.all([
    sessionsPromise,
    database.ref(`users/${uid}/settings/personalizationEnabled`).get(),
  ])
  const enabled = settingsSnapshot.exists() ? settingsSnapshot.val() !== false : true
  const sessions = Object.values((sessionsSnapshot.val() || {}) as Record<string, PlaybackSessionRecord>).filter((session) => session.uid === uid && session.finalized && session.qualified && session.startedAt >= Date.now() - WINDOW_MS)
  const genreAffinity: Record<string, number> = {}
  const bands = { morning: 0, afternoon: 0, evening: 0, night: 0 }
  let activeSeconds = 0; let completed = 0
  const titles = new Set<string>()
  sessions.forEach((session) => {
    activeSeconds += session.activeSeconds; completed += session.completed ? 1 : 0; titles.add(session.movieSlug); bands[timeBand(session.startedAt)] += session.activeSeconds
    const weight = session.activeSeconds * (session.completed ? 1.25 : 1);
    (session.genres || []).forEach((genre: string) => { genreAffinity[genre] = (genreAffinity[genre] || 0) + weight })
  })
  const maximum = Math.max(...Object.values(genreAffinity), 1)
  Object.keys(genreAffinity).forEach((genre) => { genreAffinity[genre] = Math.round(genreAffinity[genre] / maximum * 1000) / 1000 })
  const features: UserPersonalizationFeatures = { uid, enabled, eligible: enabled && titles.size >= 3 && activeSeconds >= 3600, qualifiedTitles: titles.size, activeSeconds: Math.round(activeSeconds), genreAffinity, completionRate: sessions.length ? completed / sessions.length : 0, preferredTimeBands: bands, computedAt: Date.now(), windowDays: 180 }
  await database.ref(`personalization/userFeatures/${uid}`).set(features)
  return features
}

function snapshotToMovie(value: Awaited<ReturnType<typeof getPublicHomeContent>>['collections'][number]['movies'][number]): Movie {
  return { _id: value.providerId || value.slug, name: value.title, slug: value.slug, origin_name: value.originalTitle, type: 'series', poster_url: value.poster, thumb_url: value.thumbnail, is_copyright: false, sub_docquyen: false, chieurap: false, time: '', episode_current: value.episodeLabel, quality: '', lang: '', year: value.year || 0, category: value.genres.map((name) => ({ id: name, name, slug: name.toLowerCase().replace(/\s+/g, '-') })), country: [] }
}

export async function getPersonalizedRecommendations(uid: string, limit = 12) {
  const [features, editorial, fallback] = await Promise.all([computeUserFeatures(uid), getPublicHomeContent(), fetchFeaturedMovies(1).catch(() => ({ items: [] }))])
  const editorialMovies = editorial.collections.flatMap((collection) => collection.movies.map(snapshotToMovie))
  const candidates = [...new Map([...editorialMovies, ...(fallback.items || [])].map((movie) => [movie.slug, movie])).values()]
  const ranked: PersonalizedRecommendation[] = candidates.map((movie, index) => {
    const genres = movie.category?.map((item) => item.name) || []
    const affinity = genres.reduce((total, genre) => total + (features.genreAffinity[genre] || 0), 0) / Math.max(genres.length, 1)
    const editorialScore = editorialMovies.some((item) => item.slug === movie.slug) ? 1 : 0
    const freshness = movie.year ? Math.max(0, Math.min(1, (movie.year - 2018) / 8)) : 0.25
    const popularity = Math.max(0, 1 - index / Math.max(candidates.length, 1))
    const personalized = features.eligible ? affinity * 0.6 + freshness * 0.15 + editorialScore * 0.15 + popularity * 0.1 : editorialScore * 0.7 + popularity * 0.3
    const reasonCode: RecommendationReasonCode = features.eligible && affinity > 0 ? 'because_genre_affinity' : editorialScore ? 'editorial_pick' : 'trending_fallback'
    return { movie, score: Math.round(personalized * 1000) / 1000, reasonCode, reason: reasonCode === 'because_genre_affinity' ? `Vì bạn thường xem ${genres.find((genre) => features.genreAffinity[genre]) || 'thể loại tương tự'}` : reasonCode === 'editorial_pick' ? 'Lựa chọn từ biên tập CineMind' : 'Đang được quan tâm', exploration: false }
  }).sort((a, b) => b.score - a.score)
  const explorationCount = features.eligible ? Math.max(1, Math.round(limit * 0.2)) : 0
  const selected = ranked.slice(0, Math.max(0, limit - explorationCount))
  const used = new Set(selected.map((item) => item.movie.slug))
  const exploration = ranked.filter((item) => !used.has(item.movie.slug) && item.reasonCode !== 'because_genre_affinity').slice(0, explorationCount).map((item) => ({ ...item, exploration: true }))
  return { features, items: [...selected, ...exploration].slice(0, limit) }
}

export async function resetPersonalization(uid: string, enabled: boolean) {
  const database = getDatabase(getFirebaseAdminApp())
  await database.ref().update({ [`users/${uid}/settings/personalizationEnabled`]: enabled, [`personalization/userFeatures/${uid}`]: null })
  return { enabled, resetAt: Date.now() }
}

export async function recordRecommendationEvents(uid: string, inputs: RecommendationEventInput[]) {
  const database = getDatabase(getFirebaseAdminApp())
  const allowedTypes = new Set<RecommendationEventType>(['impression', 'click', 'qualified_play', 'completion', 'dismiss'])
  const allowedReasons = new Set<RecommendationReasonCode>(['because_genre_affinity', 'because_completed_similar', 'because_watchlist', 'trending_fallback', 'editorial_pick'])
  const now = Date.now()
  const updates: Record<string, unknown> = {}
  inputs.slice(0, 24).forEach((input) => {
    if (!allowedTypes.has(input.type) || !allowedReasons.has(input.reasonCode)) return
    const movieSlug = input.movieSlug.trim().replace(/[.#$\[\]/]/g, '-').slice(0, 160)
    if (!movieSlug) return
    const id = randomUUID()
    updates[`personalization/recommendationEvents/${uid}/${id}`] = { id, uid, type: input.type, movieSlug, reasonCode: input.reasonCode, createdAt: now }
  })
  if (Object.keys(updates).length) await database.ref().update(updates)
  return { accepted: Object.keys(updates).length }
}
