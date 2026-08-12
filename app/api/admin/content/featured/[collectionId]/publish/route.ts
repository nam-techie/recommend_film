import { NextResponse } from 'next/server'
import { consumeAdminApproval, parseAdminMutationJson } from '@/lib/server/admin-approval'
import { AdminAccessError, requireAdminPermission } from '@/lib/server/firebase-admin'
import { publishFeaturedVersion } from '@/lib/server/content'

export const dynamic = 'force-dynamic'
export async function POST(request: Request, { params }: { params: { collectionId: string } }) {
  try {
    const identity = await requireAdminPermission(request, 'content.manage')
    const payloadJson = await request.text()
    const body = parseAdminMutationJson<{ versionId?: string; reason?: string }>(payloadJson)
    await consumeAdminApproval(request, identity, 'content_publish', params.collectionId, payloadJson)
    if (!body.versionId) throw new AdminAccessError(400, 'Thiếu version cần publish.')
    return NextResponse.json(await publishFeaturedVersion(identity.uid, params.collectionId, body.versionId, body.reason || 'Xuất bản nội dung'))
  } catch (error) {
    if (error instanceof AdminAccessError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể publish.' }, { status: 400 })
  }
}
