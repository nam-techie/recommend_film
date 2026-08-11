import { NextResponse } from 'next/server'
import { createPlanVersion, type CreatePlanVersionInput } from '@/lib/server/plan-catalog'
import { requireAdmin } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { consumeAdminApproval, parseAdminMutationJson } from '@/lib/server/admin-approval'

export async function POST(request: Request, { params }: { params: { planId: string } }) {
  try {
    const admin = await requireAdmin(request)
    const payloadJson = await request.text()
    const body = parseAdminMutationJson<CreatePlanVersionInput>(payloadJson)
    await consumeAdminApproval(request, admin, 'plan_version_create', params.planId, payloadJson)
    return NextResponse.json({ version: await createPlanVersion(params.planId, body, admin.uid) }, { status: 201 })
  } catch (error) { return apiError(error, 'Không thể tạo phiên bản giá.') }
}
