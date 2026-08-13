import { NextResponse } from 'next/server'
import { consumeAdminApproval, parseAdminMutationJson } from '@/lib/server/admin-approval'
import { AdminAccessError, requireAdminPermission } from '@/lib/server/firebase-admin'
import { moderateCommunityCase } from '@/lib/server/community'
import type { ModerationStatus } from '@/lib/community'

export const dynamic = 'force-dynamic'
export async function PATCH(request: Request, { params }: { params: { caseId: string } }) {
  try {
    const identity = await requireAdminPermission(request, 'community.moderate')
    const payloadJson = await request.text()
    const body = parseAdminMutationJson<{ status: ModerationStatus; action: 'hide' | 'restore' | 'remove' | 'dismiss'; reason: string }>(payloadJson)
    await consumeAdminApproval(request, identity, 'community_moderate', params.caseId, payloadJson)
    return NextResponse.json(await moderateCommunityCase(identity.uid, params.caseId, body))
  } catch (error) {
    if (error instanceof AdminAccessError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể moderation.' }, { status: 400 })
  }
}
