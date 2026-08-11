import { NextResponse } from 'next/server'
import { listAdminUsers } from '@/lib/server/admin-users'
import { requireAdmin } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireAdmin(request)
    const url = new URL(request.url)
    return NextResponse.json(await listAdminUsers(Number(url.searchParams.get('limit') || 50), url.searchParams.get('cursor') || undefined), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return apiError(error, 'Không thể tải danh sách người dùng.') }
}
