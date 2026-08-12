import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { getCommunityFeed } from '@/lib/server/community'

export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try {
    const identity = await requireUser(request)
    const tab = new URL(request.url).searchParams.get('tab') === 'following' ? 'following' : 'trending'
    return NextResponse.json(await getCommunityFeed(identity.uid, tab), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return apiError(error, 'Không thể tải community feed.') }
}
