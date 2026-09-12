import { NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { getFirebaseAdminApp } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { readPublicProfileProjection } from '@/lib/server/profile'

export const dynamic = 'force-dynamic'

async function optionalViewer(request: Request) {
  const value = request.headers.get('authorization') || ''
  if (!value.startsWith('Bearer ')) return undefined
  try { return (await getAuth(getFirebaseAdminApp()).verifyIdToken(value.slice(7), true)).uid } catch { return undefined }
}

export async function GET(request: Request, context: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await context.params
    const projection = await readPublicProfileProjection(username, await optionalViewer(request))
    if (!projection) return NextResponse.json({ error: 'Không tìm thấy hồ sơ.' }, { status: 404 })
    return NextResponse.json(projection)
  } catch (error) { return apiError(error, 'Không thể tải hồ sơ.') }
}
