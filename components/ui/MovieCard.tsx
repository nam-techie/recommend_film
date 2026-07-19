import Image from 'next/image'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { getImageUrl, type Movie } from '@/lib/api'

export function MovieCard({ movie }: { movie: Movie; variant?: 'default' | 'hover-expand' }) {
  const rating = movie.tmdb?.vote_average || 0
  return (
    <article className="movie-card min-w-0">
      <Link href={`/movie/${movie.slug}`} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 focus-visible:ring-offset-4 focus-visible:ring-offset-[#080911]">
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-slate-900 ring-1 ring-white/[0.07]">
          <Image
            src={getImageUrl(movie.poster_url)}
            alt={movie.name}
            fill
            quality={75}
            sizes="(max-width: 640px) 44vw, (max-width: 1024px) 29vw, 180px"
            className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.025]"
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/85 to-transparent" />
          {rating > 0 && <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-amber-400 px-1.5 py-1 text-[10px] font-black text-black"><Star className="h-3 w-3 fill-current" />{rating.toFixed(1)}</span>}
          <div className="absolute inset-x-2 bottom-2 flex flex-wrap items-end gap-1 text-[9px] font-bold text-white sm:text-[10px]">
            {movie.lang && <span className="rounded bg-fuchsia-600/95 px-1.5 py-0.5">{movie.lang}</span>}
            {movie.episode_current && <span className="rounded bg-slate-700/95 px-1.5 py-0.5">{movie.episode_current}</span>}
          </div>
        </div>
        <h3 className="mt-2 truncate text-sm font-semibold text-slate-100 transition-colors group-hover:text-fuchsia-300">{movie.name}</h3>
        {movie.origin_name && <p className="mt-0.5 truncate text-xs text-slate-500">{movie.origin_name}</p>}
      </Link>
    </article>
  )
}
