import { NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { getFirebaseAdminApp } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { readPublicProfileProjection } from '@/lib/server/profile'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get('authorization') || ''
    if (!authorization.startsWith('Bearer ')) return NextResponse.json({ error: 'Bạn cần đăng nhập.' }, { status: 401 })
    const identity = await getAuth(getFirebaseAdminApp()).verifyIdToken(authorization.slice(7), true)
    const username = new URL(request.url).searchParams.get('username') || ''
    const projection = await readPublicProfileProjection(username, identity.uid)
    if (!projection || projection.private) return NextResponse.json({ profile: null })
    return NextResponse.json({ profile: projection.profile })
  } catch (error) { return apiError(error, 'Không thể tìm người dùng.') }
}
