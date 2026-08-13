export interface AdminUserInsights {
  uid: string
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
  source: 'solo' | 'watch_party'
}
