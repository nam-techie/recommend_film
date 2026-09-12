import 'server-only'

import { randomUUID } from 'node:crypto'
import { getDatabase } from 'firebase-admin/database'
import type { DecodedIdToken } from 'firebase-admin/auth'
import { addBillingCycle, resolveEntitlement, type AccountEntitlement, type BillingCycle, type PaidPlan } from '@/lib/monetization'
import {
  entitlementProjection,
  grantRuntimeStatus,
  legacyGrantFromEntitlement,
  nextGrantWindow,
  type EntitlementGrant,
  type EntitlementGrantEvent,
  type EntitlementGrantSource,
  type EntitlementGrantState,
  type EntitlementRestriction,
} from '@/lib/entitlement-grants'
import { getFirebaseAdminApp } from '@/lib/server/firebase-admin'
import { MonetizationError } from '@/lib/server/monetization-error'
import { recordAuditEvent, validateAuditReason } from '@/lib/server/audit'
import { revokeAdminUserSessions } from '@/lib/server/admin-users'

export type EntitlementGrantMutation =
  | { action: 'grant'; plan: PaidPlan; billingCycle: BillingCycle; source?: EntitlementGrantSource; sourceId?: string; campaignId?: string; scheduleAfterExisting?: boolean; reason: string; caseId?: string; expectedRevision?: number; idempotencyKey?: string }
  | { action: 'extend'; grantId: string; billingCycle: BillingCycle; reason: string; caseId?: string; expectedRevision?: number }
  | { action: 'revoke'; grantId: string; reason: string; caseId?: string; expectedRevision?: number }
  | { action: 'restore'; grantId: string; reason: string; caseId?: string; expectedRevision?: number }
  | { action: 'restrict'; reason: string; caseId?: string; expiresAt?: number; expectedRevision?: number }
  | { action: 'unrestrict'; reason: string; caseId?: string; expectedRevision?: number }

const YEAR_MS = 365 * 24 * 60 * 60_000

export function entitlementGrantsV2Enabled() { return process.env.ENTITLEMENT_GRANTS_V2_ENABLED === 'true' }

function emptyState(uid: string, entitlement: AccountEntitlement, now: number): EntitlementGrantState {
  const legacy = legacyGrantFromEntitlement(entitlement, now)
  return { uid, revision: 0, grants: legacy ? { [legacy.id]: legacy } : {}, restriction: null, updatedAt: now }
}

function normalizedState(state: EntitlementGrantState, now: number): EntitlementGrantState {
  return {
    ...state,
    grants: Object.fromEntries(Object.entries(state.grants || {}).map(([id, grant]) => [id, { ...grant, status: grantRuntimeStatus(grant, now), updatedAt: grant.updatedAt || now }])),
    restriction: state.restriction || null,
  }
}

function compareProjection(actual: AccountEntitlement, projected: AccountEntitlement) {
  return {
    matches: actual.plan === projected.plan && actual.expiresAt === projected.expiresAt && actual.status === projected.status,
    actual: { plan: actual.plan, expiresAt: actual.expiresAt, status: actual.status, source: actual.source },
    projected: { plan: projected.plan, expiresAt: projected.expiresAt, status: projected.status, source: projected.source },
    comparedAt: Date.now(),
  }
}
async function legacyEntitlement(uid: string, now: number) {
  const snapshot = await getDatabase(getFirebaseAdminApp()).ref(`monetization/entitlements/${uid}`).get()
  return resolveEntitlement(uid, snapshot.exists() ? snapshot.val() as AccountEntitlement : null, now)
}

async function publishState(state: EntitlementGrantState, event?: EntitlementGrantEvent) {
  const database = getDatabase(getFirebaseAdminApp())
  const now = Date.now()
  const normalized = normalizedState(state, now)
  const updates: Record<string, unknown> = {
    [`entitlementGrantStates/${state.uid}`]: normalized,
    [`entitlementGrants/${state.uid}`]: normalized.grants,
    [`entitlementRestrictions/${state.uid}`]: normalized.restriction,
    ...(entitlementGrantsV2Enabled() ? { [`monetization/entitlements/${state.uid}`]: entitlementProjection(state.uid, normalized, now) } : {}),
  }
  if (event) updates[`entitlementGrantEvents/${state.uid}/${event.id}`] = event
  await database.ref().update(updates)
  return { state: normalized, entitlement: entitlementProjection(state.uid, normalized, now) }
}

export async function getEntitlementGrantState(uid: string) {
  const database = getDatabase(getFirebaseAdminApp())
  const now = Date.now()
  const [stateSnapshot, entitlement] = await Promise.all([
    database.ref(`entitlementGrantStates/${uid}`).get(),
    legacyEntitlement(uid, now),
  ])
  if (stateSnapshot.exists()) {
    const published = await publishState(normalizedState(stateSnapshot.val() as EntitlementGrantState, now))
    return { ...published, shadowComparison: compareProjection(entitlement, published.entitlement) }
  }
  const initial = emptyState(uid, entitlement, now)
  const result = await database.ref(`entitlementGrantStates/${uid}`).transaction((current) => current || initial, undefined, false)
  const state = normalizedState(result.snapshot.val() as EntitlementGrantState, now)
  const legacy = Object.values(state.grants).find((grant) => grant.createdBy === 'migration')
  const published = await publishState(state, result.committed && legacy ? {
    id: randomUUID(), uid, action: 'migrated', grantId: legacy.id, actorUid: 'migration', reason: 'Backfill entitlement snapshot into grant ledger', createdAt: now, after: legacy,
  } : undefined)
  return { ...published, shadowComparison: compareProjection(entitlement, published.entitlement) }
}

export async function mutateEntitlementGrantState(uid: string, input: EntitlementGrantMutation, actor: Pick<DecodedIdToken, 'uid'> | { uid: string }) {
  if (!entitlementGrantsV2Enabled()) throw new MonetizationError('ENTITLEMENT_V2_DISABLED', 'Entitlement Grants V2 đang ở shadow mode; chưa được phép ghi projection.', 503)
  const reason = validateAuditReason(input.reason)
  const database = getDatabase(getFirebaseAdminApp())
  const now = Date.now()
  const current = await getEntitlementGrantState(uid)
  const idempotencyKey = (input as EntitlementGrantMutation & { idempotencyKey?: string }).idempotencyKey?.trim()
  if (idempotencyKey && !/^[a-zA-Z0-9_-]{12,80}$/.test(idempotencyKey)) throw new MonetizationError('INVALID_IDEMPOTENCY_KEY', 'Idempotency key không hợp lệ.', 400)
  const receiptRef = idempotencyKey ? database.ref(`entitlementMutationReceipts/${uid}/${idempotencyKey}`) : null
  if (receiptRef) {
    let previousReceipt: { status?: string } | null = null
    const receipt = await receiptRef.transaction((stored) => {
      if (stored) { previousReceipt = stored as { status?: string }; return }
      return { status: 'processing', action: input.action, actorUid: actor.uid, createdAt: now }
    }, undefined, false)
    if (!receipt.committed) {
      if ((previousReceipt as { status?: string } | null)?.status === 'completed') return { ...(await getEntitlementGrantState(uid)), event: null, idempotentReplay: true, sessionEnforcement: null }
      throw new MonetizationError('ENTITLEMENT_MUTATION_IN_PROGRESS', 'Thao tác cùng idempotency key đang được xử lý.', 409)
    }
  }
  let event: EntitlementGrantEvent | null = null
  let failure: MonetizationError | null = null
  const result = await database.ref(`entitlementGrantStates/${uid}`).transaction((stored: EntitlementGrantState | null) => {
    const state = normalizedState(stored || current.state, now)
    if (typeof input.expectedRevision === 'number' && state.revision !== input.expectedRevision) {
      failure = new MonetizationError('ENTITLEMENT_REVISION_CONFLICT', 'Dữ liệu gói vừa thay đổi. Hãy tải lại trước khi thao tác.', 409, { currentRevision: state.revision })
      return
    }
    const before = JSON.parse(JSON.stringify(state)) as EntitlementGrantState
    const eventId = randomUUID()
    if (input.action === 'grant') {
      const grantId = randomUUID()
      const source = input.source || 'admin'
      const window = input.scheduleAfterExisting ? nextGrantWindow(state.grants, input.billingCycle === 'annual' ? YEAR_MS : addBillingCycle(now, input.billingCycle) - now, now) : { startsAt: now, endsAt: addBillingCycle(now, input.billingCycle) }
      const grant: EntitlementGrant = {
        id: grantId, uid, plan: input.plan, billingCycle: input.billingCycle, source, sourceId: input.sourceId || eventId,
        ...(input.campaignId ? { campaignId: input.campaignId } : {}), startsAt: window.startsAt, endsAt: window.endsAt,
        originalStartsAt: window.startsAt, originalEndsAt: window.endsAt, status: window.startsAt > now ? 'scheduled' : 'active',
        createdAt: now, createdBy: actor.uid, updatedAt: now, ...(input.caseId ? { caseId: input.caseId } : {}),
      }
      state.grants[grantId] = grant
      event = { id: eventId, uid, action: grant.status === 'scheduled' ? 'scheduled' : 'granted', grantId, actorUid: actor.uid, reason, ...(input.caseId ? { caseId: input.caseId } : {}), createdAt: now, before, after: grant }
    } else if (input.action === 'revoke' || input.action === 'restore' || input.action === 'extend') {
      const grant = state.grants[input.grantId]
      if (!grant) { failure = new MonetizationError('GRANT_NOT_FOUND', 'Không tìm thấy grant cần thay đổi.', 404); return }
      if (input.action === 'extend') {
        if (grant.source === 'payment') { failure = new MonetizationError('PAYMENT_GRANT_EXTEND_DENIED', 'Không thể gia hạn grant payment bằng admin entitlement; cần fulfillment hợp lệ.', 409); return }
        const endsAt = addBillingCycle(Math.max(now, grant.endsAt), input.billingCycle)
        state.grants[input.grantId] = { ...grant, billingCycle: input.billingCycle, endsAt, originalEndsAt: endsAt, status: grant.startsAt > now ? 'scheduled' : 'active', updatedAt: now }
      } else if (input.action === 'revoke') {
        if (grant.source === 'payment') { failure = new MonetizationError('PAYMENT_GRANT_REVOKE_DENIED', 'Không thể xóa grant payment khi chưa có refund hoặc chargeback.', 409); return }
        state.grants[input.grantId] = { ...grant, status: 'revoked', revokedAt: now, revokedBy: actor.uid, revokeReason: reason, updatedAt: now, ...(input.caseId ? { caseId: input.caseId } : {}) }
      } else {
        if (grant.originalEndsAt <= now) { failure = new MonetizationError('GRANT_EXPIRED', 'Grant gốc đã hết hạn nên không thể khôi phục.', 409); return }
        state.grants[input.grantId] = { ...grant, status: grant.originalStartsAt > now ? 'scheduled' : 'active', startsAt: grant.originalStartsAt, endsAt: grant.originalEndsAt, revokedAt: undefined, revokedBy: undefined, revokeReason: undefined, updatedAt: now }
      }
      event = { id: eventId, uid, action: input.action === 'revoke' ? 'revoked' : input.action === 'extend' ? 'extended' : 'restored', grantId: grant.id, actorUid: actor.uid, reason, ...(input.caseId ? { caseId: input.caseId } : {}), createdAt: now, before: grant, after: state.grants[input.grantId] }
    } else if (input.action === 'restrict') {
      const restriction: EntitlementRestriction = { active: true, reason, createdAt: now, createdBy: actor.uid, ...(input.caseId ? { caseId: input.caseId } : {}), ...(input.expiresAt && input.expiresAt > now ? { expiresAt: input.expiresAt } : {}) }
      state.restriction = restriction
      event = { id: eventId, uid, action: 'restricted', actorUid: actor.uid, reason, ...(input.caseId ? { caseId: input.caseId } : {}), createdAt: now, before: before.restriction, after: restriction }
    } else {
      const previous = state.restriction
      state.restriction = previous ? { ...previous, active: false, liftedAt: now, liftedBy: actor.uid } : null
      event = { id: eventId, uid, action: 'unrestricted', actorUid: actor.uid, reason, ...(input.caseId ? { caseId: input.caseId } : {}), createdAt: now, before: previous, after: state.restriction }
    }
    state.revision += 1
    state.updatedAt = now
    return state
  }, undefined, false)
  if (!result.committed) {
    if (receiptRef) await receiptRef.remove().catch(() => undefined)
    throw failure || new MonetizationError('ENTITLEMENT_UPDATE_FAILED', 'Không thể cập nhật grant ledger.', 409)
  }
  const committedEvent = event as EntitlementGrantEvent | null
  const published = await publishState(result.snapshot.val() as EntitlementGrantState, committedEvent || undefined)
  if (receiptRef) await receiptRef.set({ status: 'completed', action: input.action, actorUid: actor.uid, revision: published.state.revision, eventId: committedEvent?.id || null, completedAt: Date.now() })
  await recordAuditEvent({
    action: committedEvent?.action === 'restricted' || committedEvent?.action === 'unrestricted' ? 'entitlement_restriction_updated' : 'entitlement_grant_updated',
    status: 'succeeded', actorUid: actor.uid, targetUid: uid, reason, before: committedEvent?.before, after: committedEvent?.after,
  })
  const sessionEnforcement = input.action === 'restrict'
    ? await revokeAdminUserSessions(uid, `${reason} · enforcement entitlement restriction`, actor).catch(() => ({ ok: false as const, disconnectStatus: 'unavailable' as const }))
    : null
  return { ...published, event: committedEvent, sessionEnforcement }
}

export async function grantGithubStarPlus(uid: string, campaignId: string, claimId: string, actorUid: string) {
  const current = await getEntitlementGrantState(uid)
  const existing = Object.values(current.state.grants).find((grant) => grant.source === 'github_star' && grant.campaignId === campaignId)
  if (existing) return { ...current, grant: existing }
  const result = await mutateEntitlementGrantState(uid, {
    action: 'grant', plan: 'premium', billingCycle: 'annual', source: 'github_star', sourceId: claimId, campaignId,
    scheduleAfterExisting: true, reason: `GitHub Star campaign ${campaignId}`, expectedRevision: current.state.revision, idempotencyKey: `github-star-${claimId}`,
  }, { uid: actorUid })
  return { ...result, grant: Object.values(result.state.grants).find((grant) => grant.sourceId === claimId)! }
}
