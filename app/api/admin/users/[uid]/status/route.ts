import { NextResponse } from 'next/server'
import { setAdminUserDisabled } from '@/lib/server/admin-users'
import { requireAdmin } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { consumeAdminApproval, parseAdminMutationJson } from '@/lib/server/admin-approval'

export async function PATCH(request: Request, { params }: { params: { uid: string } }) {
  try {
    const admin = await requireAdmin(request)
    const payloadJson = await request.text()
    const body = parseAdminMutationJson<{ disabled?: boolean; reason?: string; confirmed?: boolean }>(payloadJson)
    await consumeAdminApproval(request, admin, 'user_status_update', params.uid, payloadJson)
    if (body.confirmed !== true) return NextResponse.json({ code: 'CONFIRMATION_REQUIRED', error: 'Cần xác nhận lần hai.' }, { status: 400 })
    return NextResponse.json(await setAdminUserDisabled(params.uid, body.disabled === true, body.reason || '', admin))
  } catch (error) { return apiError(error, 'Không thể cập nhật trạng thái người dùng.') }
}
