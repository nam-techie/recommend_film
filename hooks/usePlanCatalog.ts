'use client'

import { useMonetization } from '@/components/monetization/MonetizationProvider'

export function usePlanCatalog() {
  const { plans, catalogLoading, catalogError, refreshCatalog } = useMonetization()
  return { plans, loading: catalogLoading, error: catalogError, refresh: refreshCatalog }
}
