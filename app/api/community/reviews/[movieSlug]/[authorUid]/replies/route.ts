import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { addCommunityReply } from '@/lib/server/community'

export const dynamic = 'force-dynamic'
export async function POST(request: Request, { params }: { params: { movieSlug: string; authorUid: string } }) {
  try { const identity = await requireUser(request); const body = await request.json() as { content?: string }; return NextResponse.json(await addCommunityReply(identity.uid, params.movieSlug, params.authorUid, body.content || ''), { status: 201 }) }
  catch (error) { return apiError(error, 'Không thể gửi bình luận.') }
}
