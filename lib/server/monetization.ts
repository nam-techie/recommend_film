import 'server-only'

import { createHash, randomUUID } from 'node:crypto'
import { getDatabase } from 'firebase-admin/database'
import { activeRestriction, type EntitlementRestriction } from '@/lib/entitlement-grants'
import {
  addBillingCycle,
  buildDiscountQuote,
  claimDailyWatchUsage,
  discountAvailability,
  isDiscountCodeValid,
  normalizeDiscountCode,
  PLAN_CAPABILITIES,
  PLAN_RANK,
  resolveEntitlement,
  type AccountEntitlement,
  type BillingCycle,
  type DiscountCode,
  type DiscountQuote,
  type DiscountRedemption,
  type DiscountStatus,
  type DailyUsage,
  type DailyWatchUsageRecord,
  type PaidPlan,
} from '@/lib/monetization'
import { getFirebaseAdminApp } from '@/lib/server/firebase-admin'
import { MonetizationError } from '@/lib/server/monetization-error'
import { getPaidPlanPrice } from '@/lib/server/plan-catalog'
import { assignAffiliateForWatch } from '@/lib/server/affiliate'
import { createPendingAudit, finishAudit, validateAuditReason } from '@/lib/server/audit'
import { issuePlaybackGrant } from '@/lib/server/analytics'
export { MonetizationError } from '@/lib/server/monetization-error'

function db() { return getDatabase(getFirebaseAdminApp()) }

export interface CreateDiscountInput {
  code: string
  percent: number
  targetPlan: PaidPlan
  billingCycle: BillingCycle
  maxRedemptions: number
  startsAt: number
  endsAt: number
  targetUid?: string
  note?: string
  reason: string
}

function validateDiscountInput(input: CreateDiscountInput) {
  const code = normalizeDiscountCode(input.code)
  if (!isDiscountCodeValid(code)) throw new MonetizationError('INVALID_CODE', 'Mã cần 3–32 ký tự, chỉ gồm chữ, số, _ hoặc -.')
  if (!Number.isInteger(input.percent) || input.percent < 1 || input.percent > 100) throw new MonetizationError('INVALID_PERCENT', 'Phần trăm giảm phải từ 1 đến 100.')
  if (input.targetPlan !== 'premium' && input.targetPlan !== 'ultra') throw new MonetizationError('INVALID_PLAN', 'Gói áp dụng không hợp lệ.')
  if (input.billingCycle !== 'monthly' && input.billingCycle !== 'annual') throw new MonetizationError('INVALID_CYCLE', 'Chu kỳ gói không hợp lệ.')
  if (!Number.isInteger(input.maxRedemptions) || input.maxRedemptions < 1 || input.maxRedemptions > 1_000_000) throw new MonetizationError('INVALID_LIMIT', 'Số lượt sử dụng phải từ 1 đến 1.000.000.')
  if (!Number.isFinite(input.startsAt) || !Number.isFinite(input.endsAt) || input.endsAt <= input.startsAt) throw new MonetizationError('INVALID_DATES', 'Ngày kết thúc phải sau ngày bắt đầu.')
  return {
    code, percent: input.percent, targetPlan: input.targetPlan, billingCycle: input.billingCycle,
    maxRedemptions: input.maxRedemptions, startsAt: input.startsAt, endsAt: input.endsAt,
    ...(input.targetUid?.trim() ? { targetUid: input.targetUid.trim() } : {}),
    ...(input.note?.trim() ? { note: input.note.trim().slice(0, 240) } : {}),
  }
}

export async function listDiscountCodes() {
  const snapshot = await db().ref('monetization/discountCodes').get()
  return Object.values((snapshot.val() || {}) as Record<string, DiscountCode>).sort((a, b) => b.createdAt - a.createdAt)
}

export async function createDiscountCode(input: CreateDiscountInput, adminUid: string) {
  const validated = validateDiscountInput(input)
  const reason = validateAuditReason(input.reason)
  const now = Date.now()
  const discount: DiscountCode = { ...validated, redemptionCount: 0, status: 'active', createdBy: adminUid, createdAt: now, updatedAt: now }
  const audit = await createPendingAudit({ action: 'discount_code_created', actorUid: adminUid, targetId: validated.code, reason, after: discount })
  try {
    const result = await db().ref(`monetization/discountCodes/${validated.code}`).transaction((current) => current || discount, undefined, false)
    if (!result.committed || (result.snapshot.val() as DiscountCode).createdAt !== now) throw new MonetizationError('CODE_EXISTS', 'Mã giảm giá này đã tồn tại.', 409)
    await finishAudit(audit.id, 'succeeded', { after: discount })
    return discount
  } catch (error) {
    await finishAudit(audit.id, 'failed', { errorCode: error instanceof MonetizationError ? error.code : 'DISCOUNT_CREATE_FAILED' }).catch(() => undefined)
    throw error
  }
}

export async function updateDiscountCode(codeValue: string, input: Partial<Pick<DiscountCode, 'maxRedemptions' | 'startsAt' | 'endsAt' | 'targetUid' | 'note' | 'status'>> & { reason: string }, adminUid: string) {
  const code = normalizeDiscountCode(codeValue)
  const ref = db().ref(`monetization/discountCodes/${code}`)
  const reason = validateAuditReason(input.reason)
  const beforeSnapshot = await ref.get()
  if (!beforeSnapshot.exists()) throw new MonetizationError('NOT_FOUND', 'Không tìm thấy mã giảm giá.', 404)
  const before = beforeSnapshot.val() as DiscountCode
  const audit = await createPendingAudit({ action: 'discount_code_updated', actorUid: adminUid, targetId: code, reason, before })
  let failure: MonetizationError | null = null
  try {
    const result = await ref.transaction((current: DiscountCode | null) => {
    if (!current) { failure = new MonetizationError('NOT_FOUND', 'Không tìm thấy mã giảm giá.', 404); return }
    const next = { ...current }
    if (input.status && ['active', 'paused', 'archived'].includes(input.status)) next.status = input.status as DiscountStatus
    if (input.maxRedemptions !== undefined) {
      if (!Number.isInteger(input.maxRedemptions) || input.maxRedemptions < current.redemptionCount) { failure = new MonetizationError('INVALID_LIMIT', 'Giới hạn mới không được nhỏ hơn số lượt đã dùng.'); return }
      next.maxRedemptions = input.maxRedemptions
    }
    if (input.startsAt !== undefined) next.startsAt = input.startsAt
    if (input.endsAt !== undefined) next.endsAt = input.endsAt
    if (next.endsAt <= next.startsAt) { failure = new MonetizationError('INVALID_DATES', 'Ngày kết thúc phải sau ngày bắt đầu.'); return }
    if (input.targetUid !== undefined) next.targetUid = input.targetUid.trim() || undefined
    if (input.note !== undefined) next.note = input.note.trim().slice(0, 240) || undefined
    next.updatedAt = Date.now()
    return JSON.parse(JSON.stringify(next))
    }, undefined, false)
    if (!result.committed) throw failure || new MonetizationError('UPDATE_FAILED', 'Không thể cập nhật mã giảm giá.')
    const after = result.snapshot.val() as DiscountCode
    await finishAudit(audit.id, 'succeeded', { after })
    return after
  } catch (error) {
    await finishAudit(audit.id, 'failed', { errorCode: error instanceof MonetizationError ? error.code : 'DISCOUNT_UPDATE_FAILED' }).catch(() => undefined)
    throw error
  }
}

async function readDiscountContext(codeValue: string, uid: string) {
  const code = normalizeDiscountCode(codeValue)
  const [discountSnapshot, redemptionSnapshot] = await Promise.all([
    db().ref(`monetization/discountCodes/${code}`).get(),
    db().ref(`monetization/discountRedemptions/${code}/${uid}`).get(),
  ])
  if (!discountSnapshot.exists()) throw new MonetizationError('NOT_FOUND', 'Mã giảm giá không tồn tại.', 404)
  const discount = discountSnapshot.val() as DiscountCode
  const unavailable = discountAvailability(discount, uid, redemptionSnapshot.exists())
  if (unavailable) throw new MonetizationError('CODE_UNAVAILABLE', unavailable, 409)
  return discount
}

function assertDiscountSelection(discount: DiscountCode, expectedPlan?: PaidPlan, expectedCycle?: BillingCycle) {
  if (expectedPlan && discount.targetPlan !== expectedPlan) throw new MonetizationError('PLAN_MISMATCH', `Mã này chỉ áp dụng cho gói ${discount.targetPlan === 'ultra' ? 'CinePass Ultra' : 'CinePass Plus'}.`, 409)
  if (expectedCycle && discount.billingCycle !== expectedCycle) throw new MonetizationError('CYCLE_MISMATCH', `Mã này chỉ áp dụng cho chu kỳ ${discount.billingCycle === 'annual' ? '1 năm' : '1 tháng'}.`, 409)
}

export async function quoteDiscount(codeValue: string, uid: string, expectedPlan?: PaidPlan, expectedCycle?: BillingCycle): Promise<DiscountQuote> {
  const discount = await readDiscountContext(codeValue, uid)
  assertDiscountSelection(discount, expectedPlan, expectedCycle)
  const price = await getPaidPlanPrice(discount.targetPlan, discount.billingCycle)
  return buildDiscountQuote(discount, price.amount, price.versionId)
}

export async function redeemFreeDiscount(codeValue: string, uid: string, expectedPlan?: PaidPlan, expectedCycle?: BillingCycle, expectedPlanVersionId?: string) {
  const code = normalizeDiscountCode(codeValue)
  const rootRef = db().ref('monetization')
  const now = Date.now()
  const auditKey = rootRef.child('auditLogs').push().key!
  const discountRef = rootRef.child(`discountCodes/${code}`)
  const claimRef = rootRef.child(`discountRedemptions/${code}/${uid}`)
  const entitlementRef = rootRef.child(`entitlements/${uid}`)
  const [discountSnapshot, redemptionSnapshot, entitlementSnapshot] = await Promise.all([
    discountRef.get(), claimRef.get(), entitlementRef.get(),
  ])
  if (!discountSnapshot.exists()) throw new MonetizationError('NOT_FOUND', 'Mã giảm giá không tồn tại.', 404)
  const initialDiscount = discountSnapshot.val() as DiscountCode
  const unavailable = discountAvailability(initialDiscount, uid, redemptionSnapshot.exists(), now)
  if (unavailable) throw new MonetizationError('CODE_UNAVAILABLE', unavailable, 409)
  assertDiscountSelection(initialDiscount, expectedPlan, expectedCycle)
  const price = await getPaidPlanPrice(initialDiscount.targetPlan, initialDiscount.billingCycle)
  if (expectedPlanVersionId && expectedPlanVersionId !== price.versionId) throw new MonetizationError('PRICE_CHANGED', 'Bảng giá đã thay đổi. Vui lòng áp dụng lại mã giảm giá.', 409)
  const quote = buildDiscountQuote(initialDiscount, price.amount, price.versionId)
  if (quote.finalAmount !== 0) throw new MonetizationError('PAYMENT_REQUIRED', 'Mã này chưa giảm toàn bộ giá gói. Cần hoàn tất thanh toán trước khi nâng cấp.', 402)

  const currentEntitlement = resolveEntitlement(uid, entitlementSnapshot.exists() ? entitlementSnapshot.val() as AccountEntitlement : null, now)
  if (PLAN_RANK[currentEntitlement.plan] > PLAN_RANK[initialDiscount.targetPlan]) throw new MonetizationError('DOWNGRADE_NOT_ALLOWED', 'Không thể dùng mã để hạ gói đang còn hiệu lực.', 409)

  const claimId = crypto.randomUUID()
  const claimResult = await claimRef.transaction((current) => current || { status: 'processing', claimId, createdAt: now }, undefined, false)
  if (!claimResult.committed || claimResult.snapshot.val()?.claimId !== claimId) throw new MonetizationError('CODE_ALREADY_USED', 'Bạn đã sử dụng mã giảm giá này.', 409)

  let transactionFailure: MonetizationError | null = null
  const discountResult = await discountRef.transaction((current: DiscountCode | null) => {
    const discount = current || initialDiscount
    const nextUnavailable = discountAvailability(discount, uid, false, now)
    if (nextUnavailable) { transactionFailure = new MonetizationError('CODE_UNAVAILABLE', nextUnavailable, 409); return }
    try { assertDiscountSelection(discount, expectedPlan, expectedCycle) }
    catch (error) { transactionFailure = error as MonetizationError; return }
    return { ...discount, redemptionCount: discount.redemptionCount + 1, updatedAt: now }
  }, undefined, false)

  if (!discountResult.committed) {
    await claimRef.remove().catch(() => undefined)
    throw transactionFailure || new MonetizationError('REDEEM_FAILED', 'Không thể giữ lượt sử dụng mã. Vui lòng thử lại.')
  }

  const discount = discountResult.snapshot.val() as DiscountCode
  const baseTime = currentEntitlement.plan === discount.targetPlan && currentEntitlement.expiresAt && currentEntitlement.expiresAt > now ? currentEntitlement.expiresAt : now
  const expiresAt = addBillingCycle(baseTime, discount.billingCycle)
  const entitlement: AccountEntitlement = {
    uid, plan: discount.targetPlan, billingCycle: discount.billingCycle, status: 'active',
    startsAt: now, expiresAt, autoRenew: false, source: 'discount', sourceId: code, updatedAt: now,
  }
  const redemption: DiscountRedemption = {
    uid, code, plan: discount.targetPlan, billingCycle: discount.billingCycle, percent: discount.percent,
    originalAmount: quote.originalAmount, discountAmount: quote.discountAmount, finalAmount: 0,
    redeemedAt: now, entitlementExpiresAt: expiresAt, planVersionId: quote.planVersionId,
  }

  try {
    await rootRef.update({
      [`discountRedemptions/${code}/${uid}`]: redemption,
      [`entitlements/${uid}`]: entitlement,
      [`auditLogs/${auditKey}`]: { id: auditKey, action: 'discount_redeemed', actorUid: uid, targetUid: uid, code, plan: discount.targetPlan, createdAt: now },
    })
  } catch (error) {
    await discountRef.transaction((current: DiscountCode | null) => current ? { ...current, redemptionCount: Math.max(0, current.redemptionCount - 1), updatedAt: Date.now() } : current, undefined, false).catch(() => undefined)
    await claimRef.remove().catch(() => undefined)
    throw error
  }
  return entitlement
}

export async function getUserEntitlement(uid: string) {
  const [snapshot, restrictionSnapshot] = await Promise.all([db().ref(`monetization/entitlements/${uid}`).get(), db().ref(`entitlementRestrictions/${uid}`).get()])
  if (activeRestriction(restrictionSnapshot.exists() ? restrictionSnapshot.val() as EntitlementRestriction : null)) {
    return { uid, plan: 'normal', billingCycle: null, status: 'active', startsAt: null, expiresAt: null, autoRenew: false, source: 'default', updatedAt: Date.now() } as AccountEntitlement
  }
  return resolveEntitlement(uid, snapshot.exists() ? snapshot.val() as AccountEntitlement : null)
}

function vietnamDateKey(now: number) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

function nextVietnamMidnight(now: number) {
  const vietnam = new Date(now + 7 * 60 * 60_000)
  return Date.UTC(vietnam.getUTCFullYear(), vietnam.getUTCMonth(), vietnam.getUTCDate() + 1) - 7 * 60 * 60_000
}

interface WatchAccessRuntimeRequest {
  requestId: string
  targetHash: string
  claimId: string
  createdAt: number
  expiresAt: number
}

interface WatchAccessRuntimeState {
  requests?: Record<string, WatchAccessRuntimeRequest>
}

const WATCH_REQUEST_TTL_MS = 24 * 60 * 60_000
const MAX_WATCH_REQUESTS = 50

async function reserveWatchRequest(uid: string, movieSlug: string, episodeKey: string, requestId: string) {
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(requestId)) throw new MonetizationError('INVALID_REQUEST_ID', 'Mã phiên xem không hợp lệ.')
  const now = Date.now()
  const targetHash = createHash('sha256').update(`${movieSlug}\n${episodeKey}`).digest('base64url')
  const claimId = randomUUID()
  const ref = db().ref(`monetization/watchAccessRuntime/${uid}`)
  let failure: MonetizationError | null = null
  const result = await ref.transaction((current: WatchAccessRuntimeState | null) => {
    const requests = { ...(current?.requests || {}) }
    Object.entries(requests).filter(([, value]) => value.expiresAt <= now).forEach(([id]) => { delete requests[id] })
    const existing = requests[requestId]
    if (existing) {
      if (existing.targetHash !== targetHash) { failure = new MonetizationError('REQUEST_TARGET_MISMATCH', 'Mã phiên đã được dùng cho một tập khác.', 409); return }
      return { requests }
    }
    requests[requestId] = { requestId, targetHash, claimId, createdAt: now, expiresAt: now + WATCH_REQUEST_TTL_MS }
    const keep = Object.values(requests).sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_WATCH_REQUESTS)
    return { requests: Object.fromEntries(keep.map((item) => [item.requestId, item])) }
  }, undefined, false)
  if (!result.committed) throw failure || new MonetizationError('WATCH_REQUEST_FAILED', 'Không thể tạo phiên xem.', 503)
}

export async function claimWatchAccess(uid: string, movieSlugValue: string, episodeKeyValue: string, requestId: string, context: 'solo' | 'watch_party' = 'solo', roomId = '') {
  const movieSlug = movieSlugValue.trim().slice(0, 160)
  const episodeKey = episodeKeyValue.trim().slice(0, 240)
  if (!movieSlug || !episodeKey) throw new MonetizationError('INVALID_WATCH_TARGET', 'Phim hoặc tập phim không hợp lệ.')
  await reserveWatchRequest(uid, movieSlug, episodeKey, requestId)
  const entitlement = await getUserEntitlement(uid)
  const capabilities = PLAN_CAPABILITIES[entitlement.plan]
  let usagePayload: DailyUsage | null = null
  if (capabilities.moviesPerDay !== null && capabilities.episodesPerMoviePerDay !== null) {
    const now = Date.now()
    const date = vietnamDateKey(now)
    const movieKey = Buffer.from(movieSlug).toString('base64url')
    const resetsAt = nextVietnamMidnight(now)
    const usageRef = db().ref(`monetization/dailyWatchUsage/${date}/${uid}`)
    const initialSnapshot = await usageRef.get()
    const initialUsage = initialSnapshot.exists() ? initialSnapshot.val() as DailyWatchUsageRecord : null
    let failure: MonetizationError | null = null
    const result = await usageRef.transaction((current: DailyWatchUsageRecord | null) => {
      const claim = claimDailyWatchUsage(current || initialUsage, { date, movieSlug, movieKey, episodeKey, moviesLimit: capabilities.moviesPerDay!, episodesLimit: capabilities.episodesPerMoviePerDay!, resetsAt, now })
      if (!claim.allowed) {
        failure = new MonetizationError(claim.code, claim.code === 'MOVIE_DAILY_LIMIT' ? `CinePass xem tối đa ${capabilities.moviesPerDay} phim khác nhau mỗi ngày.` : `CinePass xem tối đa ${capabilities.episodesPerMoviePerDay} tập trong một phim mỗi ngày.`, 403, { usage: claim.usage })
        return
      }
      return claim.record
    }, undefined, false)
    if (!result.committed) throw failure || new MonetizationError('WATCH_ACCESS_FAILED', 'Không thể kiểm tra giới hạn xem. Vui lòng thử lại.', 503)
    const usage = result.snapshot.val() as DailyWatchUsageRecord
    usagePayload = { date, moviesUsed: usage.movies.length, moviesLimit: capabilities.moviesPerDay, episodesUsed: usage.episodesByMovie[movieKey]?.length || 0, episodesLimit: capabilities.episodesPerMoviePerDay, resetsAt }
  }
  const viewSession = context === 'solo'
    ? await assignAffiliateForWatch(uid, entitlement.plan, movieSlug, episodeKey, requestId)
    : { id: requestId, affiliate: null }
  const playbackGrant = await issuePlaybackGrant(uid, { movieSlug, episodeKey, source: context, roomId, grantId: requestId })
  return {
    allowed: true,
    plan: entitlement.plan,
    usage: usagePayload,
    viewSession,
    playbackGrant,
  }
}
