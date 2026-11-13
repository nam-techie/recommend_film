import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id') || ''
  if (!/^[\w-]{11}$/.test(id)) return NextResponse.json({ title: null }, { status: 400 })
  try {
    // Only query YouTube's fixed metadata endpoint, never a user-provided host.
    const url = new URL('https://www.youtube.com/oembed')
    url.searchParams.set('url', `https://www.youtube.com/watch?v=${id}`)
    url.searchParams.set('format', 'json')
    const response = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(3000), redirect: 'error' })
    if (!response.ok) throw Error('Metadata unavailable')
    const metadata = await response.json()
    const title = typeof metadata.title === 'string' ? metadata.title.trim().slice(0, 120) : ''
    if (!title) throw Error('Missing title')
    return NextResponse.json({ title }, { headers: { 'Cache-Control': 'public, max-age=3600' } })
  } catch {
    return NextResponse.json({ title: null }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
