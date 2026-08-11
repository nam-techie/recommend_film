import { NextResponse } from 'next/server'
import { resolveAffiliateRedirect } from '@/lib/server/affiliate'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: { assignmentId: string } }) {
  try {
    const destination = await resolveAffiliateRedirect(params.assignmentId)
    return NextResponse.redirect(destination, { status: 302, headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return new Response('<!doctype html><html lang="vi"><meta charset="utf-8"><title>Ưu đãi không còn hoạt động</title><body style="font-family:system-ui;background:#090b13;color:#fff;padding:48px"><h1>Ưu đãi không còn hoạt động</h1><p>Liên kết này đã hết hạn hoặc được tạm dừng. Bạn có thể đóng tab này và tiếp tục xem phim.</p></body></html>', { status: 410, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
  }
}
