export interface KaraokeQueueItem { id: string; videoId: string; label: string; addedBy: string; requests: string[]; duetMemberId: string | null }
export interface KaraokePerformance {
  performanceId: string; song: KaraokeQueueItem; singerMemberId: string
  state: 'preparing' | 'playing' | 'paused' | 'ended'
  duetMemberId: string | null; requests: string[]
  mics: Record<string, { authorized: boolean; revocationPending: boolean }>
  duetRemovalPending?: boolean; finishPending?: boolean; ownerDeadline?: number | null
  lastReportAt: number; playback: { currentTime: number; isPlaying: boolean; serverUpdatedAt: number }
}
export interface KaraokeRoom {
  id: string; name: string; revision: number; expiresAt: number
  members: Record<string, { memberId: string; displayName: string; connected: boolean; host: boolean }>
  queue: KaraokeQueueItem[]; performance: KaraokePerformance | null
  micBlocked: Record<string, boolean>; banned: Record<string, boolean>
}
export interface KaraokeDiagnostics {
  samples: Array<{ at: number; driftMs: number; reportAgeMs: number; offsetMs: number; rttMs: number; stable: boolean; performanceId: string }>
  buffering: number; reconnects: number; corrections: number; startedAt: number
  ratings: Array<{ performanceId: string; sync: number; voice: number }>
}
export function karaokeTarget(p: KaraokePerformance, now: number, offsetMs: number) {
  return Math.max(0, p.playback.currentTime + (p.playback.isPlaying ? Math.max(0, now - p.playback.serverUpdatedAt) / 1000 : 0) - offsetMs / 1000)
}
