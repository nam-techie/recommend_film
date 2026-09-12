import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { updateServerSettings } from '@/lib/server/profile-bootstrap'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request) {
  try { const identity = await requireUser(request); return NextResponse.json({ settings: await updateServerSettings(identity.uid, await request.json()) }) }
  catch (error) { return apiError(error, 'Không thể cập nhật quyền riêng tư.') }
}
