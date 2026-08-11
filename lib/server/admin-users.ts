import 'server-only'

import { getAuth, type DecodedIdToken, type UserRecord } from 'firebase-admin/auth'
import { getDatabase } from 'firebase-admin/database'
import type { AdminUserSummary, EntitlementAdminAction } from '@/lib/admin-users'
import { parseAdminUidAllowlist } from '@/lib/admin-access'
import { addBillingCycle, resolveEntitlement, type AccountEntitlement } from '@/lib/monetization'
import { createPendingAudit, finishAudit, validateAuditReason, type MonetizationAuditLog } from '@/lib/server/audit'
import { getFirebaseAdminApp } from '@/lib/server/firebase-admin'
import { MonetizationError } from '@/lib/server/monetization-error'

type PublicProfileAdmin = { username?: string; displayName?: string; avatar?: string }

function authService() { return getAuth(getFirebaseAdminApp()) }
function database() { return getDatabase(getFirebaseAdminApp()) }

function parseDate(value?: string) {
  if (!value) return null
  const result = Date.parse(value)
  return Number.isFinite(result) ? result : null
}

function protectedAdmin(user: UserRecord) {
  return user.customClaims?.admin === true || parseAdminUidAllowlist(process.env.ADMIN_FIREBASE_UIDS).includes(user.uid)
}

function serializeUser(user: UserRecord, profile: PublicProfileAdmin | null, storedEntitlement: AccountEntitlement | null): AdminUserSummary {
  return {
    uid: user.uid,
    email: user.email || null,
    displayName: profile?.displayName || user.displayName || null,
    photoURL: profile?.avatar || user.photoURL || null,
    providers: user.providerData.map((provider) => provider.providerId),
    emailVerified: user.emailVerified,
    disabled: user.disabled,
    createdAt: parseDate(user.metadata.creationTime),
    lastSignInAt: parseDate(user.metadata.lastSignInTime),
    ...(profile?.username ? { username: profile.username } : {}),
    entitlement: resolveEntitlement(user.uid, storedEntitlement),
    protectedAdmin: protectedAdmin(user),
  }
}

async function joinUsers(users: UserRecord[]) {
  const root = database()
  const [profilesSnapshot, entitlementsSnapshot] = await Promise.all([
    root.ref('publicProfiles').get(),
    root.ref('monetization/entitlements').get(),
  ])
  const profiles = (profilesSnapshot.val() || {}) as Record<string, PublicProfileAdmin>
  const entitlements = (entitlementsSnapshot.val() || {}) as Record<string, AccountEntitlement>
  return users.map((user) => serializeUser(user, profiles[user.uid] || null, entitlements[user.uid] || null))
}

export async function listAdminUsers(limitValue = 50, cursor?: string) {
  const limit = Math.max(1, Math.min(100, Number(limitValue) || 50))
  const result = await authService().listUsers(limit, cursor || undefined)
  return { users: await joinUsers(result.users), nextCursor: result.pageToken || null }
}

export async function lookupAdminUser(queryValue: string) {
  const query = queryValue.trim()
  if (!query || query.length > 320) throw new MonetizationError('INVALID_QUERY', 'Hãy nhập UID hoặc email hợp lệ.')
  let user: UserRecord
  try {
    user = query.includes('@') ? await authService().getUserByEmail(query) : await authService().getUser(query)
  } catch (error) {
    if (String((error as { code?: unknown })?.code || '').includes('user-not-found')) throw new MonetizationError('USER_NOT_FOUND', 'Không tìm thấy tài khoản.', 404)
    throw error
  }
  return (await joinUsers([user]))[0]
}

export async function getAdminUserDetail(uid: string) {
  const user = await lookupAdminUser(uid)
  const auditSnapshot = await database().ref('monetization/auditLogs').get()
  const audits = Object.values((auditSnapshot.val() || {}) as Record<string, MonetizationAuditLog>)
    .filter((item) => item.targetUid === uid)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 20)
  return { user, audits }
}

async function disconnectWatchPartyUser(uid: string) {
  const base = (process.env.WATCH_PARTY_INTERNAL_URL || '').replace(/\/$/, '')
  const secret = process.env.WATCH_PARTY_INTERNAL_ADMIN_SECRET
  if (!base || !secret) return 'not_configured' as const
  try {
    const response = await fetch(`${base}/internal/admin/users/${encodeURIComponent(uid)}/disconnect`, {
      method: 'POST', headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(2500), cache: 'no-store',
    })
    return response.ok ? 'disconnected' as const : 'unavailable' as const
  } catch {
    return 'unavailable' as const
  }
}

export async function setAdminUserDisabled(targetUid: string, disabled: boolean, reasonValue: string, actor: DecodedIdToken) {
  const reason = validateAuditReason(reasonValue)
  const target = await authService().getUser(targetUid)
  if (target.uid === actor.uid && disabled) throw new MonetizationError('SELF_DISABLE_DENIED', 'Bạn không thể tự khóa tài khoản quản trị.', 409)
  if (protectedAdmin(target) && disabled) throw new MonetizationError('ADMIN_PROTECTED', 'Không thể khóa tài khoản quản trị từ màn người dùng.', 409)
  const audit = await createPendingAudit({ action: disabled ? 'user_disabled' : 'user_enabled', actorUid: actor.uid, targetUid, reason, before: { disabled: target.disabled } })
  try {
    const updated = await authService().updateUser(targetUid, { disabled })
    if (disabled) await authService().revokeRefreshTokens(targetUid)
    const disconnectStatus = disabled ? await disconnectWatchPartyUser(targetUid) : 'not_required'
    await finishAudit(audit.id, 'succeeded', { after: { disabled: updated.disabled, disconnectStatus } })
    return { user: (await joinUsers([updated]))[0], disconnectStatus }
  } catch (error) {
    await finishAudit(audit.id, 'failed', { errorCode: String((error as { code?: unknown })?.code || 'UNKNOWN') }).catch(() => undefined)
    throw error
  }
}

export async function revokeAdminUserSessions(targetUid: string, reasonValue: string, actor: DecodedIdToken) {
  const reason = validateAuditReason(reasonValue)
  await authService().getUser(targetUid)
  const audit = await createPendingAudit({ action: 'user_sessions_revoked', actorUid: actor.uid, targetUid, reason })
  try {
    await authService().revokeRefreshTokens(targetUid)
    const disconnectStatus = await disconnectWatchPartyUser(targetUid)
    await finishAudit(audit.id, 'succeeded', { after: { disconnectStatus } })
    return { ok: true, disconnectStatus }
  } catch (error) {
    await finishAudit(audit.id, 'failed', { errorCode: String((error as { code?: unknown })?.code || 'UNKNOWN') }).catch(() => undefined)
    throw error
  }
}

export async function mutateAdminEntitlement(targetUid: string, input: EntitlementAdminAction, actor: DecodedIdToken) {
  const reason = validateAuditReason(input.reason)
  await authService().getUser(targetUid)
  const entitlementRef = database().ref(`monetization/entitlements/${targetUid}`)
  const initialSnapshot = await entitlementRef.get()
  const initial = resolveEntitlement(targetUid, initialSnapshot.exists() ? initialSnapshot.val() as AccountEntitlement : null)
  const actionName = input.action === 'cancel' ? 'entitlement_cancelled' : input.action === 'extend' ? 'entitlement_extended' : input.action === 'replace' ? 'entitlement_replaced' : 'entitlement_granted'
  const audit = await createPendingAudit({ action: actionName, actorUid: actor.uid, targetUid, reason, before: initial })
  let failure: MonetizationError | null = null
  const now = Date.now()
  const result = await entitlementRef.transaction((stored: AccountEntitlement | null) => {
    const current = resolveEntitlement(targetUid, stored, now)
    if (input.action === 'cancel') {
      return { uid: targetUid, plan: 'normal', billingCycle: null, status: 'active', startsAt: null, expiresAt: null, autoRenew: false, source: 'admin_gift', sourceId: audit.id, updatedAt: now } satisfies AccountEntitlement
    }
    if (input.action === 'extend') {
      if (current.plan === 'normal') { failure = new MonetizationError('PAID_PLAN_REQUIRED', 'Tài khoản chưa có gói trả phí để gia hạn.', 409); return }
      return { ...current, expiresAt: addBillingCycle(Math.max(now, current.expiresAt || now), input.billingCycle), billingCycle: input.billingCycle, source: 'admin_gift', sourceId: audit.id, updatedAt: now }
    }
    return {
      uid: targetUid, plan: input.plan, billingCycle: input.billingCycle, status: 'active', startsAt: now,
      expiresAt: addBillingCycle(now, input.billingCycle), autoRenew: false, source: 'admin_gift', sourceId: audit.id, updatedAt: now,
    } satisfies AccountEntitlement
  }, undefined, false)
  if (!result.committed) {
    const transactionFailure = failure as MonetizationError | null
    await finishAudit(audit.id, 'failed', { errorCode: transactionFailure?.code || 'ENTITLEMENT_UPDATE_FAILED' }).catch(() => undefined)
    throw transactionFailure || new MonetizationError('ENTITLEMENT_UPDATE_FAILED', 'Không thể cập nhật gói tài khoản.')
  }
  const entitlement = resolveEntitlement(targetUid, result.snapshot.val() as AccountEntitlement)
  await finishAudit(audit.id, 'succeeded', { after: entitlement })
  return entitlement
}
