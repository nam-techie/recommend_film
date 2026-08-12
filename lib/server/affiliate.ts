import 'server-only'

import { createHash, randomUUID } from 'node:crypto'
import { getDatabase } from 'firebase-admin/database'
import {
  affiliateLinkIsEligible,
  validateShopeeAffiliateUrl,
  weightedAffiliatePick,
  shouldShowAffiliate,
  type AffiliateAssignment,
  type AffiliateCreative,
  type AffiliateLink,
  type AffiliateLinkStats,
  type AffiliatePolicy,
  type AffiliateRuntimeRequest,
} from '@/lib/affiliate'
import type { AccountPlan } from '@/lib/monetization'
import { createPendingAudit, finishAudit, runAuditedMutation, validateAuditReason } from '@/lib/server/audit'
import { getFirebaseAdminApp } from '@/lib/server/firebase-admin'
import { MonetizationError } from '@/lib/server/monetization-error'

const REQUEST_TTL_MS = 24 * 60 * 60_000
const ASSIGNMENT_TTL_MS = 30 * 60_000
const MAX_RUNTIME_REQUESTS = 50
const DISCLOSURE = 'Liên kết tiếp thị — CineMind có thể nhận hoa hồng.'

function database() { return getDatabase(getFirebaseAdminApp()) }

function cleanText(value: unknown, max: number) { return String(value || '').trim().slice(0, max) }

function vietnamDateKey(now: number) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

function validateRequestId(value: string) {
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(value)) throw new MonetizationError('INVALID_REQUEST_ID', 'Mã phiên xem không hợp lệ.')
  return value
}

function targetHash(movieSlug: string, episodeKey: string) {
  return createHash('sha256').update(`${movieSlug}\n${episodeKey}`).digest('base64url')
}

function creativeFromAssignment(assignment: AffiliateAssignment): AffiliateCreative {
  return {
    assignmentId: assignment.id,
    durationMs: 8000,
    productTitle: assignment.productTitle,
    ctaLabel: assignment.ctaLabel,
    disclosure: DISCLOSURE,
    redirectPath: `/go/affiliate/${encodeURIComponent(assignment.id)}`,
  }
}

export interface CreateAffiliateLinkInput {
  campaignName: string
  productTitle: string
  destinationUrl: string
  ctaLabel?: string
  weight?: number
  startsAt: number
  endsAt: number
  reason: string
}

function validateLinkInput(input: CreateAffiliateLinkInput) {
  const campaignName = cleanText(input.campaignName, 80)
  const productTitle = cleanText(input.productTitle, 120)
  const destinationUrl = cleanText(input.destinationUrl, 2048)
  const ctaLabel = cleanText(input.ctaLabel || 'Xem ưu đãi trên Shopee', 60)
  const weight = Number(input.weight ?? 1)
  if (campaignName.length < 3 || productTitle.length < 3 || ctaLabel.length < 3) throw new MonetizationError('INVALID_AFFILIATE_CONTENT', 'Tên chiến dịch, sản phẩm và CTA cần ít nhất 3 ký tự.')
  if (!validateShopeeAffiliateUrl(destinationUrl)) throw new MonetizationError('INVALID_AFFILIATE_URL', 'Chỉ chấp nhận URL HTTPS thuộc shopee.vn.')
  if (!Number.isInteger(weight) || weight < 1 || weight > 100) throw new MonetizationError('INVALID_WEIGHT', 'Trọng số phải từ 1 đến 100.')
  if (!Number.isFinite(input.startsAt) || !Number.isFinite(input.endsAt) || input.endsAt <= input.startsAt) throw new MonetizationError('INVALID_DATES', 'Ngày kết thúc phải sau ngày bắt đầu.')
  return { campaignName, productTitle, destinationUrl, ctaLabel, weight, startsAt: input.startsAt, endsAt: input.endsAt }
}

export async function listAffiliateLinks() {
  const [linksSnapshot, statsSnapshot, policySnapshot] = await Promise.all([
    database().ref('monetization/affiliateLinks').get(),
    database().ref('monetization/affiliateStats').get(),
    database().ref('monetization/affiliatePolicy').get(),
  ])
  const stats = (statsSnapshot.val() || {}) as Record<string, Record<string, AffiliateLinkStats>>
  const links = Object.values((linksSnapshot.val() || {}) as Record<string, AffiliateLink>)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((link) => {
      const total = Object.values(stats[link.id] || {}).reduce((sum, item) => ({ impressions: sum.impressions + (item.impressions || 0), clicks: sum.clicks + (item.clicks || 0) }), { impressions: 0, clicks: 0 })
      return { ...link, stats: { ...total, ctr: total.impressions ? Math.round(total.clicks / total.impressions * 10_000) / 100 : 0 } }
    })
  const policy: AffiliatePolicy = policySnapshot.exists() ? policySnapshot.val() as AffiliatePolicy : { enabled: false, updatedAt: 0 }
  return { links, policy }
}

export async function createAffiliateLink(input: CreateAffiliateLinkInput, adminUid: string) {
  const validated = validateLinkInput(input)
  const reason = validateAuditReason(input.reason)
  const now = Date.now()
  const ref = database().ref('monetization/affiliateLinks').push()
  const link: AffiliateLink = { id: ref.key!, ...validated, status: 'active', createdBy: adminUid, createdAt: now, updatedAt: now }
  const audit = await createPendingAudit({ action: 'affiliate_link_created', actorUid: adminUid, targetId: link.id, reason, after: link })
  try {
    await ref.set(link)
    await finishAudit(audit.id, 'succeeded', { after: link })
    return link
  } catch (error) {
    await finishAudit(audit.id, 'failed', { errorCode: 'AFFILIATE_CREATE_FAILED' }).catch(() => undefined)
    throw error
  }
}

export async function updateAffiliateLink(id: string, input: Partial<Pick<AffiliateLink, 'campaignName' | 'productTitle' | 'ctaLabel' | 'weight' | 'startsAt' | 'endsAt' | 'status'>> & { reason: string }, adminUid: string) {
  const reason = validateAuditReason(input.reason)
  const ref = database().ref(`monetization/affiliateLinks/${id}`)
  const beforeSnapshot = await ref.get()
  if (!beforeSnapshot.exists()) throw new MonetizationError('NOT_FOUND', 'Không tìm thấy affiliate link.', 404)
  const before = beforeSnapshot.val() as AffiliateLink
  let failure: MonetizationError | null = null
  const { result: after } = await runAuditedMutation(
    { action: 'affiliate_link_updated', actorUid: adminUid, targetId: id, reason, before },
    async () => {
      const result = await ref.transaction((current: AffiliateLink | null) => {
        if (!current) { failure = new MonetizationError('NOT_FOUND', 'Không tìm thấy affiliate link.', 404); return }
        const next = { ...current }
        if (current.status === 'archived' && input.status && input.status !== 'archived') { failure = new MonetizationError('ARCHIVED_LINK', 'Link đã lưu trữ không thể kích hoạt lại.', 409); return }
        if (input.campaignName !== undefined) next.campaignName = cleanText(input.campaignName, 80)
        if (input.productTitle !== undefined) next.productTitle = cleanText(input.productTitle, 120)
        if (input.ctaLabel !== undefined) next.ctaLabel = cleanText(input.ctaLabel, 60)
        if (input.weight !== undefined) next.weight = Number(input.weight)
        if (input.startsAt !== undefined) next.startsAt = Number(input.startsAt)
        if (input.endsAt !== undefined) next.endsAt = Number(input.endsAt)
        if (input.status && ['active', 'paused', 'archived'].includes(input.status)) next.status = input.status
        if (next.campaignName.length < 3 || next.productTitle.length < 3 || next.ctaLabel.length < 3) { failure = new MonetizationError('INVALID_AFFILIATE_CONTENT', 'Nội dung cần ít nhất 3 ký tự.'); return }
        if (!Number.isInteger(next.weight) || next.weight < 1 || next.weight > 100) { failure = new MonetizationError('INVALID_WEIGHT', 'Trọng số phải từ 1 đến 100.'); return }
        if (!Number.isFinite(next.startsAt) || !Number.isFinite(next.endsAt) || next.endsAt <= next.startsAt) { failure = new MonetizationError('INVALID_DATES', 'Ngày kết thúc phải sau ngày bắt đầu.'); return }
        next.updatedAt = Date.now()
        return next
      }, undefined, false)
      if (!result.committed) throw failure || new MonetizationError('AFFILIATE_UPDATE_FAILED', 'Không thể cập nhật affiliate link.')
      return result.snapshot.val() as AffiliateLink
    },
  )
  return after
}

export async function updateAffiliatePolicy(enabled: boolean, reasonValue: string, adminUid: string) {
  const reason = validateAuditReason(reasonValue)
  const ref = database().ref('monetization/affiliatePolicy')
  const beforeSnapshot = await ref.get()
  const before = beforeSnapshot.exists() ? beforeSnapshot.val() as AffiliatePolicy : { enabled: false, updatedAt: 0 }
  if (enabled) {
    const linksSnapshot = await database().ref('monetization/affiliateLinks').get()
    const eligible = Object.values((linksSnapshot.val() || {}) as Record<string, AffiliateLink>).some((link) => affiliateLinkIsEligible(link))
    if (!eligible) throw new MonetizationError('AFFILIATE_POOL_EMPTY', 'Cần ít nhất một link đang hoạt động trước khi bật affiliate.', 409)
  }
  const after: AffiliatePolicy = { enabled, updatedAt: Date.now(), updatedBy: adminUid }
  const { result } = await runAuditedMutation(
    { action: enabled ? 'affiliate_enabled' : 'affiliate_disabled', actorUid: adminUid, targetId: 'affiliatePolicy', reason, before, after },
    async () => { await ref.set(after); return after },
  )
  return result
}

interface RuntimeState {
  plusEligibleCount?: number
  requests?: Record<string, AffiliateRuntimeRequest>
  assignments?: Record<string, AffiliateAssignment>
}

export async function assignAffiliateForWatch(uid: string, plan: AccountPlan, movieSlug: string, episodeKey: string, requestIdValue: string) {
  const requestId = validateRequestId(requestIdValue)
  const hash = targetHash(movieSlug, episodeKey)
  const now = Date.now()
  if (plan === 'ultra') return { id: requestId, affiliate: null as AffiliateCreative | null }
  let policy: AffiliatePolicy
  let pool: AffiliateLink[]
  try {
    const [policySnapshot, linksSnapshot] = await Promise.all([
      database().ref('monetization/affiliatePolicy').get(),
      database().ref('monetization/affiliateLinks').get(),
    ])
    policy = policySnapshot.exists() ? policySnapshot.val() as AffiliatePolicy : { enabled: false, updatedAt: 0 }
    pool = Object.values((linksSnapshot.val() || {}) as Record<string, AffiliateLink>).filter((link) => affiliateLinkIsEligible(link, now))
  } catch {
    return { id: requestId, affiliate: null as AffiliateCreative | null }
  }
  if (!policy.enabled || !pool.length) return { id: requestId, affiliate: null as AffiliateCreative | null }

  const chosen = weightedAffiliatePick(pool)
  if (!chosen) return { id: requestId, affiliate: null as AffiliateCreative | null }
  const proposedAssignmentId = randomUUID()
  const runtimeRef = database().ref(`monetization/affiliateRuntime/${uid}`)
  let failure: MonetizationError | null = null
  const result = await runtimeRef.transaction((current: RuntimeState | null) => {
    const state: RuntimeState = current || {}
    const requests = { ...(state.requests || {}) }
    const assignments = { ...(state.assignments || {}) }
    const existing = requests[requestId]
    if (existing) {
      if (existing.targetHash !== hash) { failure = new MonetizationError('REQUEST_TARGET_MISMATCH', 'Mã phiên đã được dùng cho một tập khác.', 409); return }
      return state
    }
    Object.entries(requests).filter(([, value]) => value.expiresAt <= now).forEach(([id, value]) => { delete requests[id]; if (value.assignmentId) delete assignments[value.assignmentId] })
    const nextCount = plan === 'premium' ? (state.plusEligibleCount || 0) + 1 : (state.plusEligibleCount || 0)
    const show = shouldShowAffiliate(plan, nextCount)
    const assignment: AffiliateAssignment | null = show ? {
      id: proposedAssignmentId, requestId, uid, linkId: chosen.id, movieSlug, episodeKey, plan,
      productTitle: chosen.productTitle, ctaLabel: chosen.ctaLabel, assignedAt: now, expiresAt: now + ASSIGNMENT_TTL_MS,
    } : null
    requests[requestId] = { requestId, targetHash: hash, decision: assignment ? 'interstitial' : 'none', ...(assignment ? { assignmentId: assignment.id } : {}), plan, createdAt: now, expiresAt: now + REQUEST_TTL_MS }
    if (assignment) assignments[assignment.id] = assignment
    const keep = Object.values(requests).sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_RUNTIME_REQUESTS)
    const keepIds = new Set(keep.map((item) => item.requestId))
    Object.keys(requests).forEach((id) => { if (!keepIds.has(id)) { const assignmentId = requests[id].assignmentId; delete requests[id]; if (assignmentId) delete assignments[assignmentId] } })
    return { plusEligibleCount: nextCount, requests, assignments }
  }, undefined, false)
  if (!result.committed) throw failure || new MonetizationError('AFFILIATE_ASSIGN_FAILED', 'Không thể tạo phiên affiliate.', 503)
  const state = result.snapshot.val() as RuntimeState
  const decision = state.requests?.[requestId]
  if (!decision || decision.targetHash !== hash) throw new MonetizationError('AFFILIATE_ASSIGN_FAILED', 'Không thể đọc phiên affiliate.', 503)
  if (!decision.assignmentId) return { id: requestId, affiliate: null as AffiliateCreative | null }
  const assignment = state.assignments?.[decision.assignmentId]
  if (!assignment) return { id: requestId, affiliate: null as AffiliateCreative | null }
  await database().ref(`monetization/affiliateAssignments/${assignment.id}`).set(assignment).catch(() => undefined)
  return { id: requestId, affiliate: creativeFromAssignment(assignment) }
}

async function incrementAffiliateStat(linkId: string, field: keyof AffiliateLinkStats, now: number) {
  await database().ref(`monetization/affiliateStats/${linkId}/${vietnamDateKey(now)}`).transaction((current: AffiliateLinkStats | null) => ({ impressions: current?.impressions || 0, clicks: current?.clicks || 0, [field]: (current?.[field] || 0) + 1 }), undefined, false)
}

export async function recordAffiliateImpression(uid: string, assignmentId: string) {
  const assignmentSnapshot = await database().ref(`monetization/affiliateAssignments/${assignmentId}`).get()
  if (!assignmentSnapshot.exists()) throw new MonetizationError('ASSIGNMENT_NOT_FOUND', 'Phiên affiliate không tồn tại.', 404)
  const assignment = assignmentSnapshot.val() as AffiliateAssignment
  if (assignment.uid !== uid || assignment.expiresAt <= Date.now()) throw new MonetizationError('ASSIGNMENT_EXPIRED', 'Phiên affiliate đã hết hạn.', 410)
  const eventRef = database().ref(`monetization/affiliateEvents/impression/${assignmentId}`)
  const now = Date.now()
  const claim = await eventRef.transaction((current) => current ? undefined : { assignmentId, linkId: assignment.linkId, uid, occurredAt: now }, undefined, false)
  if (claim.committed) {
    await Promise.all([
      database().ref(`monetization/affiliateAssignments/${assignmentId}/impressionAt`).set(now),
      database().ref(`monetization/affiliateRuntime/${uid}/assignments/${assignmentId}/impressionAt`).set(now),
      incrementAffiliateStat(assignment.linkId, 'impressions', now),
    ])
  }
  return { ok: true }
}

export async function resolveAffiliateRedirect(assignmentId: string) {
  const assignmentSnapshot = await database().ref(`monetization/affiliateAssignments/${assignmentId}`).get()
  if (!assignmentSnapshot.exists()) throw new MonetizationError('ASSIGNMENT_NOT_FOUND', 'Liên kết không tồn tại hoặc đã hết hạn.', 410)
  const assignment = assignmentSnapshot.val() as AffiliateAssignment
  const now = Date.now()
  if (assignment.expiresAt <= now) throw new MonetizationError('ASSIGNMENT_EXPIRED', 'Liên kết đã hết hạn.', 410)
  const linkSnapshot = await database().ref(`monetization/affiliateLinks/${assignment.linkId}`).get()
  if (!linkSnapshot.exists() || !affiliateLinkIsEligible(linkSnapshot.val() as AffiliateLink, now)) throw new MonetizationError('AFFILIATE_LINK_UNAVAILABLE', 'Ưu đãi này không còn hoạt động.', 410)
  const link = linkSnapshot.val() as AffiliateLink
  const eventRef = database().ref(`monetization/affiliateEvents/click/${assignmentId}`)
  const claim = await eventRef.transaction((current) => current ? undefined : { assignmentId, linkId: link.id, uid: assignment.uid, occurredAt: now }, undefined, false)
  if (claim.committed) {
    await Promise.all([
      database().ref(`monetization/affiliateAssignments/${assignmentId}/clickAt`).set(now),
      database().ref(`monetization/affiliateRuntime/${assignment.uid}/assignments/${assignmentId}/clickAt`).set(now),
      incrementAffiliateStat(link.id, 'clicks', now),
    ]).catch(() => undefined)
  }
  return link.destinationUrl
}
