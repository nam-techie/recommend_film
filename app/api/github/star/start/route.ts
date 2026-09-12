import { NextRequest, NextResponse } from 'next/server'
import { beginStar, getStarConfig, STAR_COOKIE, STAR_REPOSITORY } from '@/lib/server/github-star-action'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const config = getStarConfig()
  const expectedOrigin = config?.origin || request.nextUrl.origin
  if (request.headers.get('origin') !== expectedOrigin || request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ error: 'Hãy mở nút Star từ CineMind.' }, { status: 403 })
  }
  // An unconfigured installation still offers a real link, never a fake Star.
  if (!config) return NextResponse.redirect(STAR_REPOSITORY, 303)
  const flow = beginStar(config)
  const response = NextResponse.redirect(flow.url, 303)
  response.headers.set('Cache-Control', 'no-store')
  response.cookies.set(STAR_COOKIE, flow.cookie, { httpOnly: true, secure: config.callback.startsWith('https:'), sameSite: 'lax', path: '/api/github/star', maxAge: 600 })
  return response
}
