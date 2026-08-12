import { NextResponse } from 'next/server'
import { consumeAdminApproval, parseAdminMutationJson } from '@/lib/server/admin-approval'
import { AdminAccessError, requireAdminPermission } from '@/lib/server/firebase-admin'
import { unpublishFeaturedCollection } from '@/lib/server/content'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: { collectionId: string } }) {
  try {
    const identity = await requireAdminPermission(request, 'content.manage')
    const payloadJson = await request.text()
    const body = parseAdminMutationJson<{ reason?: string }>(payloadJson)
    await consumeAdminApproval(request, identity, 'content_unpublish', params.collectionId, payloadJson)
    return NextResponse.json(await unpublishFeaturedCollection(identity.uid, params.collectionId, body.reason || 'Gỡ collection khỏi homepage'))
  } catch (error) {
    if (error instanceof AdminAccessError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể unpublish.' }, { status: 400 })
  }
}
