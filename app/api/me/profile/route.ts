import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { assertVerifiedMember, updateOwnProfile } from '@/lib/server/profile'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request) {
  try {
    const identity = await requireUser(request)
    assertVerifiedMember(identity)
    const profile = await updateOwnProfile(identity.uid, await request.json())
    return NextResponse.json({ profile })
  } catch (error) {
    return apiError(error, 'Không thể cập nhật hồ sơ.')
  }
}
