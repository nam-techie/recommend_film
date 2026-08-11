import { NextResponse } from 'next/server'
import { createAffiliateLink, listAffiliateLinks, type CreateAffiliateLinkInput } from '@/lib/server/affiliate'
import { requireAdmin } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { consumeAdminApproval, parseAdminMutationJson } from '@/lib/server/admin-approval'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try { await requireAdmin(request); return NextResponse.json(await listAffiliateLinks(), { headers: { 'Cache-Control': 'no-store' } }) }
  catch (error) { return apiError(error, 'Không thể tải kho affiliate.') }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request)
    const payloadJson = await request.text()
    const body = parseAdminMutationJson<CreateAffiliateLinkInput & { confirmed?: boolean }>(payloadJson)
    await consumeAdminApproval(request, admin, 'affiliate_link_create', 'new', payloadJson)
    if (body.confirmed !== true) return NextResponse.json({ code: 'CONFIRMATION_REQUIRED', error: 'Cần xác nhận lần hai.' }, { status: 400 })
    return NextResponse.json({ link: await createAffiliateLink(body, admin.uid) }, { status: 201 })
  } catch (error) { return apiError(error, 'Không thể tạo affiliate link.') }
}
