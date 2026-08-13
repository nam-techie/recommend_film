import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { setCommunityFollow } from '@/lib/server/community'

export const dynamic = 'force-dynamic'
export async function PUT(request: Request, { params }: { params: { targetUid: string } }) {
  try { const identity = await requireUser(request); const body = await request.json() as { following?: boolean }; return NextResponse.json(await setCommunityFollow(identity.uid, params.targetUid, Boolean(body.following))) }
  catch (error) { return apiError(error, 'Không thể cập nhật theo dõi.') }
}
