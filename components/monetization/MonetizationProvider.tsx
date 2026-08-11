'use client'

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import {
  PLAN_CAPABILITIES,
  PLAN_DEFINITIONS,
  type AccountEntitlement,
  type AccountPlan,
  type PlanCapabilities,
  type PlanCatalogEntry,
} from '@/lib/monetization'

const FALLBACK_PLANS = Object.fromEntries((['normal', 'premium', 'ultra'] as AccountPlan[]).map((id) => [id, {
  ...PLAN_DEFINITIONS[id],
  versionId: 'builtin-v1',
  effectiveAt: 0,
  saleEnabled: id === 'normal',
  source: 'fallback_unavailable' as const,
}])) as Record<AccountPlan, PlanCatalogEntry>

export interface MonetizationContextValue {
  plans: Record<AccountPlan, PlanCatalogEntry>
  entitlement: AccountEntitlement | null
  capabilities: PlanCapabilities | null
  catalogLoading: boolean
  entitlementLoading: boolean
  catalogError: string | null
  entitlementError: string | null
  refreshCatalog: () => Promise<void>
  refreshEntitlement: () => Promise<void>
}

const MonetizationContext = createContext<MonetizationContextValue | null>(null)

export function MonetizationProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [plans, setPlans] = useState(FALLBACK_PLANS)
  const [entitlement, setEntitlement] = useState<AccountEntitlement | null>(null)
  const [capabilities, setCapabilities] = useState<PlanCapabilities | null>(null)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [entitlementLoading, setEntitlementLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [entitlementError, setEntitlementError] = useState<string | null>(null)

  const refreshCatalog = useCallback(async () => {
    setCatalogLoading(true)
    try {
      const response = await fetch('/api/plans', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({})) as { plans?: PlanCatalogEntry[]; error?: string }
      if (!response.ok || !payload.plans) throw new Error(payload.error || 'Bảng giá tạm thời không khả dụng.')
      setPlans(Object.fromEntries(payload.plans.map((plan) => [plan.id, plan])) as Record<AccountPlan, PlanCatalogEntry>)
      setCatalogError(payload.plans.some((plan) => plan.source === 'fallback_unavailable') ? 'Đang hiển thị giá dự phòng. Plus và Ultra tạm thời không bán cho tới khi kết nối lại bảng giá.' : null)
    } catch (error) {
      setPlans(FALLBACK_PLANS)
      setCatalogError(error instanceof Error ? error.message : 'Bảng giá tạm thời không khả dụng.')
    } finally {
      setCatalogLoading(false)
    }
  }, [])

  const refreshEntitlement = useCallback(async () => {
    if (!user) {
      setEntitlement(null)
      setCapabilities(null)
      setEntitlementError(null)
      setEntitlementLoading(false)
      return
    }
    setEntitlementLoading(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/me/entitlement', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      const payload = await response.json().catch(() => ({})) as { entitlement?: AccountEntitlement; capabilities?: PlanCapabilities; error?: string }
      if (!response.ok || !payload.entitlement) throw new Error(payload.error || 'Không thể tải thông tin gói.')
      setEntitlement(payload.entitlement)
      setCapabilities(payload.capabilities || PLAN_CAPABILITIES[payload.entitlement.plan])
      setEntitlementError(null)
    } catch (error) {
      setEntitlementError(error instanceof Error ? error.message : 'Không thể tải thông tin gói.')
    } finally {
      setEntitlementLoading(false)
    }
  }, [user])

  useEffect(() => { void refreshCatalog() }, [refreshCatalog])
  useEffect(() => {
    if (!authLoading) void refreshEntitlement()
  }, [authLoading, refreshEntitlement])

  useEffect(() => {
    const refreshVisible = () => {
      if (document.visibilityState !== 'visible') return
      void refreshCatalog()
      if (!authLoading) void refreshEntitlement()
    }
    const onVisibility = () => { if (document.visibilityState === 'visible') refreshVisible() }
    window.addEventListener('focus', refreshVisible)
    document.addEventListener('visibilitychange', onVisibility)
    const interval = window.setInterval(refreshVisible, 30_000)
    return () => {
      window.removeEventListener('focus', refreshVisible)
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(interval)
    }
  }, [authLoading, refreshCatalog, refreshEntitlement])

  const value = useMemo<MonetizationContextValue>(() => ({
    plans,
    entitlement,
    capabilities,
    catalogLoading,
    entitlementLoading: authLoading || entitlementLoading,
    catalogError,
    entitlementError,
    refreshCatalog,
    refreshEntitlement,
  }), [authLoading, capabilities, catalogError, catalogLoading, entitlement, entitlementError, entitlementLoading, plans, refreshCatalog, refreshEntitlement])

  return <MonetizationContext.Provider value={value}>{children}</MonetizationContext.Provider>
}

export function useMonetization() {
  const value = useContext(MonetizationContext)
  if (!value) throw new Error('useMonetization must be used inside MonetizationProvider')
  return value
}
