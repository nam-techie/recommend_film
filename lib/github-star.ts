import { createHmac, timingSafeEqual } from 'node:crypto'

export const GITHUB_STAR_CAMPAIGN_ID = 'star-plus-2026'

export type GithubStarClaimStatus = 'pending' | 'needs_proof' | 'approved' | 'rejected' | 'grace' | 'revoked' | 'expired'

export interface GithubStarCampaign {
  id: string
  enabled: boolean
  autoApprove: boolean
  grantsEnabled: boolean
  startsAt: number
  endsAt: number
  maxClaims: number
  manualReviewCount: number
  approvedCount: number
  reservedCount: number
  graceDays: number
  reconciliationStartedAt?: number
  lastReconciliationAt?: number
  reconciliationChecks?: number
  mismatchCount?: number
  reviewedCount?: number
  rejectedCount?: number
  updatedAt: number
  updatedBy: string
}

export interface GithubStarClaim {
  id: string
  campaignId: string
  uid: string
  email: string
  githubId: number
  githubLogin: string
  githubCreatedAt: string
  evidencePath?: string
  evidenceStatus: 'uploaded' | 'missing' | 'unavailable'
  starVerified: boolean
  verificationSource: 'repository_api' | 'webhook' | 'manual_evidence'
  status: GithubStarClaimStatus
  grantId?: string
  originalGrantEndsAt?: number
  graceEndsAt?: number
  reviewedAt?: number
  reviewedBy?: string
  reviewReason?: string
  createdAt: number
  updatedAt: number
  revision: number
}

export interface GithubStarState {
  githubId: number
  login: string
  starred: boolean
  starredAt?: number
  unstarredAt?: number
  updatedAt: number
  source: 'webhook' | 'reconciliation'
}

export function verifyGithubWebhookSignature(rawBody: string, signature: string, secret: string) {
  if (!signature.startsWith('sha256=') || !secret || !rawBody) return false
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`
  if (signature.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

export function campaignOpen(campaign: GithubStarCampaign, now = Date.now()) {
  return campaign.enabled && campaign.startsAt <= now && campaign.endsAt > now && campaign.approvedCount + campaign.reservedCount < campaign.maxClaims
}

export function needsManualReview(campaign: GithubStarCampaign) {
  return !campaign.autoApprove || campaign.approvedCount < campaign.manualReviewCount
}
