import { NextResponse } from 'next/server'
import { requireAdminPermission } from '@/lib/server/firebase-admin'
import { reviewGithubStarClaim } from '@/lib/server/github-star'
import { consumeAdminApproval, parseAdminMutationJson } from '@/lib/server/admin-approval'
import { apiError } from '@/lib/server/api-response'

export async function PATCH(request: Request, { params }: { params: { claimId: string } }) {
  try {
    const admin = await requireAdminPermission(request, 'entitlement.manage')
    const payloadJson = await request.text()
    const body = parseAdminMutationJson<{ action: 'approve' | 'reject' | 'request_proof'; reason: string; expectedRevision: number; confirmed?: boolean }>(payloadJson)
    await consumeAdminApproval(request, admin, 'github_star_claim_review', params.claimId, payloadJson)
    if (body.confirmed !== true) return NextResponse.json({ error: 'Cần xác nhận lần hai.' }, { status: 400 })
    return NextResponse.json({ claim: await reviewGithubStarClaim(params.claimId, admin, body) })
  } catch (error) { return apiError(error, 'Không thể duyệt yêu cầu GitHub Star.') }
}
