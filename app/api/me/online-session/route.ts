import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { recordOnlineHeartbeat } from '@/lib/server/online-presence'
export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  try {
    const identity = await requireUser(request)
    if (identity.firebase.sign_in_provider === 'anonymous') return new NextResponse(null, { status: 204 })
    const text = await request.text()
    if (text.length > 1024) return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 })
    let input: unknown
    try { input = JSON.parse(text) } catch { return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 }) }
    return NextResponse.json(await recordOnlineHeartbeat(identity.uid, input), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return apiError(error, 'Không thể cập nhật phiên kết nối.') }
}
