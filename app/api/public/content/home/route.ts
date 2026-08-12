import { NextResponse } from 'next/server'
import { getPublicHomeContent } from '@/lib/server/content'

export const revalidate = 60
export async function GET() {
  try { return NextResponse.json(await getPublicHomeContent(), { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }) }
  catch { return NextResponse.json({ generatedAt: Date.now(), collections: [] }, { headers: { 'Cache-Control': 'public, s-maxage=30' } }) }
}
