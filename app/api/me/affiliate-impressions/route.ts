import { NextResponse } from 'next/server'
import { recordAffiliateImpression } from '@/lib/server/affiliate'
import { requireUser } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'

export async function POST(request: Request) {
  try {
    const user = await requireUser(request)
    const body = await request.json() as { assignmentId?: string }
    return NextResponse.json(await recordAffiliateImpression(user.uid, body.assignmentId || ''))
  } catch (error) { return apiError(error, 'Không thể ghi nhận lượt hiển thị.') }
}
