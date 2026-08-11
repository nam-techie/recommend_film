import { NextResponse } from 'next/server'
import { revokeAdminUserSessions } from '@/lib/server/admin-users'
import { requireAdmin } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { consumeAdminApproval, parseAdminMutationJson } from '@/lib/server/admin-approval'

export async function POST(request: Request, { params }: { params: { uid: string } }) {
  try {
    const admin = await requireAdmin(request)
    const payloadJson = await request.text()
    const body = parseAdminMutationJson<{ reason?: string; confirmed?: boolean }>(payloadJson)
    await consumeAdminApproval(request, admin, 'user_sessions_revoke', params.uid, payloadJson)
    if (body.confirmed !== true) return NextResponse.json({ code: 'CONFIRMATION_REQUIRED', error: 'Cần xác nhận lần hai.' }, { status: 400 })
    return NextResponse.json(await revokeAdminUserSessions(params.uid, body.reason || '', admin))
  } catch (error) { return apiError(error, 'Không thể thu hồi phiên đăng nhập.') }
}
