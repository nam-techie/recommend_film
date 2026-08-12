import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { recordRecommendationEvents } from '@/lib/server/personalization'
import type { RecommendationEventInput } from '@/lib/personalization'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const identity = await requireUser(request)
    const body = await request.json() as { events?: RecommendationEventInput[] }
    return NextResponse.json(await recordRecommendationEvents(identity.uid, Array.isArray(body.events) ? body.events : []))
  } catch (error) { return apiError(error, 'Không thể ghi nhận tương tác gợi ý.') }
}
