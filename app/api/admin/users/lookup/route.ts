import { NextResponse } from 'next/server'
import { lookupAdminUser } from '@/lib/server/admin-users'
import { requireAdmin } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireAdmin(request)
    const query = new URL(request.url).searchParams.get('query') || ''
    return NextResponse.json({ user: await lookupAdminUser(query) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return apiError(error, 'Không thể tìm người dùng.') }
}
