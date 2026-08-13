export type AccountPlan = 'normal' | 'premium' | 'ultra'
export type PaidPlan = Exclude<AccountPlan, 'normal'>
export type BillingCycle = 'monthly' | 'annual'
export type DiscountStatus = 'active' | 'paused' | 'archived'
export type PlanVersionStatus = 'published' | 'cancelled'

export interface PlanDefinition {
  id: AccountPlan
  name: string
  monthlyPrice: number
  annualPrice: number
  description: string
  highlights: string[]
}

export interface PlanPriceVersion {
  id: string
  planId: PaidPlan
  monthlyPrice: number
  annualPrice: number
  saleEnabled: boolean
  effectiveAt: number
  status: PlanVersionStatus
  reason: string
  createdBy: string
  createdAt: number
  cancelledBy?: string
  cancelledAt?: number
}

export interface PlanCatalogEntry extends PlanDefinition {
  versionId: string
  effectiveAt: number
  saleEnabled: boolean
  source: 'builtin' | 'database' | 'fallback_unavailable'
}

export interface PlanCapabilities {
  moviesPerDay: number | null
  episodesPerMoviePerDay: number | null
  canCreateRoom: boolean
  roomAccessModes: Array<'public' | 'link_only' | 'password'>
  roomMaxMembers: number
  canChat: boolean
  canReact: boolean
  canUseVoice: boolean
}

export interface DailyUsage {
  date: string
  moviesUsed: number
  moviesLimit: number
  episodesUsed: number
  episodesLimit: number
  resetsAt: number
}

export interface DailyWatchUsageRecord {
  date: string
  movies: string[]
  episodesByMovie: Record<string, string[]>
  updatedAt: number
}

export function claimDailyWatchUsage(
  current: DailyWatchUsageRecord | null,
  input: { date: string; movieSlug: string; movieKey: string; episodeKey: string; moviesLimit: number; episodesLimit: number; resetsAt: number; now: number },
): { allowed: true; record: DailyWatchUsageRecord; usage: DailyUsage } | { allowed: false; code: 'MOVIE_DAILY_LIMIT' | 'EPISODE_DAILY_LIMIT'; usage: DailyUsage } {
  const record = current || { date: input.date, movies: [], episodesByMovie: {}, updatedAt: input.now }
  const movies = Array.isArray(record.movies) ? record.movies : []
  const episodes = Array.isArray(record.episodesByMovie?.[input.movieKey]) ? record.episodesByMovie[input.movieKey] : []
  const usage: DailyUsage = { date: input.date, moviesUsed: movies.length, moviesLimit: input.moviesLimit, episodesUsed: episodes.length, episodesLimit: input.episodesLimit, resetsAt: input.resetsAt }
  if (!movies.includes(input.movieSlug) && movies.length >= input.moviesLimit) return { allowed: false, code: 'MOVIE_DAILY_LIMIT', usage }
  if (!episodes.includes(input.episodeKey) && episodes.length >= input.episodesLimit) return { allowed: false, code: 'EPISODE_DAILY_LIMIT', usage }
  const next: DailyWatchUsageRecord = {
    date: input.date,
    movies: movies.includes(input.movieSlug) ? movies : [...movies, input.movieSlug],
    episodesByMovie: { ...(record.episodesByMovie || {}), [input.movieKey]: episodes.includes(input.episodeKey) ? episodes : [...episodes, input.episodeKey] },
    updatedAt: input.now,
  }
  return { allowed: true, record: next, usage: { ...usage, moviesUsed: next.movies.length, episodesUsed: next.episodesByMovie[input.movieKey].length } }
}

export interface WatchAccessResponse {
  allowed: true
  plan: AccountPlan
  usage: DailyUsage | null
  viewSession: {
    id: string
    affiliate: import('@/lib/affiliate').AffiliateCreative | null
  }
}

export interface AccountEntitlement {
  uid: string
  plan: AccountPlan
  billingCycle: BillingCycle | null
  status: 'active' | 'expired' | 'cancelled'
  startsAt: number | null
  expiresAt: number | null
  autoRenew: boolean
  source: 'default' | 'discount' | 'payment' | 'admin_gift' | 'github_star'
  sourceId?: string
  updatedAt: number
}

export interface DiscountCode {
  code: string
  percent: number
  targetPlan: PaidPlan
  billingCycle: BillingCycle
  maxRedemptions: number
  redemptionCount: number
  startsAt: number
  endsAt: number
  status: DiscountStatus
  targetUid?: string
  note?: string
  createdBy: string
  createdAt: number
  updatedAt: number
}

export interface DiscountRedemption {
  uid: string
  code: string
  plan: PaidPlan
  billingCycle: BillingCycle
  percent: number
  originalAmount: number
  discountAmount: number
  finalAmount: number
  redeemedAt: number
  entitlementExpiresAt: number
  planVersionId?: string
}

export interface DiscountQuote {
  code: string
  percent: number
  targetPlan: PaidPlan
  billingCycle: BillingCycle
  originalAmount: number
  discountAmount: number
  finalAmount: number
  startsAt: number
  endsAt: number
  canActivateWithoutPayment: boolean
  planVersionId: string
}

export const PLAN_DEFINITIONS: Record<AccountPlan, PlanDefinition> = {
  normal: {
    id: 'normal', name: 'CinePass', monthlyPrice: 0, annualPrice: 0,
    description: 'Khám phá CineMind miễn phí với giới hạn xem mỗi ngày.',
    highlights: ['3 phim khác nhau mỗi ngày', '5 tập trong mỗi phim mỗi ngày', 'Tham gia phòng xem ở chế độ chỉ xem'],
  },
  premium: {
    id: 'premium', name: 'CinePass Plus', monthlyPrice: 39_000, annualPrice: 390_000,
    description: 'Xem không giới hạn và mở các tính năng phòng riêng.',
    highlights: ['Xem phim không giới hạn', 'Ít nội dung tài trợ hơn CinePass', 'Phòng link riêng tối đa 8 người', 'Chat, reaction và điều khiển phát'],
  },
  ultra: {
    id: 'ultra', name: 'CinePass Ultra', monthlyPrice: 69_000, annualPrice: 690_000,
    description: 'Trọn bộ trải nghiệm CineMind dành cho người dùng cao cấp.',
    highlights: ['Toàn bộ quyền lợi CinePass Plus', 'Phòng công khai hoặc có mật khẩu', 'Voice chat và co-host', 'Tối đa 50 người trong phòng', 'Ẩn hoàn toàn nội dung tài trợ'],
  },
}

export const PLAN_CAPABILITIES: Record<AccountPlan, PlanCapabilities> = {
  normal: {
    moviesPerDay: 3, episodesPerMoviePerDay: 5, canCreateRoom: false,
    roomAccessModes: [], roomMaxMembers: 0, canChat: false, canReact: false, canUseVoice: false,
  },
  premium: {
    moviesPerDay: null, episodesPerMoviePerDay: null, canCreateRoom: true,
    roomAccessModes: ['link_only'], roomMaxMembers: 8, canChat: true, canReact: true, canUseVoice: false,
  },
  ultra: {
    moviesPerDay: null, episodesPerMoviePerDay: null, canCreateRoom: true,
    roomAccessModes: ['public', 'link_only', 'password'], roomMaxMembers: 50, canChat: true, canReact: true, canUseVoice: true,
  },
}

export const PLAN_RANK: Record<AccountPlan, number> = { normal: 0, premium: 1, ultra: 2 }

export function builtinPlanCatalogEntry(planId: AccountPlan, source: PlanCatalogEntry['source'] = 'builtin'): PlanCatalogEntry {
  return {
    ...PLAN_DEFINITIONS[planId],
    versionId: 'builtin-v1',
    effectiveAt: 0,
    saleEnabled: source !== 'fallback_unavailable',
    source,
  }
}

export function resolveEffectivePlanVersion(versions: Record<string, PlanPriceVersion> | null | undefined, now = Date.now()) {
  return Object.values(versions || {})
    .filter((version) => version.status === 'published' && version.effectiveAt <= now)
    .sort((a, b) => b.effectiveAt - a.effectiveAt || b.createdAt - a.createdAt)[0] || null
}

export function mergeCatalogEntry(planId: PaidPlan, version: PlanPriceVersion | null, source: PlanCatalogEntry['source'] = version ? 'database' : 'builtin'): PlanCatalogEntry {
  if (!version) return builtinPlanCatalogEntry(planId, source)
  return {
    ...PLAN_DEFINITIONS[planId],
    monthlyPrice: version.monthlyPrice,
    annualPrice: version.annualPrice,
    versionId: version.id,
    effectiveAt: version.effectiveAt,
    saleEnabled: version.saleEnabled,
    source,
  }
}

export function normalizeDiscountCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '')
}

export function isDiscountCodeValid(value: string) {
  return /^[A-Z0-9_-]{3,32}$/.test(normalizeDiscountCode(value))
}

export function planPrice(plan: PaidPlan, billingCycle: BillingCycle) {
  return billingCycle === 'annual' ? PLAN_DEFINITIONS[plan].annualPrice : PLAN_DEFINITIONS[plan].monthlyPrice
}

export function priceFromCatalog(entry: Pick<PlanDefinition, 'monthlyPrice' | 'annualPrice'>, billingCycle: BillingCycle) {
  return billingCycle === 'annual' ? entry.annualPrice : entry.monthlyPrice
}

export function validatePlanPriceInput(input: Pick<PlanPriceVersion, 'monthlyPrice' | 'annualPrice' | 'effectiveAt' | 'reason'>) {
  if (!Number.isInteger(input.monthlyPrice) || input.monthlyPrice < 1_000 || input.monthlyPrice > 100_000_000) return 'Giá tháng phải là số nguyên từ 1.000đ đến 100.000.000đ.'
  if (!Number.isInteger(input.annualPrice) || input.annualPrice < input.monthlyPrice || input.annualPrice > input.monthlyPrice * 12) return 'Giá năm phải từ giá một tháng đến tối đa 12 tháng.'
  if (!Number.isFinite(input.effectiveAt)) return 'Thời điểm áp dụng không hợp lệ.'
  const reason = input.reason?.trim() || ''
  if (reason.length < 3 || reason.length > 240) return 'Lý do cần từ 3 đến 240 ký tự.'
  return null
}

export function addBillingCycle(startAt: number, cycle: BillingCycle) {
  const date = new Date(startAt)
  const day = date.getUTCDate()
  date.setUTCDate(1)
  if (cycle === 'annual') date.setUTCFullYear(date.getUTCFullYear() + 1)
  else date.setUTCMonth(date.getUTCMonth() + 1)
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
  date.setUTCDate(Math.min(day, lastDay))
  return date.getTime()
}

export function resolveEntitlement(uid: string, stored?: Partial<AccountEntitlement> | null, now = Date.now()): AccountEntitlement {
  const plan = stored?.plan === 'premium' || stored?.plan === 'ultra' ? stored.plan : 'normal'
  const expiresAt = typeof stored?.expiresAt === 'number' ? stored.expiresAt : null
  if (plan === 'normal' || !expiresAt || expiresAt <= now || stored?.status === 'cancelled') {
    return { uid, plan: 'normal', billingCycle: null, status: stored?.status === 'cancelled' ? 'cancelled' : expiresAt && expiresAt <= now ? 'expired' : 'active', startsAt: null, expiresAt, autoRenew: false, source: 'default', updatedAt: stored?.updatedAt || now }
  }
  return {
    uid,
    plan,
    billingCycle: stored?.billingCycle === 'annual' ? 'annual' : 'monthly',
    status: 'active',
    startsAt: typeof stored?.startsAt === 'number' ? stored.startsAt : now,
    expiresAt,
    autoRenew: stored?.autoRenew === true,
    source: stored?.source === 'discount' || stored?.source === 'payment' || (stored?.source === 'admin_gift' || stored?.source === 'github_star') ? stored.source : 'discount',
    ...(stored?.sourceId ? { sourceId: stored.sourceId } : {}),
    updatedAt: stored?.updatedAt || now,
  }
}

export function buildDiscountQuote(discount: Pick<DiscountCode, 'code' | 'percent' | 'targetPlan' | 'billingCycle' | 'startsAt' | 'endsAt'>, price?: number, planVersionId = 'builtin-v1'): DiscountQuote {
  const originalAmount = price ?? planPrice(discount.targetPlan, discount.billingCycle)
  const discountAmount = Math.floor(originalAmount * discount.percent / 100)
  const finalAmount = Math.max(0, originalAmount - discountAmount)
  return { ...discount, originalAmount, discountAmount, finalAmount, canActivateWithoutPayment: finalAmount === 0, planVersionId }
}

export function discountAvailability(discount: DiscountCode, uid: string, hasRedeemed: boolean, now = Date.now()) {
  if (discount.status !== 'active') return 'Mã giảm giá đang tạm dừng.'
  if (discount.startsAt > now) return 'Mã giảm giá chưa bắt đầu.'
  if (discount.endsAt <= now) return 'Mã giảm giá đã hết hạn.'
  if (discount.redemptionCount >= discount.maxRedemptions) return 'Mã giảm giá đã hết lượt sử dụng.'
  if (discount.targetUid && discount.targetUid !== uid) return 'Mã giảm giá không áp dụng cho tài khoản này.'
  if (hasRedeemed) return 'Bạn đã sử dụng mã giảm giá này.'
  return null
}
