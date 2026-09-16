import { NextResponse } from 'next/server'
import { apiError } from '@/lib/server/api-response'
import { getCoverProxy } from '@/lib/server/profile-media'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await context.params
    const result = await getCoverProxy(uid, false)
    return new NextResponse(result.bytes, { headers: { 'Content-Type': result.contentType, 'Cache-Control': 'private, no-store' } })
  } catch (error) { return apiError(error, 'Không thể tải ảnh bìa.') }
}
