import { NextResponse } from 'next/server'
import { getAdminUserDetail } from '@/lib/server/admin-users'
import { requireAdmin } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: { uid: string } }) {
  try {
    await requireAdmin(request)
    return NextResponse.json(await getAdminUserDetail(params.uid), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return apiError(error, 'Không thể tải chi tiết người dùng.') }
}
