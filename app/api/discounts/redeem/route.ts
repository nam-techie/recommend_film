import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { redeemFreeDiscount } from '@/lib/server/monetization'
import type { BillingCycle, PaidPlan } from '@/lib/monetization'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let body: { code?: string; plan?: PaidPlan; billingCycle?: BillingCycle; planVersionId?: string } = {}
  let uid = ''
  try {
    const user = await requireUser(request)
    uid = user.uid
    body = await request.json() as typeof body
    return NextResponse.json({ entitlement: await redeemFreeDiscount(body.code || '', user.uid, body.plan, body.billingCycle, body.planVersionId) })
  } catch (error) {
    if ((error as { code?: string })?.code === 'PRICE_CHANGED' && uid) {
      try {
        const { quoteDiscount } = await import('@/lib/server/monetization')
        const quote = await quoteDiscount(body.code || '', uid, body.plan, body.billingCycle)
        return NextResponse.json({ code: 'PRICE_CHANGED', error: 'Bảng giá đã thay đổi. Vui lòng kiểm tra và áp dụng lại.', quote }, { status: 409 })
      } catch { /* Fall through to the normalized API error. */ }
    }
    return apiError(error, 'Không thể kích hoạt gói.')
  }
}
