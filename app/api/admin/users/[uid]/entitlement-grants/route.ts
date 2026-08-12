import { NextResponse } from 'next/server'
import type { EntitlementGrantMutation } from '@/lib/server/entitlement-grants'
import { entitlementGrantsV2Enabled, getEntitlementGrantState, mutateEntitlementGrantState } from '@/lib/server/entitlement-grants'
import { requireAdminPermission } from '@/lib/server/firebase-admin'
import { consumeAdminApproval, parseAdminMutationJson } from '@/lib/server/admin-approval'
import { apiError } from '@/lib/server/api-response'

export async function GET(request: Request, { params }: { params: { uid: string } }) {
  try { await requireAdminPermission(request, 'entitlement.manage'); return NextResponse.json({ ...(await getEntitlementGrantState(params.uid)), mode: entitlementGrantsV2Enabled() ? 'enabled' : 'shadow' }) }
  catch (error) { return apiError(error, 'Không thể tải grant ledger.') }
}

export async function PATCH(request: Request, { params }: { params: { uid: string } }) {
  try {
    const payloadJson = await request.text()
    const body = parseAdminMutationJson<EntitlementGrantMutation & { confirmed?: boolean }>(payloadJson)
    const destructive = body.action === 'revoke' || body.action === 'restrict' || body.action === 'restore' || body.action === 'unrestrict'
    const admin = await requireAdminPermission(request, destructive ? 'entitlement.revoke' : 'entitlement.manage')
    if (destructive && admin.uid === params.uid) return NextResponse.json({ error: 'Admin không thể tự thu hồi hoặc khóa quyền lợi của chính mình.' }, { status: 403 })
    await consumeAdminApproval(request, admin, destructive ? 'entitlement_restriction_update' : 'entitlement_grant_update', params.uid, payloadJson)
    if (body.confirmed !== true) return NextResponse.json({ error: 'Cần xác nhận lần hai.' }, { status: 400 })
    return NextResponse.json(await mutateEntitlementGrantState(params.uid, body, admin))
  } catch (error) { return apiError(error, 'Không thể cập nhật grant ledger.') }
}
