import { NextResponse } from 'next/server'
import { getDatabase } from 'firebase-admin/database'
import { requireAdminPermission, getFirebaseAdminApp } from '@/lib/server/firebase-admin'
import { getGithubCampaign } from '@/lib/server/github-star'
import { apiError } from '@/lib/server/api-response'
import type { GithubStarClaim } from '@/lib/github-star'

export async function GET(request: Request) {
  try {
    await requireAdminPermission(request, 'entitlement.manage')
    const snapshot = await getDatabase(getFirebaseAdminApp()).ref('githubStar/claims').get()
    const claims = Object.values((snapshot.val() || {}) as Record<string, GithubStarClaim>).sort((a, b) => b.createdAt - a.createdAt)
    return NextResponse.json({ campaign: await getGithubCampaign(), claims })
  } catch (error) { return apiError(error, 'Không thể tải hàng đợi GitHub Star.') }
}
