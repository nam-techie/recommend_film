'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import type { PlaybackHeartbeat, PlaybackSessionStart } from '@/lib/analytics'

type PlaybackSignal = { action: 'play' | 'pause' | 'seek' | 'heartbeat'; position: number; duration: number; isPlaying: boolean }

export function usePlaybackAnalytics(metadata: Omit<PlaybackSessionStart, 'duration'>) {
  const { user } = useAuth()
  const sessionIdRef = useRef<string | null>(null)
  const sequenceRef = useRef(0)
  const lastSentAtRef = useRef(0)
  const startingRef = useRef<Promise<string | null> | null>(null)

  const authenticatedFetch = useCallback(async (url: string, init: RequestInit) => {
    if (!user) return null
    const token = await user.getIdToken()
    return fetch(url, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) }, keepalive: true })
  }, [user])

  const start = useCallback(async (duration: number) => {
    if (!user) return null
    if (sessionIdRef.current) return sessionIdRef.current
    if (startingRef.current) return startingRef.current
    startingRef.current = (async () => {
      try {
        const response = await authenticatedFetch('/api/analytics/playback-sessions', { method: 'POST', body: JSON.stringify({ ...metadata, duration }) })
        if (!response?.ok) return null
        const payload = await response.json() as { sessionId: string }
        sessionIdRef.current = payload.sessionId
        sequenceRef.current = 0; lastSentAtRef.current = 0
        return payload.sessionId
      } catch { return null } finally { startingRef.current = null }
    })()
    return startingRef.current
  }, [authenticatedFetch, metadata, user])

  const signal = useCallback(async (value: PlaybackSignal) => {
    const sessionId = sessionIdRef.current || (value.action === 'play' ? await start(value.duration) : null)
    if (!sessionId) return
    const now = Date.now()
    const immediate = value.action === 'play' || value.action === 'pause'
    if (!immediate && now - lastSentAtRef.current < 15_000) return
    lastSentAtRef.current = now
    const heartbeat: PlaybackHeartbeat = {
      sequence: ++sequenceRef.current, position: value.position, duration: value.duration,
      isPlaying: value.isPlaying, visible: document.visibilityState === 'visible',
      pictureInPicture: Boolean(document.pictureInPictureElement),
    }
    try { await authenticatedFetch(`/api/analytics/playback-sessions/${encodeURIComponent(sessionId)}/heartbeat`, { method: 'POST', body: JSON.stringify(heartbeat) }) } catch { /* best effort; resume progress remains independent */ }
  }, [authenticatedFetch, start])

  const finalize = useCallback(async () => {
    const sessionId = sessionIdRef.current
    if (!sessionId) return
    sessionIdRef.current = null
    try { await authenticatedFetch(`/api/analytics/playback-sessions/${encodeURIComponent(sessionId)}/finalize`, { method: 'POST', body: '{}' }) } catch { /* stale-session cron provides recovery */ }
  }, [authenticatedFetch])

  useEffect(() => () => { void finalize() }, [finalize])

  return { signal, finalize }
}
