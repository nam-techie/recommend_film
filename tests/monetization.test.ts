import { describe, expect, it } from 'vitest'
import { addBillingCycle, buildDiscountQuote, claimDailyWatchUsage, discountAvailability, normalizeDiscountCode, PLAN_CAPABILITIES, PLAN_DEFINITIONS, resolveEntitlement, type DailyWatchUsageRecord, type DiscountCode } from '@/lib/monetization'

const baseDiscount: DiscountCode = {
  code: 'ULTRA100', percent: 100, targetPlan: 'ultra', billingCycle: 'annual',
  maxRedemptions: 2, redemptionCount: 0, startsAt: 1_700_000_000_000,
  endsAt: 1_800_000_000_000, status: 'active', createdBy: 'admin',
  createdAt: 1_700_000_000_000, updatedAt: 1_700_000_000_000,
}

describe('monetization rules', () => {
  it('exposes the CinePass tier names and room permissions', () => {
    expect(PLAN_DEFINITIONS.normal.name).toBe('CinePass')
    expect(PLAN_DEFINITIONS.premium.name).toBe('CinePass Plus')
    expect(PLAN_DEFINITIONS.ultra.name).toBe('CinePass Ultra')
    expect(PLAN_CAPABILITIES.normal).toMatchObject({ moviesPerDay: 3, episodesPerMoviePerDay: 5, canCreateRoom: false, canChat: false })
    expect(PLAN_CAPABILITIES.premium).toMatchObject({ roomAccessModes: ['link_only'], roomMaxMembers: 8, canUseVoice: false })
    expect(PLAN_CAPABILITIES.ultra).toMatchObject({ roomAccessModes: ['public', 'link_only', 'password'], roomMaxMembers: 50, canUseVoice: true })
  })
  it('normalizes codes and quotes a free Ultra year', () => {
    expect(normalizeDiscountCode(' ultra 100 ')).toBe('ULTRA100')
    expect(buildDiscountQuote(baseDiscount)).toMatchObject({ originalAmount: 690_000, discountAmount: 690_000, finalAmount: 0, canActivateWithoutPayment: true })
  })

  it('calculates a partial Premium discount without activation', () => {
    const quote = buildDiscountQuote({ ...baseDiscount, code: 'PRE50', percent: 50, targetPlan: 'premium', billingCycle: 'monthly' })
    expect(quote).toMatchObject({ originalAmount: 39_000, discountAmount: 19_500, finalAmount: 19_500, canActivateWithoutPayment: false })
  })

  it('quotes against the resolved price and snapshots its version', () => {
    const quote = buildDiscountQuote({ ...baseDiscount, percent: 25, targetPlan: 'premium', billingCycle: 'monthly' }, 48_000, 'premium-v2')
    expect(quote).toMatchObject({ originalAmount: 48_000, discountAmount: 12_000, finalAmount: 36_000, planVersionId: 'premium-v2' })
  })

  it('defaults missing and expired entitlements to Normal', () => {
    expect(resolveEntitlement('existing-production-user', null, 100)).toMatchObject({
      plan: 'normal',
      status: 'active',
      billingCycle: null,
      source: 'default',
    })
    expect(resolveEntitlement('u1', { plan: 'ultra', status: 'active', expiresAt: 99 }, 100)).toMatchObject({ plan: 'normal', status: 'expired' })
  })

  it('keeps an active Premium entitlement', () => {
    expect(resolveEntitlement('u1', { plan: 'premium', status: 'active', startsAt: 20, expiresAt: 200, billingCycle: 'monthly', source: 'discount' }, 100)).toMatchObject({ plan: 'premium', status: 'active', expiresAt: 200 })
  })

  it('keeps cancelled paid entitlements on CinePass without hiding their status', () => {
    expect(resolveEntitlement('u1', { plan: 'premium', status: 'cancelled', startsAt: 20, expiresAt: 200, billingCycle: 'monthly', source: 'admin_gift' }, 100)).toMatchObject({ plan: 'normal', status: 'cancelled' })
  })

  it('allows three movies per day, does not count rewatches, and blocks the fourth movie', () => {
    let record: DailyWatchUsageRecord | null = null
    for (const movieSlug of ['movie-1', 'movie-2', 'movie-3']) {
      const claim = claimDailyWatchUsage(record, { date: '2026-08-10', movieSlug, movieKey: movieSlug, episodeKey: 'ep-1', moviesLimit: 3, episodesLimit: 5, resetsAt: 2_000, now: 1_000 })
      expect(claim.allowed).toBe(true)
      if (claim.allowed) record = claim.record
    }
    const rewatch = claimDailyWatchUsage(record, { date: '2026-08-10', movieSlug: 'movie-1', movieKey: 'movie-1', episodeKey: 'ep-1', moviesLimit: 3, episodesLimit: 5, resetsAt: 2_000, now: 1_001 })
    expect(rewatch).toMatchObject({ allowed: true, usage: { moviesUsed: 3, episodesUsed: 1 } })
    if (rewatch.allowed) record = rewatch.record
    expect(claimDailyWatchUsage(record, { date: '2026-08-10', movieSlug: 'movie-4', movieKey: 'movie-4', episodeKey: 'ep-1', moviesLimit: 3, episodesLimit: 5, resetsAt: 2_000, now: 1_002 })).toMatchObject({ allowed: false, code: 'MOVIE_DAILY_LIMIT', usage: { moviesUsed: 3 } })
  })

  it('allows five logical episodes in a movie and blocks the sixth', () => {
    let record: DailyWatchUsageRecord | null = null
    for (let episode = 1; episode <= 5; episode += 1) {
      const claim = claimDailyWatchUsage(record, { date: '2026-08-10', movieSlug: 'series', movieKey: 'series', episodeKey: `ep-${episode}`, moviesLimit: 3, episodesLimit: 5, resetsAt: 2_000, now: 1_000 + episode })
      expect(claim.allowed).toBe(true)
      if (claim.allowed) record = claim.record
    }
    expect(claimDailyWatchUsage(record, { date: '2026-08-10', movieSlug: 'series', movieKey: 'series', episodeKey: 'ep-6', moviesLimit: 3, episodesLimit: 5, resetsAt: 2_000, now: 2_000 })).toMatchObject({ allowed: false, code: 'EPISODE_DAILY_LIMIT', usage: { episodesUsed: 5 } })
  })

  it('enforces per-user, capacity, schedule and target UID', () => {
    const now = 1_750_000_000_000
    expect(discountAvailability(baseDiscount, 'u1', false, now)).toBeNull()
    expect(discountAvailability(baseDiscount, 'u1', true, now)).toContain('đã sử dụng')
    expect(discountAvailability({ ...baseDiscount, redemptionCount: 2 }, 'u1', false, now)).toContain('hết lượt')
    expect(discountAvailability({ ...baseDiscount, targetUid: 'friend' }, 'u1', false, now)).toContain('không áp dụng')
    expect(discountAvailability({ ...baseDiscount, endsAt: now }, 'u1', false, now)).toContain('hết hạn')
  })

  it('adds monthly and annual billing periods', () => {
    const start = Date.UTC(2026, 0, 15)
    expect(new Date(addBillingCycle(start, 'monthly')).toISOString()).toBe('2026-02-15T00:00:00.000Z')
    expect(new Date(addBillingCycle(start, 'annual')).toISOString()).toBe('2027-01-15T00:00:00.000Z')
    expect(new Date(addBillingCycle(Date.UTC(2026, 0, 31), 'monthly')).toISOString()).toBe('2026-02-28T00:00:00.000Z')
    expect(new Date(addBillingCycle(Date.UTC(2024, 1, 29), 'annual')).toISOString()).toBe('2025-02-28T00:00:00.000Z')
  })
})
