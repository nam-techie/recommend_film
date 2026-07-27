import Link from 'next/link'
import { Play, Star } from 'lucide-react'
import { MovieImage } from '@/components/ui/MovieImage'
import { getImageUrl, type Movie } from '@/lib/api'

export function MovieCard({
  movie,
  /** 0–100. Có giá trị thì hiện thanh tiến độ đã xem. */
  progress,
}: {
  movie: Movie
  progress?: number
}) {
  const rating = movie.tmdb?.vote_average || 0
  const subtitle = movie.origin_name && movie.origin_name !== movie.name ? movie.origin_name : movie.year ? String(movie.year) : null

  return (
    <article className="min-w-0">
      <Link href={`/movie/${movie.slug}`} className="group block rounded-lg focus-visible:outline-none">
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-surface-2 ring-1 ring-white/[0.07] transition-shadow duration-200 group-hover:ring-accent/50 group-hover:shadow-card">
          <MovieImage
            src={getImageUrl(movie.poster_url)}
            alt={movie.name}
            fallbackLabel={movie.name}
            fill
            sizes="(max-width: 640px) 44vw, (max-width: 1024px) 29vw, 220px"
            className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.04]"
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

          {rating > 0 && (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-sm bg-rating px-1.5 py-0.5 text-xs font-bold text-black">
              <Star className="h-3 w-3 fill-current" aria-hidden />
              {rating.toFixed(1)}
            </span>
          )}

          {/* Nút play chỉ là dấu hiệu thị giác — cả card đã là link. */}
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/95 shadow-accent">
              <Play className="h-5 w-5 fill-current text-accent-fg" aria-hidden />
            </span>
          </span>

          <div className="absolute inset-x-2 bottom-2 flex flex-wrap items-end gap-1 text-xs font-semibold text-fg">
            {movie.episode_current && (
              <span className="rounded-sm bg-accent/95 px-1.5 py-0.5">{movie.episode_current}</span>
            )}
            {movie.quality && (
              <span className="rounded-sm bg-black/70 px-1.5 py-0.5 ring-1 ring-white/20">{movie.quality}</span>
            )}
          </div>

          {progress !== undefined && progress > 0 && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
              <div className="h-full bg-accent" style={{ width: `${Math.min(100, progress)}%` }} />
            </div>
          )}
        </div>

        <h3 className="mt-2 truncate text-sm font-semibold text-fg transition-colors group-hover:text-accent-soft">{movie.name}</h3>
        {subtitle && <p className="mt-0.5 truncate text-xs text-fg-muted">{subtitle}</p>}
      </Link>
    </article>
  )
}
