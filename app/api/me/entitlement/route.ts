import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { getUserEntitlement } from '@/lib/server/monetization'
import { PLAN_CAPABILITIES } from '@/lib/monetization'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await requireUser(request)
    const entitlement = await getUserEntitlement(user.uid)
    return NextResponse.json({ entitlement, capabilities: PLAN_CAPABILITIES[entitlement.plan], serverNow: Date.now() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return apiError(error, 'Không thể tải thông tin gói.') }
}
