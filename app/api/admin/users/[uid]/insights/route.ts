import { NextResponse } from 'next/server'
import { AdminAccessError, requireAdminPermission } from '@/lib/server/firebase-admin'
import { getAdminUserInsights } from '@/lib/server/admin-user-insights'

export const dynamic = 'force-dynamic'
export async function GET(request: Request, { params }: { params: { uid: string } }) {
  try {
    await requireAdminPermission(request, 'analytics.read')
    const value = new URL(request.url).searchParams.get('range')
    const range = value === '7d' || value === '90d' ? value : '30d'
    return NextResponse.json(await getAdminUserInsights(params.uid, range), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof AdminAccessError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Không thể tải insight người dùng.' }, { status: 500 })
  }
}
