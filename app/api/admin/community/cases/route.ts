import { NextResponse } from 'next/server'
import { AdminAccessError, requireAdminPermission } from '@/lib/server/firebase-admin'
import { listModerationCases } from '@/lib/server/community'
import type { ModerationStatus } from '@/lib/community'

export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try {
    await requireAdminPermission(request, 'community.moderate')
    const value = new URL(request.url).searchParams.get('status')
    const status = ['open', 'in_review', 'resolved', 'dismissed'].includes(value || '') ? value as ModerationStatus : undefined
    return NextResponse.json({ items: await listModerationCases(status) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof AdminAccessError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Không thể tải moderation queue.' }, { status: 500 })
  }
}
