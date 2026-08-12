import { describe, expect, it } from 'vitest'
import { campaignOpen, needsManualReview, verifyGithubWebhookSignature, type GithubStarCampaign } from '@/lib/github-star'

const campaign = (overrides: Partial<GithubStarCampaign> = {}): GithubStarCampaign => ({ id: 'star-plus-2026', enabled: true, grantsEnabled: true, autoApprove: false, startsAt: 100, endsAt: 200, maxClaims: 500, manualReviewCount: 50, approvedCount: 0, reservedCount: 0, graceDays: 7, updatedAt: 100, updatedBy: 'admin', ...overrides })

describe('GitHub Star campaign guards', () => {
  it('validates webhook HMAC and rejects tampering', async () => {
    const { createHmac } = await import('node:crypto')
    const body = '{"action":"created"}'
    const signature = `sha256=${createHmac('sha256', 'secret').update(body).digest('hex')}`
    expect(verifyGithubWebhookSignature(body, signature, 'secret')).toBe(true)
    expect(verifyGithubWebhookSignature(`${body}x`, signature, 'secret')).toBe(false)
  })

  it('closes at quota/end and keeps first 50 manual', () => {
    expect(campaignOpen(campaign(), 150)).toBe(true)
    expect(campaignOpen(campaign({ reservedCount: 500 }), 150)).toBe(false)
    expect(campaignOpen(campaign(), 201)).toBe(false)
    expect(needsManualReview(campaign({ approvedCount: 49, autoApprove: true }))).toBe(true)
    expect(needsManualReview(campaign({ approvedCount: 50, autoApprove: true }))).toBe(false)
  })
})
