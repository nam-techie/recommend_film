import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { claimWatchAccess } from '@/lib/server/monetization'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const user = await requireUser(request)
    const body = await request.json() as { movieSlug?: string; episodeKey?: string; requestId?: string; context?: 'solo' | 'watch_party'; roomId?: string }
    return NextResponse.json(await claimWatchAccess(user.uid, body.movieSlug || '', body.episodeKey || '', body.requestId || '', body.context || 'solo', body.roomId || ''), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return apiError(error, 'Không thể kiểm tra quyền xem phim.')
  }
}
