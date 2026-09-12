import { NextResponse } from 'next/server'
import { requireAdminPermission } from '@/lib/server/firebase-admin'
import { listAdminFeedback } from '@/lib/server/feedback'
import { apiError } from '@/lib/server/api-response'

export async function GET(request: Request) {
  try { await requireAdminPermission(request, 'support.manage'); return NextResponse.json({ items: await listAdminFeedback() }) }
  catch (error) { return apiError(error, 'Không thể tải hòm thư góp ý.') }
}
