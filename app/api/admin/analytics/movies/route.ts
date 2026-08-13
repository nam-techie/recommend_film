import { NextResponse } from 'next/server'
import { AdminAccessError, requireAdminPermission } from '@/lib/server/firebase-admin'
import { getAnalyticsMovies } from '@/lib/server/analytics'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireAdminPermission(request, 'analytics.read')
    const params = new URL(request.url).searchParams
    const rangeValue = params.get('range')
    const range = rangeValue === '7d' || rangeValue === '90d' ? rangeValue : '30d'
    const sortValue = params.get('sort')
    const sort = sortValue === 'watchHours' || sortValue === 'completion' ? sortValue : 'qualifiedViews'
    return NextResponse.json(await getAnalyticsMovies(range, sort), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof AdminAccessError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Không thể tải xếp hạng phim.' }, { status: 500 })
  }
}
