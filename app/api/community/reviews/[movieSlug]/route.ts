import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { deleteCommunityReview } from '@/lib/server/community'

export const dynamic = 'force-dynamic'
export async function DELETE(request: Request, { params }: { params: { movieSlug: string } }) {
  try { const identity = await requireUser(request); return NextResponse.json(await deleteCommunityReview(identity.uid, params.movieSlug)) }
  catch (error) { return apiError(error, 'Không thể xóa review.') }
}
