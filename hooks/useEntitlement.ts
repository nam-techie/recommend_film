'use client'

import { useMonetization } from '@/components/monetization/MonetizationProvider'

export function useEntitlement() {
  const { entitlement, capabilities, entitlementLoading, entitlementError, refreshEntitlement } = useMonetization()
  return { entitlement, capabilities, loading: entitlementLoading, error: entitlementError, refresh: refreshEntitlement }
}
