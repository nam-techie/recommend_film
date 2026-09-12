import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/firebase-admin'
import { getUserAnalyticsSummary } from '@/lib/server/admin-user-insights'
import { apiError } from '@/lib/server/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await requireUser(request)
    const value = new URL(request.url).searchParams.get('range')
    const range = value === '90d' ? '90d' : '30d'
    return NextResponse.json(await getUserAnalyticsSummary(user.uid, range), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return apiError(error, 'Không thể tải thời gian xem đã xác minh.') }
}
