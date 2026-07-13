'use client'

import Link from 'next/link'
import { History, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWatchProgress } from '@/hooks/useWatchProgress'

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`

export default function HistoryPage() {
  const { episodeRecords, deleteMovieProgress } = useWatchProgress()
  const items = [...episodeRecords].sort((a, b) => b.updatedAt - a.updatedAt)
  return <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 text-white">
    <div className="mb-8 flex items-center gap-3"><History className="h-7 w-7 text-purple-400" /><div><h1 className="text-3xl font-bold">Lịch sử xem</h1><p className="text-sm text-gray-400">Tiến độ riêng cho từng tập, gồm cả xem cá nhân và xem chung.</p></div></div>
    {!items.length ? <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center text-gray-400">Bạn chưa có lịch sử xem.</div> : <div className="space-y-3">{items.map((item) => <div key={`${item.movieSlug}:${item.episodeKey}`} className="flex items-center gap-4 rounded-xl border border-white/10 bg-black/30 p-3">
      {item.poster && <img src={item.poster} alt="" className="h-24 w-16 rounded object-cover" />}
      <Link className="min-w-0 flex-1" href={`/movie/${item.movieSlug}?watch=1&episode=${encodeURIComponent(item.episodeId)}&t=${Math.floor(item.currentTime)}`}><h2 className="truncate font-semibold">{item.movieTitle}</h2><p className="text-sm text-gray-400">{item.episodeName} · {item.serverName}</p><p className="mt-2 text-xs text-gray-500">{formatTime(item.currentTime)} / {formatTime(item.duration)} · {item.source === 'watch_party' ? 'Xem chung' : 'Xem cá nhân'}</p><div className="mt-2 h-1.5 overflow-hidden rounded bg-white/10"><div className="h-full bg-purple-500" style={{ width: `${Math.min(100, item.percentage)}%` }} /></div></Link>
      <Button size="icon" variant="outline" aria-label="Xóa lịch sử phim" onClick={() => void deleteMovieProgress(item.movieSlug)}><Trash2 className="h-4 w-4" /></Button>
    </div>)}</div>}
  </main>
}
