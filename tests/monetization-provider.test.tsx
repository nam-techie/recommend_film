import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MonetizationProvider, useMonetization } from '@/components/monetization/MonetizationProvider'
import { PLAN_CAPABILITIES, PLAN_DEFINITIONS, type AccountPlan, type PlanCatalogEntry } from '@/lib/monetization'

const auth = vi.hoisted(() => ({
  loading: false,
  user: { uid: 'u1', getIdToken: vi.fn(async () => 'token-u1') },
}))

vi.mock('@/components/auth/AuthProvider', () => ({ useAuth: () => auth }))

const plans = (['normal', 'premium', 'ultra'] as AccountPlan[]).map((id): PlanCatalogEntry => ({
  ...PLAN_DEFINITIONS[id], versionId: `${id}-v1`, effectiveAt: 1, saleEnabled: true, source: 'database',
}))

function Probe() {
  const state = useMonetization()
  return <div>{state.plans.premium.versionId}|{state.entitlement?.plan || 'none'}|{state.catalogLoading ? 'loading' : 'ready'}</div>
}

describe('MonetizationProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('/api/me/entitlement')) return new Response(JSON.stringify({ entitlement: { uid: 'u1', plan: 'premium', billingCycle: 'monthly', status: 'active', startsAt: 1, expiresAt: 9_999_999_999_999, autoRenew: false, source: 'discount', updatedAt: 1 }, capabilities: PLAN_CAPABILITIES.premium, serverNow: 2 }), { status: 200 })
      return new Response(JSON.stringify({ plans }), { status: 200 })
    }))
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('loads shared catalog and entitlement, then refreshes both when the window regains focus', async () => {
    render(<MonetizationProvider><Probe /></MonetizationProvider>)
    await waitFor(() => expect(screen.getByText('premium-v1|premium|ready')).toBeInTheDocument())
    expect(fetch).toHaveBeenCalledTimes(2)
    act(() => { window.dispatchEvent(new Event('focus')) })
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(4))
  })
})
