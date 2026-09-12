import 'server-only'

import { getDatabase } from 'firebase-admin/database'
import {
  builtinPlanCatalogEntry,
  mergeCatalogEntry,
  priceFromCatalog,
  resolveEffectivePlanVersion,
  validatePlanPriceInput,
  type AccountPlan,
  type BillingCycle,
  type PaidPlan,
  type PlanCatalogEntry,
  type PlanPriceVersion,
} from '@/lib/monetization'
import { getFirebaseAdminApp } from '@/lib/server/firebase-admin'
import { MonetizationError } from '@/lib/server/monetization-error'
import { runAuditedMutation } from '@/lib/server/audit'

const paidPlans: PaidPlan[] = ['premium', 'ultra']

function database() { return getDatabase(getFirebaseAdminApp()) }

async function withTimeout<T>(promise: Promise<T>, timeoutMs = 2_500): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('PLAN_CATALOG_TIMEOUT')), timeoutMs) }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function getEffectivePlanCatalog(now = Date.now(), options: { failClosed?: boolean } = {}): Promise<Record<AccountPlan, PlanCatalogEntry>> {
  try {
    const snapshot = await withTimeout(database().ref('monetization/plans').get())
    const stored = (snapshot.val() || {}) as Record<PaidPlan, { versions?: Record<string, PlanPriceVersion> }>
    return {
      normal: builtinPlanCatalogEntry('normal'),
      premium: mergeCatalogEntry('premium', resolveEffectivePlanVersion(stored.premium?.versions, now)),
      ultra: mergeCatalogEntry('ultra', resolveEffectivePlanVersion(stored.ultra?.versions, now)),
    }
  } catch (error) {
    if (options.failClosed) throw new MonetizationError('PLAN_CATALOG_UNAVAILABLE', 'Bảng giá tạm thời không khả dụng.', 503)
    return {
      normal: builtinPlanCatalogEntry('normal'),
      premium: builtinPlanCatalogEntry('premium', 'fallback_unavailable'),
      ultra: builtinPlanCatalogEntry('ultra', 'fallback_unavailable'),
    }
  }
}

export async function getPaidPlanPrice(planId: PaidPlan, billingCycle: BillingCycle, options: { requireSale?: boolean } = {}) {
  const catalog = await getEffectivePlanCatalog(Date.now(), { failClosed: true })
  const plan = catalog[planId]
  if (options.requireSale !== false && !plan.saleEnabled) throw new MonetizationError('PLAN_NOT_FOR_SALE', 'Gói này hiện đang tạm dừng bán.', 409)
  return { amount: priceFromCatalog(plan, billingCycle), versionId: plan.versionId, plan }
}

export async function getAdminPlanSnapshot(now = Date.now()) {
  const snapshot = await withTimeout(database().ref('monetization/plans').get(), 5_000)
  const stored = (snapshot.val() || {}) as Record<PaidPlan, { versions?: Record<string, PlanPriceVersion> }>
  const result = {} as Record<PaidPlan, { current: PlanCatalogEntry; scheduled: PlanPriceVersion | null; history: PlanPriceVersion[] }>
  for (const planId of paidPlans) {
    const history = Object.values(stored[planId]?.versions || {}).sort((a, b) => b.effectiveAt - a.effectiveAt || b.createdAt - a.createdAt)
    const currentVersion = resolveEffectivePlanVersion(stored[planId]?.versions, now)
    const scheduled = history.filter((item) => item.status === 'published' && item.effectiveAt > now).sort((a, b) => a.effectiveAt - b.effectiveAt)[0] || null
    result[planId] = { current: mergeCatalogEntry(planId, currentVersion), scheduled, history }
  }
  return result
}

export interface CreatePlanVersionInput {
  monthlyPrice: number
  annualPrice: number
  saleEnabled: boolean
  effectiveAt?: number | null
  reason: string
  confirmed?: boolean
}

export async function createPlanVersion(planId: string, input: CreatePlanVersionInput, adminUid: string) {
  if (!paidPlans.includes(planId as PaidPlan)) throw new MonetizationError('INVALID_PLAN', 'Chỉ có thể chỉnh giá CinePass Plus hoặc Ultra.')
  if (input.confirmed !== true) throw new MonetizationError('CONFIRMATION_REQUIRED', 'Bạn cần xác nhận bước hai trước khi lưu.')
  const now = Date.now()
  const effectiveAt = input.effectiveAt == null ? now : Number(input.effectiveAt)
  const validation = validatePlanPriceInput({ monthlyPrice: input.monthlyPrice, annualPrice: input.annualPrice, effectiveAt, reason: input.reason })
  if (validation) throw new MonetizationError('INVALID_PLAN_PRICE', validation)
  const planRef = database().ref(`monetization/plans/${planId}`)
  const snapshot = await planRef.get()
  const versions = (snapshot.val()?.versions || {}) as Record<string, PlanPriceVersion>
  if (effectiveAt > now && Object.values(versions).some((version) => version.status === 'published' && version.effectiveAt > now)) {
    throw new MonetizationError('SCHEDULE_EXISTS', 'Gói này đã có một bảng giá đang chờ áp dụng. Hãy hủy lịch cũ trước.', 409)
  }
  if (Object.values(versions).some((version) => version.status === 'published' && version.effectiveAt === effectiveAt)) {
    throw new MonetizationError('EFFECTIVE_AT_EXISTS', 'Đã có một phiên bản giá ở đúng thời điểm này.', 409)
  }
  const id = planRef.child('versions').push().key!
  const version: PlanPriceVersion = {
    id,
    planId: planId as PaidPlan,
    monthlyPrice: input.monthlyPrice,
    annualPrice: input.annualPrice,
    saleEnabled: input.saleEnabled === true,
    effectiveAt,
    status: 'published',
    reason: input.reason.trim(),
    createdBy: adminUid,
    createdAt: now,
  }
  const { result } = await runAuditedMutation(
    { action: 'plan_version_created', actorUid: adminUid, targetId: `${planId}:${id}`, reason: version.reason, after: version },
    async () => { await database().ref(`monetization/plans/${planId}/versions/${id}`).set(version); return version },
  )
  return result
}

export async function cancelPlanVersion(planId: string, versionId: string, reason: string, adminUid: string) {
  if (!paidPlans.includes(planId as PaidPlan)) throw new MonetizationError('INVALID_PLAN', 'Gói không hợp lệ.')
  const cleanReason = reason.trim()
  if (cleanReason.length < 3 || cleanReason.length > 240) throw new MonetizationError('INVALID_REASON', 'Lý do cần từ 3 đến 240 ký tự.')
  const ref = database().ref(`monetization/plans/${planId}/versions/${versionId}`)
  let failure: MonetizationError | null = null
  const now = Date.now()
  const before = (await ref.get()).val() as PlanPriceVersion | null
  const { result: version } = await runAuditedMutation(
    { action: 'plan_version_cancelled', actorUid: adminUid, targetId: `${planId}:${versionId}`, reason: cleanReason, before },
    async () => {
      const result = await ref.transaction((current: PlanPriceVersion | null) => {
        if (!current) { failure = new MonetizationError('NOT_FOUND', 'Không tìm thấy phiên bản giá.', 404); return }
        if (current.status !== 'published' || current.effectiveAt <= now) { failure = new MonetizationError('VERSION_NOT_CANCELLABLE', 'Chỉ có thể hủy phiên bản chưa đến thời điểm áp dụng.', 409); return }
        return { ...current, status: 'cancelled', cancelledBy: adminUid, cancelledAt: now }
      }, undefined, false)
      if (!result.committed) throw failure || new MonetizationError('CANCEL_FAILED', 'Không thể hủy lịch giá.')
      return result.snapshot.val() as PlanPriceVersion
    },
  )
  return version
}
