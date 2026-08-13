import type { AccountEntitlement, AccountPlan, BillingCycle } from '@/lib/monetization'
import { PLAN_RANK } from '@/lib/monetization'

export type EntitlementGrantSource = 'legacy' | 'payment' | 'discount' | 'github_star' | 'admin'
export type EntitlementGrantStatus = 'pending' | 'scheduled' | 'active' | 'revoked' | 'expired'

export interface EntitlementGrant {
  id: string
  uid: string
  plan: Exclude<AccountPlan, 'normal'>
  billingCycle: BillingCycle
  source: EntitlementGrantSource
  sourceId: string
  campaignId?: string
  startsAt: number
  endsAt: number
  originalStartsAt: number
  originalEndsAt: number
  status: EntitlementGrantStatus
  createdAt: number
  createdBy: string
  updatedAt: number
  revokedAt?: number
  revokedBy?: string
  revokeReason?: string
  caseId?: string
}

export interface EntitlementRestriction {
  active: boolean
  reason: string
  caseId?: string
  createdAt: number
  createdBy: string
  expiresAt?: number
  liftedAt?: number
  liftedBy?: string
}

export interface EntitlementGrantEvent {
  id: string
  uid: string
  action: 'migrated' | 'granted' | 'scheduled' | 'extended' | 'revoked' | 'restored' | 'restricted' | 'unrestricted'
  grantId?: string
  actorUid: string
  reason: string
  caseId?: string
  createdAt: number
  before?: unknown
  after?: unknown
}

export interface EntitlementGrantState {
  uid: string
  revision: number
  grants: Record<string, EntitlementGrant>
  restriction: EntitlementRestriction | null
  updatedAt: number
}

export function grantRuntimeStatus(grant: EntitlementGrant, now = Date.now()): EntitlementGrantStatus {
  if (grant.status === 'revoked') return 'revoked'
  if (grant.endsAt <= now) return 'expired'
  if (grant.startsAt > now) return 'scheduled'
  return 'active'
}

export function activeRestriction(restriction: EntitlementRestriction | null | undefined, now = Date.now()) {
  return Boolean(restriction?.active && (!restriction.expiresAt || restriction.expiresAt > now))
}

export function effectiveGrant(state: Pick<EntitlementGrantState, 'grants' | 'restriction'>, now = Date.now()) {
  if (activeRestriction(state.restriction, now)) return null
  return Object.values(state.grants || {})
    .filter((grant) => grantRuntimeStatus(grant, now) === 'active')
    .sort((left, right) => PLAN_RANK[right.plan] - PLAN_RANK[left.plan] || right.endsAt - left.endsAt || right.createdAt - left.createdAt)[0] || null
}

export function entitlementProjection(uid: string, state: Pick<EntitlementGrantState, 'grants' | 'restriction'>, now = Date.now()): AccountEntitlement {
  const grant = effectiveGrant(state, now)
  if (!grant) return { uid, plan: 'normal', billingCycle: null, status: 'active', startsAt: null, expiresAt: null, autoRenew: false, source: 'default', updatedAt: now }
  const source: AccountEntitlement['source'] = grant.source === 'payment' ? 'payment' : grant.source === 'discount' ? 'discount' : grant.source === 'github_star' ? 'github_star' : 'admin_gift'
  return { uid, plan: grant.plan, billingCycle: grant.billingCycle, status: 'active', startsAt: grant.startsAt, expiresAt: grant.endsAt, autoRenew: false, source, sourceId: grant.id, updatedAt: now }
}

export function legacyGrantFromEntitlement(entitlement: AccountEntitlement, now = Date.now()): EntitlementGrant | null {
  if (entitlement.plan === 'normal' || !entitlement.expiresAt || entitlement.expiresAt <= now) return null
  const source: EntitlementGrantSource = entitlement.source === 'payment' ? 'payment' : entitlement.source === 'discount' ? 'discount' : 'legacy'
  const startsAt = entitlement.startsAt || now
  return {
    id: `legacy_${entitlement.sourceId || entitlement.updatedAt || now}`,
    uid: entitlement.uid,
    plan: entitlement.plan,
    billingCycle: entitlement.billingCycle || 'monthly',
    source,
    sourceId: entitlement.sourceId || 'legacy-entitlement',
    startsAt,
    endsAt: entitlement.expiresAt,
    originalStartsAt: startsAt,
    originalEndsAt: entitlement.expiresAt,
    status: startsAt > now ? 'scheduled' : 'active',
    createdAt: entitlement.updatedAt || now,
    createdBy: 'migration',
    updatedAt: now,
  }
}

export function nextGrantWindow(grants: Record<string, EntitlementGrant>, durationMs: number, now = Date.now()) {
  const furthestEnd = Object.values(grants || {})
    .filter((grant) => grant.status !== 'revoked' && grant.endsAt > now)
    .reduce((value, grant) => Math.max(value, grant.endsAt), now)
  return { startsAt: furthestEnd, endsAt: furthestEnd + durationMs }
}
