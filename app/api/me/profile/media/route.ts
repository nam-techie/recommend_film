import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { assertVerifiedMember } from '@/lib/server/profile'
import { getCoverProxy, resetProfileMedia, uploadProfileMedia } from '@/lib/server/profile-media'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const identity = await requireUser(request); assertVerifiedMember(identity)
    return NextResponse.json(await uploadProfileMedia(identity.uid, await request.formData()))
  } catch (error) { return apiError(error, 'Không thể tải ảnh hồ sơ lên.') }
}

export async function DELETE(request: Request) {
  try {
    const identity = await requireUser(request); assertVerifiedMember(identity)
    const kind = new URL(request.url).searchParams.get('kind')
    if (kind !== 'avatar' && kind !== 'cover') return NextResponse.json({ error: 'Loại ảnh không hợp lệ.' }, { status: 400 })
    return NextResponse.json(await resetProfileMedia(identity.uid, kind))
  } catch (error) { return apiError(error, 'Không thể đặt lại ảnh hồ sơ.') }
}

export async function GET(request: Request) {
  try {
    const identity = await requireUser(request)
    const result = await getCoverProxy(identity.uid, true)
    return new NextResponse(result.bytes, { headers: { 'Content-Type': result.contentType, 'Cache-Control': 'private, no-store' } })
  } catch (error) { return apiError(error, 'Không thể tải ảnh bìa.') }
}
