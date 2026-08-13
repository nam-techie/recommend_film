import { NextResponse } from 'next/server'
import { AdminAccessError, requireAdminPermission } from '@/lib/server/firebase-admin'
import { createFeaturedDraft, listFeaturedContent } from '@/lib/server/content'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try { await requireAdminPermission(request, 'content.manage'); return NextResponse.json(await listFeaturedContent(), { headers: { 'Cache-Control': 'no-store' } }) }
  catch (error) { return contentError(error) }
}

export async function POST(request: Request) {
  try {
    const identity = await requireAdminPermission(request, 'content.manage')
    return NextResponse.json(await createFeaturedDraft(identity.uid, await request.json()), { status: 201 })
  } catch (error) { return contentError(error) }
}

function contentError(error: unknown) {
  if (error instanceof AdminAccessError) return NextResponse.json({ error: error.message }, { status: error.status })
  return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể xử lý nội dung.' }, { status: 400 })
}
