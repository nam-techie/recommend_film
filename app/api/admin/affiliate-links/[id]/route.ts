import { NextResponse } from 'next/server'
import type { AffiliateLink } from '@/lib/affiliate'
import { updateAffiliateLink } from '@/lib/server/affiliate'
import { requireAdmin } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { consumeAdminApproval, parseAdminMutationJson } from '@/lib/server/admin-approval'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin(request)
    const payloadJson = await request.text()
    const body = parseAdminMutationJson<Partial<Pick<AffiliateLink, 'campaignName' | 'productTitle' | 'ctaLabel' | 'weight' | 'startsAt' | 'endsAt' | 'status'>> & { reason: string; confirmed?: boolean }>(payloadJson)
    await consumeAdminApproval(request, admin, 'affiliate_link_update', params.id, payloadJson)
    if (body.confirmed !== true) return NextResponse.json({ code: 'CONFIRMATION_REQUIRED', error: 'Cần xác nhận lần hai.' }, { status: 400 })
    return NextResponse.json({ link: await updateAffiliateLink(params.id, body, admin.uid) })
  } catch (error) { return apiError(error, 'Không thể cập nhật affiliate link.') }
}
