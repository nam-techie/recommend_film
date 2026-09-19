export type PlaybackSource = 'solo' | 'watch_party' | 'estimated_embed'

export type AnalyticsReliability = 'verified' | 'estimated_embed' | 'legacy_resume'
export type AnalyticsCollectionState = 'not_collecting' | 'collecting_no_data' | 'available' | 'delayed_rollup' | 'degraded'

export interface PlaybackGrantDescriptor {
  grantId: string
  expiresAt: number
}

export interface PlaybackSessionStart {
  grantId: string
  clientSessionId: string
  movieSlug: string
  movieTitle: string
  episodeKey: string
  episodeName?: string
  duration: number
  genres?: string[]
  mode?: 'verified' | 'estimated_embed'
}

export interface PlaybackHeartbeat {
  sequence: number
  position: number
  duration: number
  isPlaying: boolean
  visible: boolean
  pictureInPicture: boolean
}

export interface PlaybackSessionRecord extends Omit<PlaybackSessionStart, 'mode' | 'grantId' | 'clientSessionId'> {
  grantId?: string
  clientSessionId?: string
  id: string
  uid: string
  source: PlaybackSource
  roomId?: string
  reliability?: Exclude<AnalyticsReliability, 'legacy_resume'>
  dayKey?: string
  startedAt: number
  lastHeartbeatAt: number
  endedAt: number | null
  lastSequence: number
  lastPosition: number
  activeSeconds: number
  isPlaying: boolean
  visible: boolean
  pictureInPicture: boolean
  qualified: boolean
  completed: boolean
  finalized: boolean
  rollupApplied: boolean
}

export interface AnalyticsTotals {
  qualifiedViews: number
  uniqueViewers: number
  activeSeconds: number
  completedViews: number
  playStarts: number
}

export interface AnalyticsMovieRow extends AnalyticsTotals {
  slug: string
  title: string
  genres: string[]
}

export interface AnalyticsOverview {
  generatedAt: number
  range: '7d' | '30d' | '90d'
  since: number | null
  totals: AnalyticsTotals
  concurrentViewers: number
  onlineNow: number
  interactingNow?: number
  peakOnline: number
  topMovies: AnalyticsMovieRow[]
  topGenres: Array<{ genre: string; qualifiedViews: number; activeSeconds: number }>
}

export interface AnalyticsHealth {
  collectionState: AnalyticsCollectionState
  firstSessionAt: number | null
  lastSessionStartedAt: number | null
  lastSuccessfulStartAt: number | null
  lastSuccessfulHeartbeatAt: number | null
  lastSuccessfulFinalizeAt: number | null
  lastCronAt: number | null
  dirtyDays: number
  openSessions: number
  lastErrorCode: string | null
  lastErrorAt: number | null
}

export const EMPTY_ANALYTICS_TOTALS: AnalyticsTotals = { qualifiedViews: 0, uniqueViewers: 0, activeSeconds: 0, completedViews: 0, playStarts: 0 }

export function analyticsCompletionRate(value: AnalyticsTotals) {
  return value.qualifiedViews ? Math.round(value.completedViews / value.qualifiedViews * 1000) / 10 : 0
}

export function applyPlaybackHeartbeat(current: PlaybackSessionRecord, heartbeat: PlaybackHeartbeat, now: number, capSeconds = 20) {
  const sequence = Math.floor(Number(heartbeat.sequence))
  if (!Number.isFinite(sequence) || sequence <= current.lastSequence || current.finalized) return { accepted: false, record: current }
  const elapsed = Math.max(0, Math.min(capSeconds, (now - current.lastHeartbeatAt) / 1000))
  const activeDelta = current.isPlaying && (current.visible || current.pictureInPicture) ? elapsed : 0
  const activeSeconds = Math.round((current.activeSeconds + activeDelta) * 1000) / 1000
  const duration = Number.isFinite(heartbeat.duration) && heartbeat.duration > 0 ? Math.min(heartbeat.duration, 24 * 60 * 60) : current.duration
  const position = Number.isFinite(heartbeat.position) ? Math.max(0, Math.min(heartbeat.position, duration || heartbeat.position)) : current.lastPosition
  const verified = current.reliability !== 'estimated_embed'
  return { accepted: true, record: {
    ...current, lastSequence: sequence, lastHeartbeatAt: now, lastPosition: position, duration,
    activeSeconds, isPlaying: Boolean(heartbeat.isPlaying), visible: Boolean(heartbeat.visible), pictureInPicture: Boolean(heartbeat.pictureInPicture),
    qualified: verified && activeSeconds >= (duration > 0 && duration < 60 ? 10 : 30),
    completed: verified && duration > 0 && (position / duration >= 0.9 || duration - position <= 120),
  } }
}
