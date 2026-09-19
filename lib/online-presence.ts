export const ONLINE_TTL_MS = 90_000
export const ONLINE_HEARTBEAT_MS = 25_000
export const INTERACTION_TTL_MS = 60_000
export const ONLINE_RETENTION_MS = 30 * 86_400_000

export interface OnlineSession {
  id: string
  startedAt: number
  lastHeartbeatAt: number
  lastInteractionAt: number | null
  visible: boolean
  sequence: number
  endedAt: number | null
  endReason: 'left' | 'timeout' | null
}
export interface OnlinePresence {
  online: boolean
  interacting: boolean
  connections: number
  onlineSince: number | null
  lastSeen: number | null
  generatedAt: number
  sessions: Array<OnlineSession & { seconds: number; online: boolean }>
}
export function summarizeOnlineSessions(records: Record<string, OnlineSession> | null, now = Date.now()): OnlinePresence {
  const sessions = Object.values(records || {}).filter(s => s.startedAt > 0 && s.lastHeartbeatAt >= now - ONLINE_RETENTION_MS).map(s => {
    const online = !s.endedAt && now - s.lastHeartbeatAt < ONLINE_TTL_MS
    return { ...s, online, endedAt: s.endedAt || (online ? null : s.lastHeartbeatAt), endReason: s.endReason || (online ? null : 'timeout' as const), seconds: Math.max(0, Math.floor(((s.endedAt || s.lastHeartbeatAt) - s.startedAt) / 1000)) }
  }).sort((a, b) => b.startedAt - a.startedAt)
  const live = sessions.filter(s => s.online)
  return { online: live.length > 0, interacting: live.some(s => s.visible && s.lastInteractionAt !== null && now - s.lastInteractionAt < INTERACTION_TTL_MS), connections: live.length, onlineSince: live.length ? Math.min(...live.map(s => s.startedAt)) : null, lastSeen: sessions.length ? Math.max(...sessions.map(s => s.lastHeartbeatAt)) : null, generatedAt: now, sessions }
}
