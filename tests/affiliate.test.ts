import { describe, expect, it } from 'vitest'
import { affiliateLinkIsEligible, shouldShowAffiliate, validateShopeeAffiliateUrl, weightedAffiliatePick, type AffiliateLink } from '@/lib/affiliate'

const link = (overrides: Partial<AffiliateLink> = {}): AffiliateLink => ({
  id: 'link-1', campaignName: 'Campaign', productTitle: 'Product', destinationUrl: 'https://shopee.vn/product/1',
  ctaLabel: 'Xem ưu đãi', weight: 1, status: 'active', startsAt: 100, endsAt: 300,
  createdBy: 'admin', createdAt: 100, updatedAt: 100, ...overrides,
})

describe('Shopee affiliate rules', () => {
  it('only accepts HTTPS Shopee hosts without credentials or ports', () => {
    expect(validateShopeeAffiliateUrl('https://shopee.vn/product/1')).toBe(true)
    expect(validateShopeeAffiliateUrl('https://affiliate.shopee.vn/offer')).toBe(true)
    expect(validateShopeeAffiliateUrl('http://shopee.vn/product/1')).toBe(false)
    expect(validateShopeeAffiliateUrl('https://shopee.vn.evil.com/product/1')).toBe(false)
    expect(validateShopeeAffiliateUrl('https://user:pass@shopee.vn/product/1')).toBe(false)
    expect(validateShopeeAffiliateUrl('https://127.0.0.1/product/1')).toBe(false)
    expect(validateShopeeAffiliateUrl('https://localhost/product/1')).toBe(false)
  })

  it('filters links by active status and schedule', () => {
    expect(affiliateLinkIsEligible(link(), 200)).toBe(true)
    expect(affiliateLinkIsEligible(link({ status: 'paused' }), 200)).toBe(false)
    expect(affiliateLinkIsEligible(link({ startsAt: 201 }), 200)).toBe(false)
    expect(affiliateLinkIsEligible(link({ endsAt: 200 }), 200)).toBe(false)
  })

  it('supports deterministic weighted selection through injected RNG', () => {
    const pool = [link({ id: 'a', weight: 1 }), link({ id: 'b', weight: 3 })]
    expect(weightedAffiliatePick(pool, () => 0)?.id).toBe('a')
    expect(weightedAffiliatePick(pool, () => 0.26)?.id).toBe('b')
    expect(weightedAffiliatePick([], () => 0)).toBeNull()
  })

  it('uses the expected CinePass, Plus and Ultra cadence', () => {
    expect(shouldShowAffiliate('normal', 1)).toBe(true)
    expect([1, 2, 3, 4, 5, 6, 9].map((count) => shouldShowAffiliate('premium', count))).toEqual([false, false, true, false, false, true, true])
    expect(shouldShowAffiliate('ultra', 3)).toBe(false)
  })
})
