import { NextResponse } from 'next/server'
import { requireAdminPermission } from '@/lib/server/firebase-admin'
import { updateFeedback } from '@/lib/server/feedback'
import { consumeAdminApproval, parseAdminMutationJson } from '@/lib/server/admin-approval'
import { apiError } from '@/lib/server/api-response'
import type { FeedbackPriority, FeedbackStatus } from '@/lib/feedback'

export async function PATCH(request: Request, { params }: { params: { feedbackId: string } }) {
  try {
    const admin = await requireAdminPermission(request, 'support.manage')
    const payloadJson = await request.text()
    const body = parseAdminMutationJson<{ status: FeedbackStatus; priority: FeedbackPriority; assigneeUid?: string; adminNote?: string; publicReply?: string; reason: string; expectedRevision: number; confirmed?: boolean }>(payloadJson)
    await consumeAdminApproval(request, admin, 'feedback_update', params.feedbackId, payloadJson)
    if (body.confirmed !== true) return NextResponse.json({ error: 'Cần xác nhận lần hai.' }, { status: 400 })
    return NextResponse.json({ item: await updateFeedback(params.feedbackId, admin, body) })
  } catch (error) { return apiError(error, 'Không thể cập nhật góp ý.') }
}
