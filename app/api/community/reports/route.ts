import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { createCommunityReport } from '@/lib/server/community'

export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  try {
    const identity = await requireUser(request)
    return NextResponse.json(await createCommunityReport(identity.uid, await request.json()), { status: 201 })
  } catch (error) { return apiError(error, 'Không thể gửi báo cáo.') }
}
