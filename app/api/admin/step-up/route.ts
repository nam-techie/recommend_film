import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/firebase-admin'
import { issueAdminApproval } from '@/lib/server/admin-approval'
import { apiError } from '@/lib/server/api-response'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request)
    const approval = await issueAdminApproval(admin, await request.json())
    return NextResponse.json(approval, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return apiError(error, 'Không thể tạo xác nhận bảo mật.')
  }
}
