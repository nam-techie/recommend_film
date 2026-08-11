import { describe, expect, it } from 'vitest'
import { builtinPlanCatalogEntry, mergeCatalogEntry, resolveEffectivePlanVersion, type PlanPriceVersion } from '@/lib/monetization'

const version = (id: string, effectiveAt: number, overrides: Partial<PlanPriceVersion> = {}): PlanPriceVersion => ({
  id,
  planId: 'premium',
  monthlyPrice: 49_000,
  annualPrice: 490_000,
  saleEnabled: true,
  effectiveAt,
  status: 'published',
  reason: 'Kiểm thử',
  createdBy: 'admin',
  createdAt: effectiveAt,
  ...overrides,
})

describe('dynamic plan catalog', () => {
  it('resolves the latest effective published version and ignores future/cancelled versions', () => {
    const versions = {
      old: version('old', 100),
      current: version('current', 200),
      future: version('future', 400),
      cancelled: version('cancelled', 250, { status: 'cancelled' }),
    }
    expect(resolveEffectivePlanVersion(versions, 300)?.id).toBe('current')
    expect(resolveEffectivePlanVersion(versions, 500)?.id).toBe('future')
  })

  it('merges dynamic prices and sale state while preserving plan metadata', () => {
    expect(mergeCatalogEntry('premium', version('v2', 200, { monthlyPrice: 45_000, annualPrice: 450_000, saleEnabled: false }))).toMatchObject({
      id: 'premium', name: 'CinePass Plus', versionId: 'v2', monthlyPrice: 45_000, annualPrice: 450_000, saleEnabled: false, source: 'database',
    })
  })

  it('marks Firebase fallback prices as unavailable for sale', () => {
    expect(builtinPlanCatalogEntry('premium', 'fallback_unavailable')).toMatchObject({ versionId: 'builtin-v1', monthlyPrice: 39_000, annualPrice: 390_000, saleEnabled: false, source: 'fallback_unavailable' })
  })
})
