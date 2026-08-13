import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { deleteCommunityReply } from '@/lib/server/community'

export const dynamic = 'force-dynamic'
export async function DELETE(request: Request, { params }: { params: { movieSlug: string; authorUid: string; replyId: string } }) {
  try { const identity = await requireUser(request); return NextResponse.json(await deleteCommunityReply(identity.uid, params.movieSlug, params.authorUid, params.replyId)) }
  catch (error) { return apiError(error, 'Không thể xóa bình luận.') }
}
