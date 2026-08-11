import { NextResponse } from 'next/server'
import { apiError } from '@/lib/server/api-response'
import { getUserEntitlement } from '@/lib/server/monetization'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: { uid: string } }) {
  try {
    const uid = decodeURIComponent(params.uid || '').trim()
    if (!/^[A-Za-z0-9:_-]{1,128}$/.test(uid)) return NextResponse.json({ code: 'INVALID_UID', error: 'UID không hợp lệ.' }, { status: 400 })
    const entitlement = await getUserEntitlement(uid)
    return NextResponse.json(
      { plan: entitlement.plan },
      { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60' } },
    )
  } catch (error) {
    return apiError(error, 'Không thể tải huy hiệu thành viên.')
  }
}
