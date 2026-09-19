'use client'

import { useEffect, useState } from 'react'
import type { OnlinePresence } from '@/lib/online-presence'
export interface AdminLivePresence {
  generatedAt: number
  onlineNow: number
  interactingNow: number
  concurrentViewers: number
  users: Record<string, OnlinePresence>
}
export function useAdminLivePresence(request: (path: string, init?: RequestInit) => Promise<AdminLivePresence>, enabled: boolean, uids: string[] = [], historyUid?: string) {
  const [data, setData] = useState<AdminLivePresence | null>(null)
  const [error, setError] = useState(false)
  const params = new URLSearchParams()
  ;[...new Set(uids)].sort().forEach(uid => params.append('uid', uid))
  if (historyUid) params.set('historyUid', historyUid)
  const endpoint = `/api/admin/online-presence?${params.toString()}`
  useEffect(() => {
    if (!enabled) { setData(null); return }
    let disposed = false, running = false
    let controller: AbortController | null = null
    setData(null); setError(false)
    const poll = async () => {
      if (disposed || running || document.visibilityState !== 'visible') return
      running = true; controller = new AbortController()
      const timeout = window.setTimeout(() => controller?.abort(), 12_000)
      try { const next = await request(endpoint, { signal: controller.signal }); if (!disposed) { setData(next); setError(false) } }
      catch { if (!disposed) setError(true) }
      finally { window.clearTimeout(timeout); running = false }
    }
    void poll()
    const timer = window.setInterval(() => void poll(), 15_000)
    const resume = () => { void poll() }
    document.addEventListener('visibilitychange', resume)
    window.addEventListener('online', resume)
    return () => { disposed = true; controller?.abort(); window.clearInterval(timer); document.removeEventListener('visibilitychange', resume); window.removeEventListener('online', resume) }
  }, [enabled, endpoint, request])
  return { data, error }
}
