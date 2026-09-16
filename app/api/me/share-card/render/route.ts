import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { assertVerifiedMember } from '@/lib/server/profile'
import { renderOwnShareCard } from '@/lib/server/share-card'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const identity = await requireUser(request); assertVerifiedMember(identity)
    const result = await renderOwnShareCard(identity.uid, await request.json())
    return new NextResponse(result.png, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) { return apiError(error, 'Không thể tạo thẻ chia sẻ.') }
}
