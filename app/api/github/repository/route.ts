import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await fetch('https://api.github.com/repos/nam-techie/recommend_film', {
      headers: { Accept: 'application/vnd.github+json' },
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(4000),
    })
    if (!response.ok) throw new Error('GitHub unavailable')
    const repository = await response.json()
    const stars = repository.stargazers_count
    if (!Number.isSafeInteger(stars) || stars < 0) throw new Error('Invalid star count')
    return NextResponse.json({ stars }, { headers: { 'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600' } })
  } catch {
    return NextResponse.json({ stars: null }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
