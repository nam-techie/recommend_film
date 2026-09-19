import { NextResponse } from 'next/server'
import { getDatabase } from 'firebase-admin/database'
import { getFirebaseAdminApp, requireAdminPermission } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { getOnlineSnapshot, sampleOnlinePeak } from '@/lib/server/online-presence'
import type { PlaybackSessionRecord } from '@/lib/analytics'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try {
    await requireAdminPermission(request, 'analytics.read')
    const url = new URL(request.url)
    const uids = [...new Set(url.searchParams.getAll('uid'))]
    if (uids.length > 51 || uids.some(uid => !uid || uid.length > 128 || /[.#$\[\]\/]/.test(uid))) return NextResponse.json({ error: 'Danh sách tài khoản không hợp lệ.' }, { status: 400 })
    const cutoff = Date.now() - 60_000
    const [presence, playback] = await Promise.all([getOnlineSnapshot(uids, url.searchParams.get('historyUid') || undefined), getDatabase(getFirebaseAdminApp()).ref('analytics/playbackSessions').orderByChild('lastHeartbeatAt').startAt(cutoff).get()])
    const watching = Object.values((playback.val() || {}) as Record<string, PlaybackSessionRecord>).filter(s => !s.finalized && s.lastHeartbeatAt >= cutoff && s.isPlaying && (s.visible || s.pictureInPicture) && s.reliability === 'verified')
    await sampleOnlinePeak(presence.onlineNow, presence.generatedAt)
    return NextResponse.json({ ...presence, concurrentViewers: new Set(watching.map(s => s.uid)).size }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return apiError(error, 'Không thể cập nhật trạng thái trực tuyến.') }
}
