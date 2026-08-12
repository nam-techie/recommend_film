import 'server-only'

import { getDatabase } from 'firebase-admin/database'
import { getFirebaseAdminApp } from '@/lib/server/firebase-admin'
import { computeUserFeatures } from '@/lib/server/personalization'
import { vietnamDayKey } from '@/lib/server/analytics'
import type { AnalyticsTotals, PlaybackSessionRecord } from '@/lib/analytics'
import type { AdminSensitiveTimelineItem, AdminUserInsights } from '@/lib/admin-user-insights'

export async function getAdminUserInsights(uid: string, range: '7d' | '30d' | '90d'): Promise<AdminUserInsights> {
  const database = getDatabase(getFirebaseAdminApp())
  const days = Number(range.slice(0, -1))
  const keys = Array.from({ length: days }, (_, index) => vietnamDayKey(Date.now() - index * 86_400_000))
  const [rows, presence, lastSeen, features] = await Promise.all([
    Promise.all(keys.map((day) => database.ref(`analytics/aggregates/userDaily/${uid}/${day}`).get())),
    database.ref(`presenceConnections/${uid}`).get(), database.ref(`presenceLastSeen/${uid}`).get(), computeUserFeatures(uid),
  ])
  const totals: AnalyticsTotals = { qualifiedViews: 0, uniqueViewers: 0, activeSeconds: 0, completedViews: 0, playStarts: 0 }
  rows.forEach((row) => { const value = row.val() || {}; totals.qualifiedViews += Number(value.qualifiedViews) || 0; totals.activeSeconds += Number(value.activeSeconds) || 0; totals.completedViews += Number(value.completedViews) || 0; totals.playStarts += Number(value.playStarts) || 0 })
  const preferredTimeBand = Object.entries(features.preferredTimeBands).sort(([, a], [, b]) => b - a)[0]
  return { uid, online: presence.exists() && Object.keys(presence.val() || {}).length > 0, lastSeen: lastSeen.exists() ? Number(lastSeen.val()) : null, qualifiedViews: totals.qualifiedViews, watchHours: Math.round(totals.activeSeconds / 36) / 100, completionRate: totals.qualifiedViews ? Math.round(totals.completedViews / totals.qualifiedViews * 1000) / 10 : 0, topGenres: Object.entries(features.genreAffinity).sort(([, a], [, b]) => b - a).slice(0, 5).map(([genre, score]) => ({ genre, score })), preferredTimeBand: preferredTimeBand?.[1] ? preferredTimeBand[0] : null, personalizationEnabled: features.enabled, eligibleForPersonalization: features.eligible, range }
}

export async function getAdminSensitiveTimeline(uid: string, days = 90): Promise<AdminSensitiveTimelineItem[]> {
  const snapshot = await getDatabase(getFirebaseAdminApp()).ref('analytics/playbackSessions').orderByChild('uid').equalTo(uid).get()
  const cutoff = Date.now() - Math.min(90, Math.max(1, days)) * 86_400_000
  return Object.values((snapshot.val() || {}) as Record<string, PlaybackSessionRecord>).filter((item) => item.finalized && item.startedAt >= cutoff).sort((a, b) => b.startedAt - a.startedAt).slice(0, 200).map((item) => ({ sessionId: item.id, movieSlug: item.movieSlug, movieTitle: item.movieTitle, episodeName: item.episodeName, startedAt: item.startedAt, endedAt: item.endedAt, activeSeconds: item.activeSeconds, completed: item.completed, source: item.source }))
}
