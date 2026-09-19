'use client'

import { useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { ONLINE_HEARTBEAT_MS } from '@/lib/online-presence'

// One tracker per authenticated browser tab, mounted above route navigation.
export function OnlineSessionTracker() {
  const { user } = useAuth()
  useEffect(() => {
    if (!user || user.isAnonymous) return
    let id = crypto.randomUUID(), sequence = 0, token = '', stopped = false, suspended = false, pending = false
    let interaction = 1, acknowledgedInteraction = 0
    const input = () => { if (document.visibilityState === 'visible') interaction += 1 }
    const heartbeat = async () => {
      if (stopped || suspended || pending || !navigator.onLine) return
      pending = true
      const currentId = id
      const currentSequence = ++sequence
      const observedInteraction = interaction
      try {
        token = await user.getIdToken()
        if (stopped || suspended || currentId !== id) return
        const response = await fetch('/api/me/online-session', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ id: currentId, sequence: currentSequence, action: 'heartbeat', visible: document.visibilityState === 'visible', interacted: observedInteraction > acknowledgedInteraction }), signal: AbortSignal.timeout(12_000) })
        if (!response.ok) return
        const payload = await response.json()
        if (currentId !== id || stopped || suspended) return
        if (payload.restart) { id = crypto.randomUUID(); sequence = 0 }
        else acknowledgedInteraction = observedInteraction
      } catch { /* The lease expires on the server if heartbeats stop. */ }
      finally { pending = false }
    }
    const close = () => {
      suspended = true
      if (!token) return
      void fetch('/api/me/online-session', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ id, sequence: ++sequence, action: 'end', visible: false, interacted: false }) }).catch(() => undefined)
    }
    const resume = () => { if (suspended) { id = crypto.randomUUID(); sequence = 0; suspended = false }; void heartbeat() }
    const visibility = () => { void heartbeat() }
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const
    events.forEach(event => window.addEventListener(event, input, { passive: true }))
    window.addEventListener('pagehide', close)
    window.addEventListener('pageshow', resume)
    window.addEventListener('online', resume)
    document.addEventListener('visibilitychange', visibility)
    const timer = window.setInterval(() => void heartbeat(), ONLINE_HEARTBEAT_MS)
    void heartbeat()
    return () => {
      stopped = true; close(); window.clearInterval(timer)
      events.forEach(event => window.removeEventListener(event, input))
      window.removeEventListener('pagehide', close); window.removeEventListener('pageshow', resume); window.removeEventListener('online', resume)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [user])
  return null
}
