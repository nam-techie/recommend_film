import type { OnlinePresence } from '@/lib/online-presence'
import type { AnalyticsCollectionState, AnalyticsReliability } from '@/lib/analytics'

export interface AdminUserInsights {
  uid: string
  presence: OnlinePresence
  online: boolean
  lastSeen: number | null
  qualifiedViews: number
  watchHours: number
  completionRate: number
  topGenres: Array<{ genre: string; score: number }>
  preferredTimeBand: string | null
  personalizationEnabled: boolean
  eligibleForPersonalization: boolean
  range: '7d' | '30d' | '90d'
  collectionState: AnalyticsCollectionState
  collectionStartedAt: number | null
}

export interface AdminSensitiveTimelineItem {
  sessionId: string
  movieSlug: string
  movieTitle: string
  episodeName?: string
  startedAt: number
  endedAt: number | null
  activeSeconds: number
  completed: boolean
  source: 'solo' | 'watch_party' | 'estimated_embed'
  reliability: Exclude<AnalyticsReliability, 'legacy_resume'>
}

export interface LegacyWatchHistoryItem {
  movieSlug: string
  movieTitle: string
  poster?: string
  episodeId: string
  episodeName: string
  currentTime: number
  duration: number
  percentage: number
  clientEstimatedSeconds: number
  updatedAt: number
  source: 'solo' | 'watch_party'
}
