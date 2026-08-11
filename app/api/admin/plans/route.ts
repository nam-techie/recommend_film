import { NextResponse } from 'next/server'
import { getAdminPlanSnapshot } from '@/lib/server/plan-catalog'
import { requireAdmin } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireAdmin(request)
    return NextResponse.json({ plans: await getAdminPlanSnapshot() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return apiError(error, 'Không thể tải bảng giá.') }
}
