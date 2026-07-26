import { Movie } from '@/lib/api'
import { MovieCard } from './MovieCard'

const GRID_COLS = 'grid-cols-2 min-[520px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
const GRID_GAP = 'gap-x-3 gap-y-6 lg:gap-x-4 lg:gap-y-7'

export function MovieGrid({ movies, className = '', loading = false }: { movies: Movie[]; className?: string; loading?: boolean }) {
  if (loading) {
    return (
      <div className={`grid ${GRID_COLS} ${GRID_GAP} ${className}`} aria-busy="true" aria-label="Đang tải danh sách phim">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="skeleton aspect-[2/3] w-full rounded-lg" />
            <div className="skeleton h-4 w-3/4 rounded-sm" />
            <div className="skeleton h-3 w-1/2 rounded-sm" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`grid ${GRID_COLS} ${GRID_GAP} ${className}`}>
      {movies.map((movie) => (
        <MovieCard key={movie._id || movie.slug} movie={movie} />
      ))}
    </div>
  )
}
