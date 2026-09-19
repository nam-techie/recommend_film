import { getUserOnlinePresence } from '@/lib/server/online-presence'
import 'server-only'

import { getDatabase } from 'firebase-admin/database'
import { getFirebaseAdminApp } from '@/lib/server/firebase-admin'
import { computeUserFeatures } from '@/lib/server/personalization'
import { getAnalyticsHealth, vietnamDayKey } from '@/lib/server/analytics'
import type { AnalyticsTotals, PlaybackSessionRecord } from '@/lib/analytics'
import type { AdminSensitiveTimelineItem, AdminUserInsights, LegacyWatchHistoryItem } from '@/lib/admin-user-insights'
import type { WatchProgressMovieV2 } from '@/lib/watch-party-types'

function database() { return getDatabase(getFirebaseAdminApp()) }

export async function getUserAnalyticsSummary(uid: string, range: '7d' | '30d' | '90d') {
  const days = Number(range.slice(0, -1))
  const keys = Array.from({ length: days }, (_, index) => vietnamDayKey(Date.now() - index * 86_400_000))
  const [rows, health] = await Promise.all([Promise.all(keys.map((day) => database().ref(`analytics/aggregates/userDaily/${uid}/${day}`).get())), getAnalyticsHealth()])
  const totals: AnalyticsTotals = { qualifiedViews: 0, uniqueViewers: 0, activeSeconds: 0, completedViews: 0, playStarts: 0 }
  rows.forEach((row) => { const value = row.val() || {}; totals.qualifiedViews += Number(value.qualifiedViews) || 0; totals.activeSeconds += Number(value.activeSeconds) || 0; totals.completedViews += Number(value.completedViews) || 0; totals.playStarts += Number(value.playStarts) || 0 })
  return { range, qualifiedViews: totals.qualifiedViews, watchHours: Math.round(totals.activeSeconds / 36) / 100, completionRate: totals.qualifiedViews ? Math.round(totals.completedViews / totals.qualifiedViews * 1000) / 10 : 0, collectionState: health.collectionState, collectionStartedAt: health.firstSessionAt }
}

export async function getAdminUserInsights(uid: string, range: '7d' | '30d' | '90d'): Promise<AdminUserInsights> {
  const summary = await getUserAnalyticsSummary(uid, range)
  const [presence, features] = await Promise.all([getUserOnlinePresence(uid), computeUserFeatures(uid)])
  const preferredTimeBand = Object.entries(features.preferredTimeBands).sort(([, a], [, b]) => b - a)[0]
  return { uid, presence, online: presence.online, lastSeen: presence.lastSeen, qualifiedViews: summary.qualifiedViews, watchHours: summary.watchHours, completionRate: summary.completionRate, topGenres: Object.entries(features.genreAffinity).sort(([, a], [, b]) => b - a).slice(0, 5).map(([genre, score]) => ({ genre, score })), preferredTimeBand: preferredTimeBand?.[1] ? preferredTimeBand[0] : null, personalizationEnabled: features.enabled, eligibleForPersonalization: features.eligible, range, collectionState: summary.collectionState, collectionStartedAt: summary.collectionStartedAt }
}

export async function getAdminSensitiveTimeline(uid: string, days = 90): Promise<AdminSensitiveTimelineItem[]> {
  const snapshot = await database().ref('analytics/playbackSessions').orderByChild('uid').equalTo(uid).get()
  const cutoff = Date.now() - Math.min(90, Math.max(1, days)) * 86_400_000
  return Object.values((snapshot.val() || {}) as Record<string, PlaybackSessionRecord>).filter((item) => item.finalized && item.startedAt >= cutoff).sort((a, b) => b.startedAt - a.startedAt).slice(0, 200).map((item) => ({ sessionId: item.id, movieSlug: item.movieSlug, movieTitle: item.movieTitle, episodeName: item.episodeName, startedAt: item.startedAt, endedAt: item.endedAt, activeSeconds: item.activeSeconds, completed: item.completed, source: item.source, reliability: item.reliability || 'verified' }))
}

export async function getLegacyWatchHistory(uid: string, days = 90): Promise<LegacyWatchHistoryItem[]> {
  const snapshot = await database().ref(`users/${uid}/watchProgressV2`).get()
  const cutoff = Date.now() - Math.min(90, Math.max(1, days)) * 86_400_000
  return Object.entries((snapshot.val() || {}) as Record<string, WatchProgressMovieV2>).flatMap(([movieSlug, movie]) => Object.values(movie.episodes || {})).filter((item) => Number(item.updatedAt) >= cutoff).sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt)).slice(0, 200).map((item) => ({ movieSlug: item.movieSlug || '', movieTitle: item.movieTitle || item.movieSlug || 'Phim chua r�', poster: item.poster, episodeId: item.episodeId, episodeName: item.episodeName, currentTime: Number(item.currentTime) || 0, duration: Number(item.duration) || 0, percentage: Number(item.percentage) || 0, clientEstimatedSeconds: Number(item.secondsWatched) || 0, updatedAt: Number(item.updatedAt) || 0, source: item.source === 'watch_party' ? 'watch_party' : 'solo' }))
}
