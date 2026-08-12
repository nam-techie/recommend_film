import { NextResponse } from 'next/server'
import { AdminAccessError, requireAdminPermission } from '@/lib/server/firebase-admin'
import { searchContentMovies } from '@/lib/server/content'

export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try {
    await requireAdminPermission(request, 'content.manage')
    return NextResponse.json({ items: await searchContentMovies(new URL(request.url).searchParams.get('q') || '') }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof AdminAccessError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Không thể tìm phim từ provider.' }, { status: 502 })
  }
}
