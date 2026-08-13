'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import type { PlaybackGrantDescriptor, PlaybackHeartbeat, PlaybackSessionStart } from '@/lib/analytics'

type PlaybackSignal = { action: 'playing' | 'pause' | 'seek' | 'heartbeat'; position: number; duration: number; isPlaying: boolean }
type AnalyticsClientState = 'idle' | 'starting' | 'collecting' | 'degraded'

function errorCode(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object' && 'code' in payload && typeof payload.code === 'string') return payload.code
  return fallback
}

export function usePlaybackAnalytics(metadata: Omit<PlaybackSessionStart, 'duration' | 'grantId' | 'clientSessionId'>, grant?: PlaybackGrantDescriptor | null) {
  const { user } = useAuth()
  const sessionIdRef = useRef<string | null>(null)
  const clientSessionIdRef = useRef(crypto.randomUUID())
  const sequenceRef = useRef(0)
  const lastSentAtRef = useRef(0)
  const startingRef = useRef<Promise<string | null> | null>(null)
  const [state, setState] = useState<AnalyticsClientState>('idle')
  const [lastErrorCode, setLastErrorCode] = useState<string | null>(null)

  const authenticatedFetch = useCallback(async (url: string, init: RequestInit) => {
    if (!user) return null
    const token = await user.getIdToken()
    return fetch(url, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) }, keepalive: true })
  }, [user])

  const start = useCallback(async (duration: number) => {
    if (!user || !grant || grant.expiresAt <= Date.now()) return null
    if (sessionIdRef.current) return sessionIdRef.current
    if (startingRef.current) return startingRef.current
    setState('starting')
    startingRef.current = (async () => {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const response = await authenticatedFetch('/api/analytics/playback-sessions', { method: 'POST', body: JSON.stringify({ ...metadata, duration, grantId: grant.grantId, clientSessionId: clientSessionIdRef.current }) })
          const payload = await response?.json().catch(() => ({})) as { sessionId?: string; code?: string } | undefined
          if (!response?.ok || !payload?.sessionId) {
            setLastErrorCode(errorCode(payload, `ANALYTICS_START_HTTP_${response?.status || 0}`))
            if (response && response.status < 500) break
            continue
          }
          sessionIdRef.current = payload.sessionId
          sequenceRef.current = 0; lastSentAtRef.current = 0
          setState('collecting'); setLastErrorCode(null)
          return payload.sessionId
        } catch {
          setLastErrorCode('ANALYTICS_START_NETWORK')
        }
      }
      setState('degraded')
      return null
    })().finally(() => { startingRef.current = null })
    return startingRef.current
  }, [authenticatedFetch, grant, metadata, user])

  const signal = useCallback(async (value: PlaybackSignal) => {
    const sessionId = sessionIdRef.current || (value.action === 'playing' ? await start(value.duration) : null)
    if (!sessionId) return
    const now = Date.now()
    const immediate = value.action === 'playing' || value.action === 'pause'
    if (!immediate && now - lastSentAtRef.current < 15_000) return
    lastSentAtRef.current = now
    const heartbeat: PlaybackHeartbeat = { sequence: ++sequenceRef.current, position: value.position, duration: value.duration, isPlaying: value.isPlaying, visible: document.visibilityState === 'visible', pictureInPicture: Boolean(document.pictureInPictureElement) }
    try {
      const response = await authenticatedFetch(`/api/analytics/playback-sessions/${encodeURIComponent(sessionId)}/heartbeat`, { method: 'POST', body: JSON.stringify(heartbeat) })
      if (!response?.ok) { const payload = await response?.json().catch(() => ({})); setLastErrorCode(errorCode(payload, `ANALYTICS_HEARTBEAT_HTTP_${response?.status || 0}`)); setState('degraded') }
    } catch { setLastErrorCode('ANALYTICS_HEARTBEAT_NETWORK'); setState('degraded') }
  }, [authenticatedFetch, start])

  const finalize = useCallback(async () => {
    const sessionId = sessionIdRef.current
    if (!sessionId) return
    sessionIdRef.current = null
    try {
      const response = await authenticatedFetch(`/api/analytics/playback-sessions/${encodeURIComponent(sessionId)}/finalize`, { method: 'POST', body: '{}' })
      if (!response?.ok) { const payload = await response?.json().catch(() => ({})); setLastErrorCode(errorCode(payload, `ANALYTICS_FINALIZE_HTTP_${response?.status || 0}`)); setState('degraded') }
      else setState('idle')
    } catch { setLastErrorCode('ANALYTICS_FINALIZE_NETWORK'); setState('degraded') }
    clientSessionIdRef.current = crypto.randomUUID()
  }, [authenticatedFetch])

  useEffect(() => {
    const onPageHide = () => { void finalize() }
    window.addEventListener('pagehide', onPageHide)
    return () => { window.removeEventListener('pagehide', onPageHide); void finalize() }
  }, [finalize])

  return { signal, finalize, state, lastErrorCode }
}
