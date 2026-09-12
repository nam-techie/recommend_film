import { NextResponse } from 'next/server'
import { requireAdminPermission } from '@/lib/server/firebase-admin'
import { getAnalyticsHealth } from '@/lib/server/analytics'
import { apiError } from '@/lib/server/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireAdminPermission(request, 'analytics.read')
    return NextResponse.json(await getAnalyticsHealth(), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return apiError(error, 'Không thể tải trạng thái thu thập analytics.') }
}
