import { beforeEach, describe, expect, it, vi } from 'vitest'

const database = vi.hoisted(() => {
  const records = new Map<string, unknown>()
  const assertSerializable = (value: unknown, path: string) => {
    if (value === undefined) throw new Error(`Data contains undefined in property '${path}'`)
    if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => assertSerializable(item, `${path}.${key}`))
  }
  const snapshot = (value: unknown) => ({ val: () => value ?? null, exists: () => value != null })
  const ref = (path: string) => ({
    get: async () => snapshot(records.get(path)),
    set: async (value: unknown) => { assertSerializable(value, path); records.set(path, structuredClone(value)) },
    update: async (value: Record<string, unknown>) => { assertSerializable(value, path); records.set(path, { ...records.get(path) as object, ...structuredClone(value) }) },
    transaction: async (updater: (current: unknown) => unknown) => {
      const current = records.get(path) ?? null
      const next = updater(current === null ? null : structuredClone(current))
      if (next === undefined) return { committed: false, snapshot: snapshot(current) }
      assertSerializable(next, path)
      records.set(path, structuredClone(next))
      return { committed: true, snapshot: snapshot(next) }
    },
  })
  return { records, ref }
})

vi.mock('server-only', () => ({}))
vi.mock('firebase-admin/database', () => ({ getDatabase: () => database }))
vi.mock('@/lib/server/firebase-admin', () => ({ getFirebaseAdminApp: () => ({}) }))
vi.mock('@/lib/server/plan-catalog', () => ({ getPaidPlanPrice: vi.fn() }))
vi.mock('@/lib/server/audit', () => ({ createPendingAudit: vi.fn(), finishAudit: vi.fn(), validateAuditReason: vi.fn() }))
vi.mock('@/lib/server/operational-delivery', () => ({ queueUserOperationalDelivery: vi.fn() }))
vi.mock('@/lib/server/affiliate', () => ({ assignAffiliateForWatch: vi.fn(async (_uid, _plan, _movie, _episode, requestId) => ({ id: requestId, affiliate: null })) }))

import { claimWatchAccess } from '@/lib/server/monetization'
import { issuePlaybackGrant, startPlaybackSession } from '@/lib/server/analytics'

function setPlan(plan: 'normal' | 'premium' | 'ultra', expiresAt = Date.now() + 86_400_000) {
  database.records.set('monetization/entitlements/viewer', { uid: 'viewer', plan, status: 'active', expiresAt, startsAt: Date.now() - 1000, source: 'payment', billingCycle: 'monthly', autoRenew: false, updatedAt: Date.now() })
}

describe('watch access and playback grants', () => {
  beforeEach(() => { database.records.clear() })

  it.each(['normal', 'premium', 'ultra'] as const)('%s can open a solo movie and start playback without a room', async plan => {
    setPlan(plan)
    const access = await claimWatchAccess('viewer', 'van-gioi-doc-ton', 'tap-1', `request-${plan}`)
    expect(access).toMatchObject({ allowed: true, plan, playbackGrant: { grantId: `request-${plan}` } })
    expect(access.usage).toEqual(plan === 'normal' ? expect.objectContaining({ moviesUsed: 1, moviesLimit: 3, episodesUsed: 1, episodesLimit: 5 }) : null)
    expect(database.records.get(`analytics/playbackGrants/${access.playbackGrant.grantId}`)).not.toHaveProperty('roomId')
    const started = await startPlaybackSession('viewer', { movieSlug: 'van-gioi-doc-ton', episodeKey: 'tap-1', grantId: access.playbackGrant.grantId, clientSessionId: `client-${plan}`, movieTitle: 'Vạn Giới Độc Tôn', duration: 600, mode: 'verified' })
    expect(database.records.get(`analytics/playbackSessions/${started.sessionId}`)).toMatchObject({ uid: 'viewer', source: 'solo', reliability: 'verified' })
    expect(database.records.get(`analytics/playbackSessions/${started.sessionId}`)).not.toHaveProperty('roomId')
  })

  it('preserves the room ID for watch-party grants and playback sessions', async () => {
    setPlan('ultra')
    const access = await claimWatchAccess('viewer', 'movie', 'tap-1', 'request-room', 'watch_party', 'room-1')
    const started = await startPlaybackSession('viewer', { movieSlug: 'movie', episodeKey: 'tap-1', grantId: access.playbackGrant.grantId, clientSessionId: 'client-room', movieTitle: 'Movie', duration: 600, mode: 'verified' })
    expect(database.records.get(`analytics/playbackSessions/${started.sessionId}`)).toMatchObject({ roomId: 'room-1', source: 'watch_party' })
  })

  it('also accepts a previously issued solo grant without roomId', async () => {
    database.records.set('analytics/playbackGrants/existing-grant', { id: 'existing-grant', uid: 'viewer', movieSlug: 'movie', episodeKey: 'tap-1', source: 'solo', issuedAt: Date.now(), expiresAt: Date.now() + 60_000 })
    await expect(startPlaybackSession('viewer', { movieSlug: 'movie', episodeKey: 'tap-1', grantId: 'existing-grant', clientSessionId: 'client-existing', movieTitle: 'Movie', duration: 0, mode: 'estimated_embed' })).resolves.toMatchObject({ reliability: 'estimated_embed' })
  })

  it('keeps the free tier at three movies and rejects a fourth before issuing a grant', async () => {
    setPlan('normal')
    for (let i = 1; i <= 3; i++) await claimWatchAccess('viewer', `movie-${i}`, 'tap-1', `request-movie-${i}`)
    await expect(claimWatchAccess('viewer', 'movie-4', 'tap-1', 'request-movie-4')).rejects.toMatchObject({ code: 'MOVIE_DAILY_LIMIT', status: 403 })
    expect(database.records.has('analytics/playbackGrants/request-movie-4')).toBe(false)
  })

  it('keeps the free tier at five episodes and allows rewatching the same episode', async () => {
    setPlan('normal')
    for (let i = 1; i <= 5; i++) await claimWatchAccess('viewer', 'series', `tap-${i}`, `request-episode-${i}`)
    await expect(claimWatchAccess('viewer', 'series', 'tap-6', 'request-episode-6')).rejects.toMatchObject({ code: 'EPISODE_DAILY_LIMIT' })
    await expect(claimWatchAccess('viewer', 'series', 'tap-1', 'request-rewatch')).resolves.toMatchObject({ allowed: true, usage: { moviesUsed: 1, episodesUsed: 5 } })
  })

  it.each(['premium', 'ultra'] as const)('%s stays unlimited beyond both free quotas', async plan => {
    setPlan(plan)
    for (let i = 1; i <= 6; i++) {
      await expect(claimWatchAccess('viewer', 'series', `tap-${i}`, `request-series-${i}`)).resolves.toMatchObject({ allowed: true, usage: null, plan })
      await expect(claimWatchAccess('viewer', `movie-${i}`, 'tap-1', `request-film-${i}`)).resolves.toMatchObject({ allowed: true, usage: null, plan })
    }
    expect([...database.records.keys()].some(key => key.includes('dailyWatchUsage'))).toBe(false)
  })

  it('resolves an expired Ultra membership to the free tier', async () => {
    setPlan('ultra', Date.now() - 1)
    await expect(claimWatchAccess('viewer', 'movie', 'tap-1', 'request-expired')).resolves.toMatchObject({ allowed: true, plan: 'normal', usage: { moviesLimit: 3 } })
  })

  it('still rejects playback grants belonging to another user or episode', async () => {
    const grant = await issuePlaybackGrant('viewer', { movieSlug: 'movie', episodeKey: 'tap-1', source: 'solo', grantId: 'request-owner' })
    const input = { movieSlug: 'movie', episodeKey: 'tap-1', grantId: grant.grantId, clientSessionId: 'client-owner', movieTitle: 'Movie', duration: 0 }
    await expect(startPlaybackSession('other', input)).rejects.toMatchObject({ code: 'PLAYBACK_GRANT_NOT_FOUND' })
    await expect(startPlaybackSession('viewer', { ...input, episodeKey: 'tap-2' })).rejects.toMatchObject({ code: 'PLAYBACK_GRANT_TARGET_MISMATCH' })
  })
})
