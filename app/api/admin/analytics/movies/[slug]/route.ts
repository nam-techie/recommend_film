import { NextResponse } from 'next/server'
import { AdminAccessError, requireAdminPermission } from '@/lib/server/firebase-admin'
import { getAnalyticsMovie } from '@/lib/server/analytics'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  try {
    await requireAdminPermission(request, 'analytics.read')
    const value = new URL(request.url).searchParams.get('range')
    const range = value === '7d' || value === '90d' ? value : '30d'
    return NextResponse.json(await getAnalyticsMovie(params.slug, range), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof AdminAccessError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Không thể tải analytics của phim.' }, { status: 500 })
  }
}
