import { NextResponse } from 'next/server'
import { runFeedbackRetention } from '@/lib/server/feedback'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await runFeedbackRetention())
}
