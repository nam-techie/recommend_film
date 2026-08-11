import type { AccountPlan } from '@/lib/monetization'

export type AffiliateLinkStatus = 'active' | 'paused' | 'archived'

export interface AffiliateLink {
  id: string
  campaignName: string
  productTitle: string
  destinationUrl: string
  ctaLabel: string
  weight: number
  status: AffiliateLinkStatus
  startsAt: number
  endsAt: number
  createdBy: string
  createdAt: number
  updatedAt: number
}

export interface AffiliatePolicy {
  enabled: boolean
  updatedAt: number
  updatedBy?: string
}

export interface AffiliateCreative {
  assignmentId: string
  durationMs: 8000
  productTitle: string
  ctaLabel: string
  disclosure: string
  redirectPath: string
}

export interface AffiliateAssignment {
  id: string
  requestId: string
  uid: string
  linkId: string
  movieSlug: string
  episodeKey: string
  plan: AccountPlan
  productTitle: string
  ctaLabel: string
  assignedAt: number
  expiresAt: number
  impressionAt?: number
  clickAt?: number
}

export interface AffiliateRuntimeRequest {
  requestId: string
  targetHash: string
  decision: 'none' | 'interstitial'
  assignmentId?: string
  plan: AccountPlan
  createdAt: number
  expiresAt: number
}

export interface AffiliateLinkStats {
  impressions: number
  clicks: number
}

export function validateShopeeAffiliateUrl(value: string) {
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return false
    const host = url.hostname.toLowerCase().replace(/\.$/, '')
    return host === 'shopee.vn' || host.endsWith('.shopee.vn')
  } catch {
    return false
  }
}

export function weightedAffiliatePick<T extends { weight: number }>(items: T[], random = Math.random): T | null {
  const eligible = items.filter((item) => Number.isFinite(item.weight) && item.weight > 0)
  const total = eligible.reduce((sum, item) => sum + item.weight, 0)
  if (!eligible.length || total <= 0) return null
  let cursor = Math.min(0.999999999999, Math.max(0, random())) * total
  for (const item of eligible) {
    cursor -= item.weight
    if (cursor < 0) return item
  }
  return eligible[eligible.length - 1]
}

export function shouldShowAffiliate(plan: AccountPlan, nextPlusEligibleCount: number) {
  if (plan === 'ultra') return false
  if (plan === 'normal') return true
  return nextPlusEligibleCount > 0 && nextPlusEligibleCount % 3 === 0
}

export function affiliateLinkIsEligible(link: AffiliateLink, now = Date.now()) {
  return link.status === 'active' && link.startsAt <= now && link.endsAt > now && validateShopeeAffiliateUrl(link.destinationUrl)
}
