import { NextResponse } from 'next/server'
import { getDatabase } from 'firebase-admin/database'
import type { GithubStarClaim } from '@/lib/github-star'
import { requireAdminPermission, getFirebaseAdminApp } from '@/lib/server/firebase-admin'
import { downloadPrivateFile } from '@/lib/server/private-storage'
import { apiError } from '@/lib/server/api-response'

export async function GET(request: Request, { params }: { params: { claimId: string } }) {
  try {
    await requireAdminPermission(request, 'entitlement.manage')
    const snapshot = await getDatabase(getFirebaseAdminApp()).ref(`githubStar/claims/${params.claimId}`).get()
    if (!snapshot.exists()) return NextResponse.json({ error: 'Không tìm thấy claim.' }, { status: 404 })
    const claim = snapshot.val() as GithubStarClaim
    if (!claim.evidencePath) return NextResponse.json({ error: 'Claim không có evidence.' }, { status: 404 })
    const file = await downloadPrivateFile(claim.evidencePath)
    return new NextResponse(file, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store' } })
  } catch (error) { return apiError(error, 'Không thể tải evidence.') }
}
