import { NextResponse } from 'next/server'
import { AdminAccessError, requireAdminPermission } from '@/lib/server/firebase-admin'
import { createFeaturedRollbackDraft } from '@/lib/server/content'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: { collectionId: string } }) {
  try {
    const identity = await requireAdminPermission(request, 'content.manage')
    const body = await request.json() as { versionId?: string; reason?: string }
    if (!body.versionId) throw new AdminAccessError(400, 'Thiếu version để rollback.')
    return NextResponse.json(await createFeaturedRollbackDraft(identity.uid, params.collectionId, body.versionId, body.reason || 'Tạo draft rollback'))
  } catch (error) {
    if (error instanceof AdminAccessError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể rollback.' }, { status: 400 })
  }
}
