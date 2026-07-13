'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { get, ref, remove, set } from 'firebase/database'
import { database } from '@/lib/firebase'
import { useAuth } from '@/components/auth/AuthProvider'
import { WatchProgress, WatchProgressMovieV2 } from '@/lib/watch-party-types'
import { makeEpisodeKey } from '@/lib/watch-sync'

const LOCAL_V1 = 'cinemind:watch-progress:v1'
const LOCAL_V2 = 'cinemind:watch-progress:v2'
type ProgressStore = Record<string, WatchProgressMovieV2>

function parseLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { return JSON.parse(localStorage.getItem(key) || '') as T } catch { return fallback }
}
function normalize(progress: WatchProgress, previous?: WatchProgress): WatchProgress {
  const episodeKey = progress.episodeKey || makeEpisodeKey(progress.serverName, progress.episodeId)
  const elapsed = previous && progress.currentTime >= previous.currentTime ? Math.min(30, progress.currentTime - previous.currentTime) : 0
  return { ...progress, episodeKey, sourceId: progress.sourceId || `${progress.serverName}:${progress.episodeId}`, secondsWatched: (previous?.secondsWatched || 0) + elapsed, version: 2 }
}
function migrateV1(store: ProgressStore): ProgressStore {
  const legacy = parseLocal<Record<string, WatchProgress>>(LOCAL_V1, {})
  const next = { ...store }
  for (const [slug, progress] of Object.entries(legacy)) {
    if (next[slug]) continue
    const item = normalize(progress)
    next[slug] = { resume: item, episodes: { [item.episodeKey!]: item } }
  }
  return next
}
function writeLocal(store: ProgressStore) { localStorage.setItem(LOCAL_V2, JSON.stringify(store)) }

export function useWatchProgress() {
  const { user } = useAuth()
  const [store, setStore] = useState<ProgressStore>({})
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      let local = migrateV1(parseLocal<ProgressStore>(LOCAL_V2, {}))
      writeLocal(local)
      if (user && database) {
        try {
          const [v2Snapshot, v1Snapshot] = await Promise.all([
            get(ref(database, `users/${user.uid}/watchProgressV2`)),
            get(ref(database, `users/${user.uid}/watchProgress`))
          ])
          const cloud = (v2Snapshot.val() || {}) as ProgressStore
          const legacyCloud = (v1Snapshot.val() || {}) as Record<string, WatchProgress>
          for (const [slug, progress] of Object.entries(legacyCloud)) if (!cloud[slug] && !local[slug]) { const item = normalize(progress); local[slug] = { resume: item, episodes: { [item.episodeKey!]: item } } }
          for (const [slug, movie] of Object.entries(cloud)) if (!local[slug] || movie.resume.updatedAt >= local[slug].resume.updatedAt) local[slug] = movie
          for (const [slug, movie] of Object.entries(local)) await set(ref(database, `users/${user.uid}/watchProgressV2/${slug}`), movie)
          writeLocal(local)
        } catch { /* Local storage remains the offline write queue. */ }
      }
      if (!cancelled) setStore(local)
    }
    void load()
    return () => { cancelled = true }
  }, [user])

  const saveProgress = useCallback(async (progress: WatchProgress) => {
    const existing = store[progress.movieSlug]
    const key = progress.episodeKey || makeEpisodeKey(progress.serverName, progress.episodeId)
    const item = normalize(progress, existing?.episodes[key])
    const nextMovie: WatchProgressMovieV2 = { resume: item, episodes: { ...(existing?.episodes || {}), [item.episodeKey!]: item } }
    const next = { ...store, [progress.movieSlug]: nextMovie }
    writeLocal(next)
    setStore(next)
    if (user && database) await set(ref(database, `users/${user.uid}/watchProgressV2/${progress.movieSlug}`), nextMovie).catch(() => undefined)
  }, [store, user])

  const deleteMovieProgress = useCallback(async (movieSlug: string) => {
    setStore((current) => { const next = { ...current }; delete next[movieSlug]; writeLocal(next); return next })
    if (user && database) await remove(ref(database, `users/${user.uid}/watchProgressV2/${movieSlug}`)).catch(() => undefined)
  }, [user])

  const records = useMemo(() => Object.fromEntries(Object.entries(store).map(([slug, movie]) => [slug, movie.resume])), [store])
  const episodeRecords = useMemo(() => Object.values(store).flatMap((movie) => Object.values(movie.episodes)), [store])
  return { records, episodeRecords, saveProgress, deleteMovieProgress }
}
