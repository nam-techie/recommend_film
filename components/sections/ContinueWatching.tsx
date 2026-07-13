'use client'

import Link from 'next/link'
import { PlayCircle } from 'lucide-react'
import { useWatchProgress } from '@/hooks/useWatchProgress'

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`

export function ContinueWatching() {
  const { records } = useWatchProgress()
  const items = Object.values(records).filter((item) => !item.completed && item.duration > 0).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8)
  if (!items.length) return null
  return <section><div className="mb-4 flex items-center gap-2"><PlayCircle className="h-6 w-6 text-purple-400" /><h2 className="text-2xl font-bold text-white">Xem tiếp</h2></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{items.map((item) => <Link key={item.movieSlug} href={`/movie/${item.movieSlug}?watch=1&episode=${encodeURIComponent(item.episodeId)}&t=${Math.floor(item.currentTime)}`} className="group overflow-hidden rounded-xl border border-white/10 bg-black/40"><div className="flex gap-3 p-3">{item.poster && <img src={item.poster} alt="" className="h-24 w-16 rounded object-cover" />}<div className="min-w-0"><h3 className="line-clamp-2 font-semibold text-white">{item.movieTitle}</h3><p className="mt-1 text-sm text-gray-400">{item.episodeName} · {item.serverName}</p><p className="mt-2 text-xs text-gray-500">Đã xem {formatTime(item.currentTime)} / {formatTime(item.duration)}</p></div></div><div className="h-1.5 bg-white/10"><div className="h-full bg-purple-500" style={{ width: `${Math.min(100, item.percentage)}%` }} /></div></Link>)}</div></section>
}
