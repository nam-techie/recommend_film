import { describe, expect, it } from 'vitest'
import { analyticsCompletionRate, applyPlaybackHeartbeat, type PlaybackSessionRecord } from '@/lib/analytics'

function session(patch: Partial<PlaybackSessionRecord> = {}): PlaybackSessionRecord {
  return { id: 's1', uid: 'u1', movieSlug: 'movie', movieTitle: 'Movie', episodeKey: 'ep1', duration: 1000, genres: ['Hành động'], source: 'solo', startedAt: 1000, lastHeartbeatAt: 1000, endedAt: null, lastSequence: 0, lastPosition: 0, activeSeconds: 0, isPlaying: true, visible: true, pictureInPicture: false, qualified: false, completed: false, finalized: false, rollupApplied: false, ...patch }
}

describe('playback analytics heartbeat', () => {
  it('caps wall-clock delta and never derives watch time from a seek jump', () => {
    const result = applyPlaybackHeartbeat(session(), { sequence: 1, position: 900, duration: 1000, isPlaying: true, visible: true, pictureInPicture: false }, 101_000)
    expect(result.accepted).toBe(true)
    expect(result.record.activeSeconds).toBe(20)
    expect(result.record.completed).toBe(true)
  })

  it('does not count paused or hidden playback', () => {
    const paused = applyPlaybackHeartbeat(session({ isPlaying: false }), { sequence: 1, position: 10, duration: 1000, isPlaying: false, visible: true, pictureInPicture: false }, 16_000)
    const hidden = applyPlaybackHeartbeat(session({ visible: false }), { sequence: 1, position: 10, duration: 1000, isPlaying: true, visible: false, pictureInPicture: false }, 16_000)
    expect(paused.record.activeSeconds).toBe(0)
    expect(hidden.record.activeSeconds).toBe(0)
  })

  it('rejects duplicate and out-of-order sequences', () => {
    const current = session({ lastSequence: 4, activeSeconds: 45 })
    expect(applyPlaybackHeartbeat(current, { sequence: 4, position: 90, duration: 1000, isPlaying: true, visible: true, pictureInPicture: false }, 16_000)).toEqual({ accepted: false, record: current })
  })

  it('keeps estimated embed sessions out of qualified and completed metrics', () => {
    const result = applyPlaybackHeartbeat(session({ reliability: 'estimated_embed', source: 'estimated_embed', duration: 40, activeSeconds: 20 }), { sequence: 1, position: 39, duration: 40, isPlaying: true, visible: true, pictureInPicture: false }, 16_000)
    expect(result.record.activeSeconds).toBeGreaterThan(20)
    expect(result.record.qualified).toBe(false)
    expect(result.record.completed).toBe(false)
  })


  it('uses a ten-second qualified threshold for very short content', () => {
    const result = applyPlaybackHeartbeat(session({ duration: 45, activeSeconds: 5 }), { sequence: 1, position: 15, duration: 45, isPlaying: true, visible: true, pictureInPicture: false }, 6_000)
    expect(result.record.qualified).toBe(true)
  })
})

describe('analytics presentation', () => {
  it('computes completion only over qualified views', () => {
    expect(analyticsCompletionRate({ qualifiedViews: 4, completedViews: 3, uniqueViewers: 4, activeSeconds: 0, playStarts: 8 })).toBe(75)
  })
})
