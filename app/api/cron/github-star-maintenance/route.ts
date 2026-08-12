import { NextResponse } from 'next/server'
import { runGithubStarMaintenance } from '@/lib/server/github-star'

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await runGithubStarMaintenance())
}
