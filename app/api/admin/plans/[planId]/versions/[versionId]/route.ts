import { NextResponse } from 'next/server'
import { cancelPlanVersion } from '@/lib/server/plan-catalog'
import { requireAdmin } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { consumeAdminApproval, parseAdminMutationJson } from '@/lib/server/admin-approval'

export async function PATCH(request: Request, { params }: { params: { planId: string; versionId: string } }) {
  try {
    const admin = await requireAdmin(request)
    const payloadJson = await request.text()
    const body = parseAdminMutationJson<{ action?: string; reason?: string; confirmed?: boolean }>(payloadJson)
    await consumeAdminApproval(request, admin, 'plan_version_cancel', `${params.planId}:${params.versionId}`, payloadJson)
    if (body.confirmed !== true) return NextResponse.json({ code: 'CONFIRMATION_REQUIRED', error: 'Cần xác nhận lần hai.' }, { status: 400 })
    if (body.action !== 'cancel') return NextResponse.json({ error: 'Thao tác không hợp lệ.' }, { status: 400 })
    return NextResponse.json({ version: await cancelPlanVersion(params.planId, params.versionId, body.reason || '', admin.uid) })
  } catch (error) { return apiError(error, 'Không thể hủy lịch giá.') }
}
