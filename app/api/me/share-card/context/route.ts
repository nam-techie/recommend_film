import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { assertVerifiedMember, getOwnShareCardContext } from '@/lib/server/profile'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const identity = await requireUser(request); assertVerifiedMember(identity)
    const range = new URL(request.url).searchParams.get('range') === '90d' ? '90d' : '30d'
    return NextResponse.json(await getOwnShareCardContext(identity.uid, range), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return apiError(error, 'Không thể tải dữ liệu thẻ chia sẻ.') }
}
