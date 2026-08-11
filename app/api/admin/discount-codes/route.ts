import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { createDiscountCode, listDiscountCodes, type CreateDiscountInput } from '@/lib/server/monetization'
import { consumeAdminApproval, parseAdminMutationJson } from '@/lib/server/admin-approval'
import { normalizeDiscountCode } from '@/lib/monetization'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireAdmin(request)
    return NextResponse.json({ codes: await listDiscountCodes() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return apiError(error, 'Không thể tải mã giảm giá.') }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request)
    const payloadJson = await request.text()
    const body = parseAdminMutationJson<CreateDiscountInput>(payloadJson)
    await consumeAdminApproval(request, admin, 'discount_code_create', normalizeDiscountCode(body.code || ''), payloadJson)
    return NextResponse.json({ code: await createDiscountCode(body, admin.uid) }, { status: 201 })
  } catch (error) { return apiError(error, 'Không thể tạo mã giảm giá.') }
}
