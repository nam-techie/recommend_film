import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { saveCommunityReview } from '@/lib/server/community'

export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  try { const identity = await requireUser(request); return NextResponse.json(await saveCommunityReview(identity.uid, await request.json())) }
  catch (error) { return apiError(error, 'Không thể lưu review.') }
}
