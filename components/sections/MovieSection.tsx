import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { MovieCard } from '@/components/ui/MovieCard'
import type { Movie } from '@/lib/api'

interface MovieSectionProps {
  title: string
  subtitle?: string
  href?: string
  movies: Movie[]
}

export function MovieSection({ title, subtitle, href, movies }: MovieSectionProps) {
  if (!movies.length) return null

  return (
    <section className="deferred-section">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {href && <Link href={href} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-slate-400 hover:text-white">Xem tất cả <ArrowRight className="h-4 w-4" /></Link>}
      </div>
      <div className="movie-rail">
        {movies.map((movie) => <MovieCard key={movie._id || movie.slug} movie={movie} />)}
      </div>
    </section>
  )
}
