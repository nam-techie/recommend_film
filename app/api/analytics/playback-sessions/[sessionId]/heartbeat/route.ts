import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { heartbeatPlaybackSession } from '@/lib/server/analytics'
import type { PlaybackHeartbeat } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: { sessionId: string } }) {
  try {
    const user = await requireUser(request)
    const body = await request.json() as PlaybackHeartbeat
    return NextResponse.json(await heartbeatPlaybackSession(user.uid, params.sessionId, body), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return apiError(error, 'Không thể ghi nhận heartbeat.') }
}
