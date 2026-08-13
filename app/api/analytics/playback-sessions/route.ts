import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { startPlaybackSession } from '@/lib/server/analytics'
import type { PlaybackSessionStart } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const user = await requireUser(request)
    const body = await request.json() as PlaybackSessionStart
    return NextResponse.json(await startPlaybackSession(user.uid, body), { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return apiError(error, 'Không thể bắt đầu phiên analytics.') }
}
