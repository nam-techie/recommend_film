import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { finalizePlaybackSession } from '@/lib/server/analytics'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: { sessionId: string } }) {
  try {
    const user = await requireUser(request)
    return NextResponse.json(await finalizePlaybackSession(user.uid, params.sessionId), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return apiError(error, 'Không thể kết thúc phiên analytics.') }
}
