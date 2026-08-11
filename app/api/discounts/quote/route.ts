import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { quoteDiscount } from '@/lib/server/monetization'
import type { BillingCycle, PaidPlan } from '@/lib/monetization'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const user = await requireUser(request)
    const body = await request.json() as { code?: string; plan?: PaidPlan; billingCycle?: BillingCycle }
    return NextResponse.json({ quote: await quoteDiscount(body.code || '', user.uid, body.plan, body.billingCycle) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return apiError(error, 'Không thể kiểm tra mã giảm giá.') }
}
