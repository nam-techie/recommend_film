import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { updateDiscountCode } from '@/lib/server/monetization'
import type { DiscountCode } from '@/lib/monetization'
import { consumeAdminApproval, parseAdminMutationJson } from '@/lib/server/admin-approval'
import { normalizeDiscountCode } from '@/lib/monetization'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, { params }: { params: { code: string } }) {
  try {
    const admin = await requireAdmin(request)
    const payloadJson = await request.text()
    const body = parseAdminMutationJson<Partial<Pick<DiscountCode, 'maxRedemptions' | 'startsAt' | 'endsAt' | 'targetUid' | 'note' | 'status'>> & { reason: string }>(payloadJson)
    const code = normalizeDiscountCode(params.code)
    await consumeAdminApproval(request, admin, 'discount_code_update', code, payloadJson)
    return NextResponse.json({ code: await updateDiscountCode(code, body, admin.uid) })
  } catch (error) { return apiError(error, 'Không thể cập nhật mã giảm giá.') }
}
