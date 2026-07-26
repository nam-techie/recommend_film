'use client'

import Link from 'next/link'
import { History, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MovieImage } from '@/components/ui/MovieImage'
import { WatchProgressBar } from '@/components/ui/WatchProgressBar'
import { useWatchProgress } from '@/hooks/useWatchProgress'

const formatTime = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  const pad = (value: number) => value.toString().padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`
}

export default function HistoryPage() {
  const { episodeRecords, deleteMovieProgress } = useWatchProgress()
  const items = [...episodeRecords].sort((a, b) => b.updatedAt - a.updatedAt)

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10 text-fg sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent/12 text-accent-soft">
          <History className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <h1 className="text-title-1">Lịch sử xem</h1>
          <p className="text-sm text-fg-muted">Tiến độ riêng cho từng tập, gồm cả xem cá nhân và xem chung.</p>
        </div>
      </div>

      {!items.length ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-1 p-12 text-center">
          <p className="text-fg-secondary">Bạn chưa có lịch sử xem.</p>
          <Button asChild className="mt-4 rounded-full"><Link href="/">Khám phá phim</Link></Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={`${item.movieSlug}:${item.episodeKey}`}
              className="flex items-center gap-4 rounded-lg border border-border bg-surface-1 p-3 transition-colors hover:border-accent/40"
            >
              <Link
                href={`/movie/${item.movieSlug}?watch=1&episode=${encodeURIComponent(item.episodeId)}&t=${Math.floor(item.currentTime)}`}
                className="flex min-w-0 flex-1 items-center gap-4 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className="relative h-24 w-16 shrink-0 overflow-hidden rounded-md bg-surface-2">
                  <MovieImage src={item.poster} alt="" fallbackLabel={item.movieTitle} fill sizes="64px" className="object-cover" />
                </span>
                <span className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">{item.movieTitle}</h2>
                  <p className="truncate text-sm text-fg-secondary">{item.episodeName} · {item.serverName}</p>
                  <p className="mt-1.5 text-xs text-fg-muted">
                    {formatTime(item.currentTime)} / {formatTime(item.duration)} · {item.source === 'watch_party' ? 'Xem chung' : 'Xem cá nhân'}
                  </p>
                  <WatchProgressBar percentage={item.percentage} size="sm" className="mt-2" />
                </span>
              </Link>
              <Button
                size="icon"
                variant="outline"
                aria-label={`Xoá lịch sử ${item.movieTitle}`}
                onClick={() => void deleteMovieProgress(item.movieSlug)}
                className="shrink-0 hover:border-bad/50 hover:text-bad"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
