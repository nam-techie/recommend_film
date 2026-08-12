import { NextResponse } from 'next/server'
import { getDatabase } from 'firebase-admin/database'
import { requireAdminPermission, getFirebaseAdminApp } from '@/lib/server/firebase-admin'
import { getGithubCampaign } from '@/lib/server/github-star'
import { entitlementGrantsV2Enabled } from '@/lib/server/entitlement-grants'
import { consumeAdminApproval, parseAdminMutationJson } from '@/lib/server/admin-approval'
import { apiError } from '@/lib/server/api-response'
import { recordAuditEvent } from '@/lib/server/audit'

export async function GET(request: Request) {
  try { await requireAdminPermission(request, 'entitlement.manage'); return NextResponse.json({ campaign: await getGithubCampaign() }) }
  catch (error) { return apiError(error, 'Không thể tải campaign.') }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdminPermission(request, 'super_admin')
    const payloadJson = await request.text()
    const body = parseAdminMutationJson<{ enabled: boolean; grantsEnabled: boolean; autoApprove: boolean; reason: string; confirmed?: boolean }>(payloadJson)
    await consumeAdminApproval(request, admin, 'github_star_campaign_update', 'star-plus-2026', payloadJson)
    if (body.confirmed !== true) return NextResponse.json({ error: 'Cần xác nhận lần hai.' }, { status: 400 })
    const current = await getGithubCampaign()
    if (body.grantsEnabled === true && !entitlementGrantsV2Enabled()) return NextResponse.json({ error: 'Phải bật Entitlement Grants V2 sau shadow verification trước khi cấp Star.' }, { status: 409 })
    const mismatchRate = current.reconciliationChecks ? Number(current.mismatchCount || 0) / current.reconciliationChecks : 1
    const rejectionRate = current.reviewedCount ? Number(current.rejectedCount || 0) / current.reviewedCount : 1
    if (body.autoApprove === true && (!current.reconciliationStartedAt || Date.now() - current.reconciliationStartedAt < 7 * 24 * 60 * 60_000 || mismatchRate >= 0.01 || rejectionRate >= 0.05)) return NextResponse.json({ error: 'Auto-approval cần reconciliation ổn định 7 ngày, mismatch <1% và reject/fraud <5%.' }, { status: 409 })
    if (body.autoApprove === true && current.approvedCount < current.manualReviewCount) return NextResponse.json({ error: 'Chưa đủ 50 claim được duyệt thủ công để bật tự động.' }, { status: 409 })
    const campaign = { ...current, enabled: body.enabled === true, grantsEnabled: body.grantsEnabled === true, autoApprove: body.autoApprove === true, updatedAt: Date.now(), updatedBy: admin.uid }
    await getDatabase(getFirebaseAdminApp()).ref(`githubStar/campaigns/${campaign.id}`).set(campaign)
    await recordAuditEvent({ action: 'github_star_campaign_updated', status: 'succeeded', actorUid: admin.uid, reason: body.reason, before: current, after: campaign })
    return NextResponse.json({ campaign })
  } catch (error) { return apiError(error, 'Không thể cập nhật campaign.') }
}
