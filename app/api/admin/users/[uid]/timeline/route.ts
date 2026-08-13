import { NextResponse } from 'next/server'
import { consumeAdminApproval, parseAdminMutationJson } from '@/lib/server/admin-approval'
import { AdminAccessError, requireAdminPermission } from '@/lib/server/firebase-admin'
import { getAdminSensitiveTimeline } from '@/lib/server/admin-user-insights'
import { recordAuditEvent, validateAuditReason } from '@/lib/server/audit'

export const dynamic = 'force-dynamic'
export async function POST(request: Request, { params }: { params: { uid: string } }) {
  try {
    const identity = await requireAdminPermission(request, 'analytics.read_sensitive')
    const payloadJson = await request.text()
    const body = parseAdminMutationJson<{ reason?: string; days?: number }>(payloadJson)
    await consumeAdminApproval(request, identity, 'analytics_sensitive_read', params.uid, payloadJson)
    const reason = validateAuditReason(body.reason || '')
    const items = await getAdminSensitiveTimeline(params.uid, body.days)
    await recordAuditEvent({ actorUid: identity.uid, targetUid: params.uid, action: 'user_behavior_viewed', reason, status: 'succeeded', after: { days: Math.min(90, Math.max(1, body.days || 90)), itemCount: items.length }, category: 'security' })
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    if (error instanceof AdminAccessError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể tải timeline.' }, { status: 400 })
  }
}
