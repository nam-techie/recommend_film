import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { getPersonalizedRecommendations, resetPersonalization } from '@/lib/server/personalization'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const identity = await requireUser(request)
    const limit = Math.max(1, Math.min(24, Number(new URL(request.url).searchParams.get('limit')) || 12))
    return NextResponse.json(await getPersonalizedRecommendations(identity.uid, limit), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return apiError(error, 'Không thể tải gợi ý cá nhân hóa.') }
}

export async function DELETE(request: Request) {
  try { const identity = await requireUser(request); return NextResponse.json(await resetPersonalization(identity.uid, false)) }
  catch (error) { return apiError(error, 'Không thể tắt cá nhân hóa.') }
}

export async function POST(request: Request) {
  try { const identity = await requireUser(request); return NextResponse.json(await resetPersonalization(identity.uid, true)) }
  catch (error) { return apiError(error, 'Không thể bật cá nhân hóa.') }
}
