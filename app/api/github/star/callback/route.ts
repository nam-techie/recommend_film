import { NextRequest, NextResponse } from 'next/server'
import { completeStar, getStarConfig, STAR_COOKIE, STAR_REPOSITORY, validateStarState } from '@/lib/server/github-star-action'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const config = getStarConfig()
  const params = request.nextUrl.searchParams
  const verifier = config && validateStarState(request.cookies.get(STAR_COOKIE)?.value, params.get('state'), config)
  const code = params.get('code')
  let success = false
  if (config && verifier && !params.has('error') && code && /^[a-zA-Z0-9_-]{1,256}$/.test(code)) {
    try { success = await completeStar(config, code, verifier) } catch { /* Show retry, never expose credentials/provider details. */ }
  }
  const title = success ? 'Cảm ơn bạn đã Star CineMind!' : 'Chưa ghi nhận được Star'
  const message = success ? 'GitHub đã xác nhận ngôi sao của bạn. Bạn có thể đóng tab này và tiếp tục xem phim.' : 'Bạn có thể chưa cấp quyền, phiên đã hết hạn hoặc GitHub đang không phản hồi. Hãy thử lại từ CineMind, hoặc mở repository để Star trực tiếp.'
  const response = new NextResponse(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#080a11;color:#f5f5f7;font-family:system-ui,sans-serif}main{max-width:420px;margin:24px;padding:32px;border:1px solid #2a2b38;border-radius:24px;background:#11131e}b{font-size:40px;color:#fbbf24}h1{font-size:24px;line-height:1.3}p{color:#a4a9ba;line-height:1.65}a{display:inline-block;margin-top:12px;color:#f0abfc;text-underline-offset:5px}</style></head><body><main><b aria-hidden="true">☆</b><h1>${title}</h1><p>${message}</p><a href="${STAR_REPOSITORY}" rel="noreferrer">Xem repository trên GitHub ↗</a></main></body></html>`, {
    status: success ? 200 : 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'" },
  })
  response.cookies.set(STAR_COOKIE, '', { path: '/api/github/star', maxAge: 0, httpOnly: true, secure: config?.callback.startsWith('https:') || false, sameSite: 'lax' })
  return response
}
