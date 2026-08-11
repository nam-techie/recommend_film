import { NextResponse } from 'next/server'
import { updateAffiliatePolicy } from '@/lib/server/affiliate'
import { requireAdmin } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { consumeAdminApproval, parseAdminMutationJson } from '@/lib/server/admin-approval'

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin(request)
    const payloadJson = await request.text()
    const body = parseAdminMutationJson<{ enabled?: boolean; reason?: string; confirmed?: boolean }>(payloadJson)
    await consumeAdminApproval(request, admin, 'affiliate_policy_update', 'affiliatePolicy', payloadJson)
    if (body.confirmed !== true) return NextResponse.json({ code: 'CONFIRMATION_REQUIRED', error: 'Cần xác nhận lần hai.' }, { status: 400 })
    return NextResponse.json({ policy: await updateAffiliatePolicy(body.enabled === true, body.reason || '', admin.uid) })
  } catch (error) { return apiError(error, 'Không thể cập nhật chính sách affiliate.') }
}
