'use client'

import Link from 'next/link'
import { Play } from 'lucide-react'
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

export function ContinueWatching() {
  const { records } = useWatchProgress()
  const items = Object.values(records)
    .filter((item) => !item.completed && item.duration > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 8)

  if (!items.length) return null

  return (
    <section aria-labelledby="continue-watching-heading">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow mb-1.5 text-accent-soft">Tiếp tục</p>
          <h2 id="continue-watching-heading" className="text-title-1 text-fg">Xem tiếp</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => {
          const remaining = Math.max(0, item.duration - item.currentTime)
          return (
            <Link
              key={item.movieSlug}
              href={`/movie/${item.movieSlug}?watch=1&episode=${encodeURIComponent(item.episodeId)}&t=${Math.floor(item.currentTime)}`}
              className="group overflow-hidden rounded-lg border border-border bg-surface-1 transition-colors hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <div className="relative aspect-video overflow-hidden bg-surface-2">
                <MovieImage
                  src={item.poster}
                  alt=""
                  fallbackLabel={item.movieTitle}
                  fill
                  sizes="(max-width: 640px) 92vw, (max-width: 1280px) 46vw, 300px"
                  className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/95 shadow-accent">
                    <Play className="h-6 w-6 fill-current text-accent-fg" aria-hidden />
                  </span>
                </span>

                <span className="absolute bottom-2 right-2 rounded-sm bg-black/80 px-1.5 py-0.5 text-xs font-semibold text-fg">
                  Còn {formatTime(remaining)}
                </span>
              </div>

              <div className="p-3">
                <h3 className="truncate text-sm font-semibold text-fg group-hover:text-accent-soft">{item.movieTitle}</h3>
                <p className="mt-0.5 truncate text-xs text-fg-muted">{item.episodeName} · {item.serverName}</p>
                <WatchProgressBar percentage={item.percentage} size="sm" className="mt-2.5" />
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
