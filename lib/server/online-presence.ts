import 'server-only'
import { getDatabase } from 'firebase-admin/database'
import { getFirebaseAdminApp, AdminAccessError } from '@/lib/server/firebase-admin'
import { ONLINE_RETENTION_MS, ONLINE_TTL_MS, summarizeOnlineSessions, type OnlineSession } from '@/lib/online-presence'

const database = () => getDatabase(getFirebaseAdminApp())
const sessionPath = 'analytics/onlineSessions'
export async function recordOnlineHeartbeat(uid: string, input: unknown) {
  const value = input as { id?: unknown; sequence?: unknown; action?: unknown; visible?: unknown; interacted?: unknown }
  if (!value || typeof value.id !== 'string' || !/^[a-f0-9-]{36}$/.test(value.id) || !Number.isSafeInteger(value.sequence) || Number(value.sequence) < 1 || !['heartbeat', 'end'].includes(String(value.action)) || typeof value.visible !== 'boolean' || typeof value.interacted !== 'boolean') throw new AdminAccessError(400, 'Phiên kết nối không hợp lệ.')
  const { id } = value
  const now = Date.now()
  const result = await database().ref(`${sessionPath}/${uid}`).transaction((stored: Record<string, OnlineSession> | null) => {
    const rows = { ...stored }
    const previous = rows[id]
    if (previous && (previous.endedAt || Number(value.sequence) <= previous.sequence)) return
    for (const [key, session] of Object.entries(rows)) {
      if (session.lastHeartbeatAt < now - ONLINE_RETENTION_MS) delete rows[key]
      else if (!session.endedAt && now - session.lastHeartbeatAt >= ONLINE_TTL_MS) rows[key] = { ...session, endedAt: session.lastHeartbeatAt, endReason: 'timeout' }
    }
    if (rows[id]?.endedAt) return rows
    if (!previous && value.action !== 'end' && Object.values(rows).filter(s => !s.endedAt).length >= 12) return
    // A close arriving before its first heartbeat leaves a tombstone, so a delayed request cannot resurrect it.
    const closing = value.action === 'end'
    rows[id] = {
      id, startedAt: previous?.startedAt ?? (closing ? 0 : now),
      lastHeartbeatAt: now, sequence: Number(value.sequence), visible: value.visible as boolean,
      lastInteractionAt: value.visible && value.interacted ? now : previous?.lastInteractionAt ?? null,
      endedAt: closing ? now : null, endReason: closing ? 'left' : null,
    }
    // Bounded per-account history; never evict a live tab to make room for history.
    const closed = Object.values(rows).filter(s => s.endedAt).sort((a, b) => b.lastHeartbeatAt - a.lastHeartbeatAt)
    closed.slice(Math.max(0, 50 - Object.values(rows).filter(s => !s.endedAt).length)).forEach(s => { delete rows[s.id] })
    return rows
  })
  const row = result.snapshot.child(id).val() as OnlineSession | null
  return { restart: !row || Boolean(row.endedAt), receivedAt: now }
}
export async function getUserOnlinePresence(uid: string) {
  return summarizeOnlineSessions((await database().ref(`${sessionPath}/${uid}`).get()).val())
}
export async function getOnlineSnapshot(uids: string[] = [], historyUid?: string) {
  const rows = (await database().ref(sessionPath).get()).val() as Record<string, Record<string, OnlineSession>> | null
  const now = Date.now()
  const users = Object.values(rows || {}).map(s => summarizeOnlineSessions(s, now))
  return { onlineNow: users.filter(s => s.online).length, interactingNow: users.filter(s => s.interacting).length, generatedAt: now, users: Object.fromEntries(uids.map(uid => { const summary = summarizeOnlineSessions(rows?.[uid] || null, now); return [uid, { ...summary, sessions: uid === historyUid ? summary.sessions : [] }] })) }
}
export async function sampleOnlinePeak(online: number, now = Date.now()) {
  const bucket = Math.floor(now / 300_000) * 300_000
  await database().ref(`analytics/aggregates/onlinePresence5m/${bucket}`).transaction((current: { online: number; recordedAt: number } | null) => ({ online: Math.max(current?.online || 0, online), recordedAt: now }))
}
export async function pruneOnlineSessions() {
  const now = Date.now()
  const snapshot = await database().ref(sessionPath).get()
  await Promise.all(Object.keys(snapshot.val() || {}).map(uid => database().ref(`${sessionPath}/${uid}`).transaction((rows: Record<string, OnlineSession> | null) => {
    if (!rows) return
    const next = { ...rows }
    for (const [id, row] of Object.entries(next)) {
      if (row.lastHeartbeatAt < now - ONLINE_RETENTION_MS) delete next[id]
      else if (!row.endedAt && now - row.lastHeartbeatAt >= ONLINE_TTL_MS) next[id] = { ...row, endedAt: row.lastHeartbeatAt, endReason: 'timeout' }
    }
    return Object.keys(next).length ? next : null
  })))
  const oldBuckets = await database().ref('analytics/aggregates/onlinePresence5m').orderByKey().endAt(String(now - 90 * 86_400_000)).get()
  if (oldBuckets.exists()) await database().ref('analytics/aggregates/onlinePresence5m').update(Object.fromEntries(Object.keys(oldBuckets.val()).map(key => [key, null])))
}
