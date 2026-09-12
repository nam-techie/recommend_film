import { NextResponse } from 'next/server'
import { finalizeStalePlaybackSessions, maintainAnalyticsRetention, rebuildDirtyAnalyticsDays } from '@/lib/server/analytics'
import { publishDueFeaturedContent } from '@/lib/server/content'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET?.trim()
  if (!expected || request.headers.get('authorization') !== `Bearer ${expected}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const finalized = await finalizeStalePlaybackSessions()
  const [retention, rebuiltDays, content] = await Promise.all([maintainAnalyticsRetention(), rebuildDirtyAnalyticsDays(), publishDueFeaturedContent()])
  return NextResponse.json({ finalized, rebuiltDays, ...retention, content, ranAt: Date.now() })
}
