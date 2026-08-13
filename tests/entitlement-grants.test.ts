import { describe, expect, it } from 'vitest'
import { entitlementProjection, grantRuntimeStatus, nextGrantWindow, type EntitlementGrantState } from '@/lib/entitlement-grants'

const now = Date.UTC(2026, 7, 12)

describe('entitlement grant projection', () => {
  it('keeps Ultra effective while a later Plus grant is scheduled', () => {
    const state: EntitlementGrantState = { uid: 'u1', revision: 2, restriction: null, updatedAt: now, grants: {
      ultra: { id: 'ultra', uid: 'u1', plan: 'ultra', billingCycle: 'annual', source: 'payment', sourceId: 'order-1', startsAt: now - 1_000, endsAt: now + 10_000, originalStartsAt: now - 1_000, originalEndsAt: now + 10_000, status: 'active', createdAt: now, createdBy: 'system', updatedAt: now },
      star: { id: 'star', uid: 'u1', plan: 'premium', billingCycle: 'annual', source: 'github_star', sourceId: 'claim-1', campaignId: 'star-plus-2026', startsAt: now + 10_000, endsAt: now + 20_000, originalStartsAt: now + 10_000, originalEndsAt: now + 20_000, status: 'scheduled', createdAt: now, createdBy: 'admin', updatedAt: now },
    } }
    expect(entitlementProjection('u1', state, now).plan).toBe('ultra')
  })

  it('makes an active restriction override every grant', () => {
    const state: EntitlementGrantState = { uid: 'u1', revision: 1, updatedAt: now, grants: {}, restriction: { active: true, reason: 'fraud case', createdAt: now, createdBy: 'admin' } }
    expect(entitlementProjection('u1', state, now).plan).toBe('normal')
  })

  it('queues a new grant after the latest existing grant', () => {
    const window = nextGrantWindow({ current: { id: 'g', uid: 'u', plan: 'premium', billingCycle: 'annual', source: 'admin', sourceId: 's', startsAt: now, endsAt: now + 1_000, originalStartsAt: now, originalEndsAt: now + 1_000, status: 'active', createdAt: now, createdBy: 'a', updatedAt: now } }, 500, now)
    expect(window).toEqual({ startsAt: now + 1_000, endsAt: now + 1_500 })
    expect(grantRuntimeStatus({ id: 'queued', uid: 'u', plan: 'premium', billingCycle: 'annual', source: 'admin', sourceId: 's2', startsAt: window.startsAt, endsAt: window.endsAt, originalStartsAt: window.startsAt, originalEndsAt: window.endsAt, status: 'scheduled', createdAt: now, createdBy: 'a', updatedAt: now }, now)).toBe('scheduled')
  })
})
