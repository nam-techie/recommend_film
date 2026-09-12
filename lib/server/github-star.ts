import 'server-only'

import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { getDatabase } from 'firebase-admin/database'
import type { DecodedIdToken } from 'firebase-admin/auth'
import { GITHUB_STAR_CAMPAIGN_ID, campaignOpen, needsManualReview, type GithubStarCampaign, type GithubStarClaim, type GithubStarState } from '@/lib/github-star'
import { getFirebaseAdminApp } from '@/lib/server/firebase-admin'
import { MonetizationError } from '@/lib/server/monetization-error'
import { grantGithubStarPlus, getEntitlementGrantState, mutateEntitlementGrantState } from '@/lib/server/entitlement-grants'
import { deletePrivateFile, storePrivateScreenshot } from '@/lib/server/private-storage'
import { recordAuditEvent, validateAuditReason } from '@/lib/server/audit'

const DAY = 24 * 60 * 60_000
const repoOwner = () => process.env.GITHUB_STAR_REPO_OWNER || 'nam-techie'
const repoName = () => process.env.GITHUB_STAR_REPO_NAME || 'recommend_film'

export function verifyWebhookHmac(rawBody: string, signature: string, secret: string) {
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`
  if (signature.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

export function defaultGithubCampaign(now = Date.now()): GithubStarCampaign {
  return { id: GITHUB_STAR_CAMPAIGN_ID, enabled: false, autoApprove: false, grantsEnabled: false, startsAt: now, endsAt: now + 90 * DAY, maxClaims: 500, manualReviewCount: 50, approvedCount: 0, reservedCount: 0, graceDays: 7, updatedAt: now, updatedBy: 'system' }
}

export async function getGithubCampaign() {
  const ref = getDatabase(getFirebaseAdminApp()).ref(`githubStar/campaigns/${GITHUB_STAR_CAMPAIGN_ID}`)
  const result = await ref.transaction((current) => current || defaultGithubCampaign(), undefined, false)
  return result.snapshot.val() as GithubStarCampaign
}

async function githubRequest<T>(path: string): Promise<T> {
  const token = process.env.GITHUB_STARGAZERS_TOKEN
  const response = await fetch(`https://api.github.com${path}`, { headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, cache: 'no-store' })
  if (!response.ok) throw new MonetizationError('GITHUB_UNAVAILABLE', 'GitHub chưa phản hồi xác minh. Yêu cầu vẫn có thể được admin duyệt thủ công.', response.status === 404 ? 400 : 503)
  return response.json() as Promise<T>
}

async function githubIdentity(login: string) {
  const normalized = login.trim().replace(/^@/, '')
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(normalized)) throw new MonetizationError('INVALID_GITHUB_LOGIN', 'GitHub username không hợp lệ.', 400)
  const user = await githubRequest<{ id: number; login: string; type: string; created_at: string }>(`/users/${encodeURIComponent(normalized)}`)
  if (user.type !== 'User' || Date.parse(user.created_at) > Date.now() - 30 * DAY) throw new MonetizationError('GITHUB_ACCOUNT_INELIGIBLE', 'GitHub account phải là tài khoản cá nhân và đã tồn tại ít nhất 30 ngày.', 409)
  return user
}

export async function repositoryStargazerIds() {
  const ids = new Set<number>()
  const token = process.env.GITHUB_STARGAZERS_TOKEN
  if (!token) return ids
  for (let page = 1; page <= 10; page += 1) {
    const rows = await githubRequest<Array<{ id: number }>>(`/repos/${repoOwner()}/${repoName()}/stargazers?per_page=100&page=${page}`)
    rows.forEach((row) => ids.add(row.id))
    if (rows.length < 100) break
  }
  return ids
}

export async function createGithubStarClaim(identity: DecodedIdToken, input: { githubLogin: string; evidence?: File }) {
  if (!identity.email || identity.email_verified !== true || identity.firebase?.sign_in_provider === 'anonymous') throw new MonetizationError('VERIFIED_ACCOUNT_REQUIRED', 'Bạn cần tài khoản CineMind có email đã xác minh.', 403)
  const campaign = await getGithubCampaign()
  if (!campaignOpen(campaign)) throw new MonetizationError('CAMPAIGN_CLOSED', 'Chương trình hiện chưa mở hoặc đã đủ lượt.', 409)
  const github = await githubIdentity(input.githubLogin)
  const stars = await repositoryStargazerIds().catch(() => new Set<number>())
  const database = getDatabase(getFirebaseAdminApp())
  const claimId = randomUUID()
  const now = Date.now()
  let conflict: string | null = null
  const reservationRef = database.ref(`githubStar/reservations/${campaign.id}`)
  const reservation = await reservationRef.transaction((current: { uids?: Record<string, string>; githubIds?: Record<string, string>; count?: number } | null) => {
    const value = current || { uids: {}, githubIds: {}, count: 0 }
    if (value.uids?.[identity.uid]) { conflict = 'UID_ALREADY_CLAIMED'; return }
    if (value.githubIds?.[String(github.id)]) { conflict = 'GITHUB_ALREADY_CLAIMED'; return }
    if ((value.count || 0) >= campaign.maxClaims) { conflict = 'CAMPAIGN_FULL'; return }
    return { uids: { ...(value.uids || {}), [identity.uid]: claimId }, githubIds: { ...(value.githubIds || {}), [github.id]: claimId }, count: (value.count || 0) + 1 }
  }, undefined, false)
  if (!reservation.committed) throw new MonetizationError(conflict || 'CLAIM_CONFLICT', 'UID hoặc GitHub account đã tham gia chương trình.', 409)
  let evidence: GithubStarClaim['evidenceStatus'] = 'missing'
  let evidencePath: string | undefined
  try {
    if (input.evidence?.size) { evidencePath = `github-star/${campaign.id}/${claimId}.webp`; await storePrivateScreenshot(evidencePath, input.evidence); evidence = 'uploaded' }
  } catch { evidence = 'unavailable' }
  const starVerified = stars.has(github.id)
  const claim: GithubStarClaim = {
    id: claimId, campaignId: campaign.id, uid: identity.uid, email: identity.email, githubId: github.id, githubLogin: github.login,
    githubCreatedAt: github.created_at, ...(evidencePath ? { evidencePath } : {}), evidenceStatus: evidence,
    starVerified, verificationSource: starVerified ? 'repository_api' : 'manual_evidence', status: 'pending', createdAt: now, updatedAt: now, revision: 1,
  }
  try {
    await database.ref().update({ [`githubStar/claims/${claimId}`]: claim, [`githubStar/states/${github.id}`]: { githubId: github.id, login: github.login, starred: starVerified, updatedAt: now, source: 'reconciliation' } })
    await database.ref(`githubStar/campaigns/${campaign.id}/reservedCount`).transaction((value) => Number(value || 0) + 1)
  } catch (error) {
    if (evidencePath) await deletePrivateFile(evidencePath).catch(() => undefined)
    await reservationRef.transaction((stored: { uids?: Record<string, string>; githubIds?: Record<string, string>; count?: number } | null) => {
      if (stored?.uids?.[identity.uid] !== claimId || stored?.githubIds?.[String(github.id)] !== claimId) return stored
      const uids = { ...(stored.uids || {}) }; const githubIds = { ...(stored.githubIds || {}) }
      delete uids[identity.uid]; delete githubIds[String(github.id)]
      return { uids, githubIds, count: Math.max(0, Number(stored.count || 0) - 1) }
    }, undefined, false).catch(() => undefined)
    throw error
  }
  if (starVerified && !needsManualReview(campaign)) return approveGithubStarClaim(claimId, { uid: 'auto-approval' }, 'Auto-approved after repository verification')
  return claim
}

export async function approveGithubStarClaim(claimId: string, actor: Pick<DecodedIdToken, 'uid'> | { uid: string }, reasonValue: string, expectedRevision?: number) {
  const reason = validateAuditReason(reasonValue)
  const database = getDatabase(getFirebaseAdminApp())
  const snapshot = await database.ref(`githubStar/claims/${claimId}`).get()
  if (!snapshot.exists()) throw new MonetizationError('CLAIM_NOT_FOUND', 'Không tìm thấy yêu cầu.', 404)
  const claim = snapshot.val() as GithubStarClaim
  if (typeof expectedRevision === 'number' && claim.revision !== expectedRevision) throw new MonetizationError('CLAIM_REVISION_CONFLICT', 'Yêu cầu vừa thay đổi. Hãy tải lại.', 409)
  if (!['pending', 'needs_proof'].includes(claim.status)) return claim
  const starStateSnapshot = await database.ref(`githubStar/states/${claim.githubId}`).get()
  const starState = starStateSnapshot.val() as GithubStarState | null
  if (!starState?.starred) throw new MonetizationError('STAR_NOT_VERIFIED', 'Chưa xác minh được trạng thái Star hiện tại qua webhook hoặc reconciliation.', 409)
  const campaign = await getGithubCampaign()
  if (!campaign.grantsEnabled) throw new MonetizationError('GRANTS_DISABLED', 'Kill switch cấp grant đang tắt.', 409)
  const granted = await grantGithubStarPlus(claim.uid, claim.campaignId, claim.id, actor.uid)
  const now = Date.now()
  const updated: GithubStarClaim = { ...claim, starVerified: true, verificationSource: starState.source === 'reconciliation' ? 'repository_api' : 'webhook', status: 'approved', grantId: granted.grant.id, originalGrantEndsAt: granted.grant.originalEndsAt, reviewedAt: now, reviewedBy: actor.uid, reviewReason: reason, updatedAt: now, revision: claim.revision + 1 }
  const notificationId = randomUUID()
  await database.ref().update({ [`githubStar/claims/${claimId}`]: updated, [`notifications/${claim.uid}/${notificationId}`]: { id: notificationId, actorUid: 'system', actorName: 'CineMind', type: 'github_star_status_changed', eventId: claim.id, title: 'Đã duyệt Plus từ GitHub Star', body: 'Grant CinePass Plus 1 năm đã được xếp sau gói hiện tại của bạn.', href: '/account', severity: 'success', createdAt: now, read: false } })
  await Promise.all([database.ref(`githubStar/campaigns/${campaign.id}/approvedCount`).transaction((value) => Number(value || 0) + 1), database.ref(`githubStar/campaigns/${campaign.id}/reviewedCount`).transaction((value) => Number(value || 0) + 1), database.ref(`githubStar/campaigns/${campaign.id}/reservedCount`).transaction((value) => Math.max(0, Number(value || 0) - 1))])
  await recordAuditEvent({ action: 'github_star_claim_approved', status: 'succeeded', actorUid: actor.uid, targetUid: claim.uid, reason, after: { claimId, githubId: claim.githubId, grantId: granted.grant.id } })
  return updated
}

export async function reviewGithubStarClaim(claimId: string, actor: Pick<DecodedIdToken, 'uid'>, input: { action: 'approve' | 'reject' | 'request_proof'; reason: string; expectedRevision: number }) {
  if (input.action === 'approve') return approveGithubStarClaim(claimId, actor, input.reason, input.expectedRevision)
  const reason = validateAuditReason(input.reason)
  const ref = getDatabase(getFirebaseAdminApp()).ref(`githubStar/claims/${claimId}`)
  let failure: MonetizationError | null = null
  const result = await ref.transaction((stored: GithubStarClaim | null) => {
    if (!stored) { failure = new MonetizationError('CLAIM_NOT_FOUND', 'Không tìm thấy yêu cầu.', 404); return }
    if (stored.revision !== input.expectedRevision) { failure = new MonetizationError('CLAIM_REVISION_CONFLICT', 'Yêu cầu vừa thay đổi. Hãy tải lại.', 409); return }
    return { ...stored, status: input.action === 'reject' ? 'rejected' : 'needs_proof', reviewedAt: Date.now(), reviewedBy: actor.uid, reviewReason: reason, updatedAt: Date.now(), revision: stored.revision + 1 }
  }, undefined, false)
  if (!result.committed) throw failure || new MonetizationError('CLAIM_UPDATE_FAILED', 'Không thể cập nhật yêu cầu.', 409)
  if (input.action === 'reject') {
    const campaign = await getGithubCampaign()
    const database = getDatabase(getFirebaseAdminApp())
    await Promise.all([database.ref(`githubStar/campaigns/${campaign.id}/reservedCount`).transaction((value) => Math.max(0, Number(value || 0) - 1)), database.ref(`githubStar/campaigns/${campaign.id}/reviewedCount`).transaction((value) => Number(value || 0) + 1), database.ref(`githubStar/campaigns/${campaign.id}/rejectedCount`).transaction((value) => Number(value || 0) + 1), database.ref(`githubStar/reservations/${campaign.id}/count`).transaction((value) => Math.max(0, Number(value || 0) - 1))])
  }
  const updated = result.snapshot.val() as GithubStarClaim
  await recordAuditEvent({ action: input.action === 'reject' ? 'github_star_claim_rejected' : 'github_star_claim_proof_requested', status: 'succeeded', actorUid: actor.uid, targetUid: updated.uid, reason, after: { claimId, githubId: updated.githubId, status: updated.status } })
  return updated
}

export async function handleGithubStarWebhook(input: { deliveryId: string; action: string; repositoryId: number; sender: { id: number; login: string }; starredAt?: string | null }) {
  if (!['created', 'deleted'].includes(input.action)) throw new MonetizationError('INVALID_STAR_ACTION', 'Webhook Star action không hợp lệ.', 400)
  const expectedRepoId = Number(process.env.GITHUB_STAR_REPOSITORY_ID || 0)
  if (expectedRepoId && input.repositoryId !== expectedRepoId) throw new MonetizationError('WRONG_REPOSITORY', 'Webhook không thuộc đúng repository.', 403)
  const database = getDatabase(getFirebaseAdminApp())
  const deliveryRef = database.ref(`githubStar/webhookDeliveries/${input.deliveryId}`)
  let duplicate = false
  const delivery = await deliveryRef.transaction((current) => {
    if (current) { duplicate = true; return }
    return { receivedAt: Date.now(), action: input.action }
  }, undefined, false)
  if (duplicate || !delivery.committed) return { duplicate: true }
  const now = Date.now()
  const starred = input.action === 'created'
  const state: GithubStarState = { githubId: input.sender.id, login: input.sender.login, starred, ...(starred ? { starredAt: input.starredAt ? Date.parse(input.starredAt) : now } : { unstarredAt: now }), updatedAt: now, source: 'webhook' }
  const reservation = await database.ref(`githubStar/reservations/${GITHUB_STAR_CAMPAIGN_ID}/githubIds/${input.sender.id}`).get()
  const claimId = reservation.val() as string | null
  const updates: Record<string, unknown> = { [`githubStar/states/${input.sender.id}`]: state }
  if (claimId) {
    const claimSnapshot = await database.ref(`githubStar/claims/${claimId}`).get()
    if (claimSnapshot.exists()) {
      const claim = claimSnapshot.val() as GithubStarClaim
      if (!starred && claim.status === 'approved') {
        updates[`githubStar/claims/${claimId}`] = { ...claim, status: 'grace', graceEndsAt: now + 7 * DAY, updatedAt: now, revision: claim.revision + 1 }
        const notificationId = randomUUID()
        updates[`notifications/${claim.uid}/${notificationId}`] = { id: notificationId, actorUid: 'system', actorName: 'CineMind', type: 'github_star_status_changed', eventId: claim.id, title: 'GitHub Star đang trong thời gian gia hạn', body: 'Hãy Star lại repo trong 7 ngày để giữ grant Plus gốc.', href: '/account', severity: 'warning', createdAt: now, read: false }
      }
      if (starred && claim.status === 'grace') updates[`githubStar/claims/${claimId}`] = { ...claim, status: 'approved', graceEndsAt: null, starVerified: true, verificationSource: 'webhook', updatedAt: now, revision: claim.revision + 1 }
      if (starred && claim.status === 'revoked' && claim.grantId && (claim.originalGrantEndsAt || 0) > now) {
        const current = await getEntitlementGrantState(claim.uid)
        await mutateEntitlementGrantState(claim.uid, { action: 'restore', grantId: claim.grantId, reason: 'GitHub Star restored within original grant window', expectedRevision: current.state.revision }, { uid: 'github-star-webhook' })
        updates[`githubStar/claims/${claimId}`] = { ...claim, status: 'approved', graceEndsAt: null, starVerified: true, verificationSource: 'webhook', updatedAt: now, revision: claim.revision + 1 }
      }
    }
  }
  await database.ref().update(updates)
  return { duplicate: false, claimId }
}

export async function runGithubStarMaintenance() {
  const database = getDatabase(getFirebaseAdminApp())
  const claimsSnapshot = await database.ref('githubStar/claims').get()
  const claims = Object.values((claimsSnapshot.val() || {}) as Record<string, GithubStarClaim>)
  const stars = await repositoryStargazerIds().catch(() => null)
  const now = Date.now()
  let revoked = 0
  let expired = 0
  let reconciled = 0
  let mismatches = 0
  for (const claim of claims) {
    if (['pending', 'needs_proof'].includes(claim.status) && claim.createdAt <= now - 72 * 60 * 60_000) {
      await database.ref().update({
        [`githubStar/claims/${claim.id}/status`]: 'expired', [`githubStar/claims/${claim.id}/updatedAt`]: now, [`githubStar/claims/${claim.id}/revision`]: claim.revision + 1,
        [`githubStar/reservations/${claim.campaignId}/uids/${claim.uid}`]: null, [`githubStar/reservations/${claim.campaignId}/githubIds/${claim.githubId}`]: null,
      })
      await database.ref(`githubStar/reservations/${claim.campaignId}/count`).transaction((value) => Math.max(0, Number(value || 0) - 1))
      await database.ref(`githubStar/campaigns/${claim.campaignId}/reservedCount`).transaction((value) => Math.max(0, Number(value || 0) - 1))
      expired += 1
      continue
    }
    if (stars) {
      const starred = stars.has(claim.githubId)
      const previousStateSnapshot = await database.ref(`githubStar/states/${claim.githubId}`).get()
      const previousState = previousStateSnapshot.val() as GithubStarState | null
      if (previousState && previousState.starred !== starred) mismatches += 1
      await database.ref(`githubStar/states/${claim.githubId}`).set({ githubId: claim.githubId, login: claim.githubLogin, starred, updatedAt: now, source: 'reconciliation' } satisfies GithubStarState)
      reconciled += 1
      if (!starred && claim.status === 'approved') {
        const notificationId = randomUUID()
        await database.ref().update({ [`githubStar/claims/${claim.id}/status`]: 'grace', [`githubStar/claims/${claim.id}/graceEndsAt`]: now + 7 * DAY, [`githubStar/claims/${claim.id}/updatedAt`]: now, [`githubStar/claims/${claim.id}/revision`]: claim.revision + 1, [`notifications/${claim.uid}/${notificationId}`]: { id: notificationId, actorUid: 'system', actorName: 'CineMind', type: 'github_star_status_changed', eventId: claim.id, title: 'GitHub Star đang trong thời gian gia hạn', body: 'Hãy Star lại repo trong 7 ngày để giữ grant Plus gốc.', href: '/account', severity: 'warning', createdAt: now, read: false } })
      }
      if (starred && claim.status === 'grace') await database.ref(`githubStar/claims/${claim.id}`).update({ status: 'approved', graceEndsAt: null, updatedAt: now, revision: claim.revision + 1 })
      if (starred && claim.status === 'revoked' && claim.grantId && (claim.originalGrantEndsAt || 0) > now) {
        const current = await getEntitlementGrantState(claim.uid)
        await mutateEntitlementGrantState(claim.uid, { action: 'restore', grantId: claim.grantId, reason: 'GitHub Star restored within original grant window', expectedRevision: current.state.revision }, { uid: 'github-star-maintenance' })
        await database.ref(`githubStar/claims/${claim.id}`).update({ status: 'approved', graceEndsAt: null, updatedAt: now, revision: claim.revision + 1 })
      }
    }
    if (claim.status === 'grace' && claim.graceEndsAt && claim.graceEndsAt <= now && claim.grantId) {
      const current = await getEntitlementGrantState(claim.uid)
      await mutateEntitlementGrantState(claim.uid, { action: 'revoke', grantId: claim.grantId, reason: 'GitHub Star removed after 7-day grace', expectedRevision: current.state.revision }, { uid: 'github-star-maintenance' })
      const notificationId = randomUUID()
      await database.ref().update({ [`githubStar/claims/${claim.id}/status`]: 'revoked', [`githubStar/claims/${claim.id}/updatedAt`]: now, [`githubStar/claims/${claim.id}/revision`]: claim.revision + 1, [`notifications/${claim.uid}/${notificationId}`]: { id: notificationId, actorUid: 'system', actorName: 'CineMind', type: 'github_star_status_changed', eventId: claim.id, title: 'Grant GitHub Star đã bị thu hồi', body: 'Grace 7 ngày đã kết thúc; các grant payment/discount khác không bị ảnh hưởng.', href: '/account', severity: 'warning', createdAt: now, read: false } })
      revoked += 1
    }
  }
  await database.ref(`githubStar/campaigns/${GITHUB_STAR_CAMPAIGN_ID}`).transaction((stored: GithubStarCampaign | null) => stored ? { ...stored, reconciliationStartedAt: stored.reconciliationStartedAt || now, lastReconciliationAt: now, reconciliationChecks: Number(stored.reconciliationChecks || 0) + reconciled, mismatchCount: Number(stored.mismatchCount || 0) + mismatches, updatedAt: now, updatedBy: 'github-star-maintenance' } : stored, undefined, false)
  return { reconciled, mismatches, revoked, expired }
}
export async function anonymizeGithubStarClaimsForDeletedAccount(uid: string) {
  const database = getDatabase(getFirebaseAdminApp())
  const snapshot = await database.ref('githubStar/claims').orderByChild('uid').equalTo(uid).get()
  const claims = Object.values((snapshot.val() || {}) as Record<string, GithubStarClaim>)
  const updates: Record<string, unknown> = { [`githubStar/reservations/${GITHUB_STAR_CAMPAIGN_ID}/uids/${uid}`]: null }
  for (const claim of claims) {
    if (claim.evidencePath) await deletePrivateFile(claim.evidencePath).catch(() => undefined)
    updates[`githubStar/claims/${claim.id}/uid`] = 'deleted'
    updates[`githubStar/claims/${claim.id}/email`] = null
    updates[`githubStar/claims/${claim.id}/evidencePath`] = null
    updates[`githubStar/claims/${claim.id}/evidenceStatus`] = 'unavailable'
    updates[`githubStar/claims/${claim.id}/deletedAt`] = Date.now()
  }
  await database.ref().update(updates)
}