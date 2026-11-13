'use client'

import { useEffect, useState } from 'react'
import type { KaraokeQueueItem, KaraokeRoom } from '@/lib/karaoke-types'
import { fetchKaraokeYoutubeTitle } from '@/lib/karaoke-youtube-title'

/** Also fills legacy ID-only labels already present in an active room. */
export function useKaraokeTitles(room: KaraokeRoom | null): KaraokeRoom | null {
  const [titles, setTitles] = useState<Record<string, string | null>>({})
  const songs = [...(room?.queue || []), ...(room?.performance ? [room.performance.song] : [])]
  const ids = Array.from(new Set(songs.filter(song => song.label === song.videoId || !song.label.trim()).map(song => song.videoId))).sort().join(',')
  useEffect(() => {
    if (!ids) return
    const controller = new AbortController()
    void Promise.all(ids.split(',').filter(id => titles[id] === undefined).map(async id => {
      const title = await fetchKaraokeYoutubeTitle(id, controller.signal)
      if (!controller.signal.aborted) setTitles(previous => ({ ...previous, [id]: title }))
    }))
    return () => controller.abort()
  // Retry cancelled requests when the set of videos changes, not on every room snapshot.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids])
  if (!room) return null
  const titled = (song: KaraokeQueueItem) => (song.label === song.videoId || !song.label.trim()) && titles[song.videoId] ? { ...song, label: titles[song.videoId]! } : song
  return { ...room, queue: room.queue.map(titled), performance: room.performance ? { ...room.performance, song: titled(room.performance.song) } : null }
}
