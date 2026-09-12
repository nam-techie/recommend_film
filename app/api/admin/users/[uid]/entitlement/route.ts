import { NextResponse } from 'next/server'
import type { EntitlementAdminAction } from '@/lib/admin-users'
import { mutateAdminEntitlement } from '@/lib/server/admin-users'
import { requireAdmin } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { consumeAdminApproval, parseAdminMutationJson } from '@/lib/server/admin-approval'
import { entitlementGrantsV2Enabled } from '@/lib/server/entitlement-grants'

export async function PATCH(request: Request, { params }: { params: { uid: string } }) {
  try {
    if (entitlementGrantsV2Enabled()) return NextResponse.json({ code: 'LEGACY_ENTITLEMENT_DISABLED', error: 'Endpoint entitlement legacy đã bị khóa; hãy dùng grant ledger V2.' }, { status: 410 })
    const admin = await requireAdmin(request)
    const payloadJson = await request.text()
    const body = parseAdminMutationJson<EntitlementAdminAction & { confirmed?: boolean }>(payloadJson)
    await consumeAdminApproval(request, admin, 'user_entitlement_update', params.uid, payloadJson)
    if (body.confirmed !== true) return NextResponse.json({ code: 'CONFIRMATION_REQUIRED', error: 'Cần xác nhận lần hai.' }, { status: 400 })
    return NextResponse.json({ entitlement: await mutateAdminEntitlement(params.uid, body, admin) })
  } catch (error) { return apiError(error, 'Không thể cập nhật gói người dùng.') }
}
