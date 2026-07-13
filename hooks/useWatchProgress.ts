'use client'

import { useCallback, useEffect, useState } from 'react'
import { get, ref, set } from 'firebase/database'
import { database } from '@/lib/firebase'
import { useAuth } from '@/components/auth/AuthProvider'
import { WatchProgress } from '@/lib/watch-party-types'

const LOCAL_KEY = 'cinemind:watch-progress:v1'
function localRecords(): Record<string, WatchProgress> { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}') } catch { return {} } }
function saveLocal(progress: WatchProgress) { localStorage.setItem(LOCAL_KEY, JSON.stringify({ ...localRecords(), [progress.movieSlug]: progress })) }

export function useWatchProgress() {
  const { user } = useAuth()
  const [records, setRecords] = useState<Record<string, WatchProgress>>({})
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const local = localRecords()
      if (!user || !database) { if (!cancelled) setRecords(local); return }
      try {
        const snapshot = await get(ref(database, `users/${user.uid}/watchProgress`))
        const cloud = (snapshot.val() || {}) as Record<string, WatchProgress>
        const merged = { ...cloud }
        for (const [slug, value] of Object.entries(local)) if (!merged[slug] || value.updatedAt > merged[slug].updatedAt) { merged[slug] = value; await set(ref(database, `users/${user.uid}/watchProgress/${slug}`), value) }
        if (!cancelled) setRecords(merged)
      } catch { if (!cancelled) setRecords(local) }
    }
    void load()
    return () => { cancelled = true }
  }, [user])
  const saveProgress = useCallback(async (progress: WatchProgress) => {
    saveLocal(progress); setRecords((current) => ({ ...current, [progress.movieSlug]: progress }))
    if (user && database) await set(ref(database, `users/${user.uid}/watchProgress/${progress.movieSlug}`), progress).catch(() => undefined)
  }, [user])
  return { records, saveProgress }
}
