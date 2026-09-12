import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/firebase-admin'
import { createFeedback, listOwnFeedback } from '@/lib/server/feedback'
import { apiError } from '@/lib/server/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try { const identity = await requireUser(request); return NextResponse.json({ items: await listOwnFeedback(identity.uid) }) }
  catch (error) { return apiError(error, 'Không thể tải góp ý của bạn.') }
}

export async function POST(request: Request) {
  try { const identity = await requireUser(request); return NextResponse.json({ item: await createFeedback(identity, await request.formData()) }) }
  catch (error) { return apiError(error, 'Không thể gửi góp ý.') }
}
