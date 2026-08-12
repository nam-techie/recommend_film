import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { setCommunityReviewLike } from '@/lib/server/community'

export const dynamic = 'force-dynamic'
export async function PUT(request: Request, { params }: { params: { movieSlug: string; authorUid: string } }) {
  try { const identity = await requireUser(request); const body = await request.json() as { liked?: boolean }; return NextResponse.json(await setCommunityReviewLike(identity.uid, params.movieSlug, params.authorUid, Boolean(body.liked))) }
  catch (error) { return apiError(error, 'Không thể cập nhật lượt thích.') }
}
