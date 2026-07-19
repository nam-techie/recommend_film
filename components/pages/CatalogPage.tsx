import Link from 'next/link'
import { ChevronLeft, ChevronRight, Clapperboard, Sparkles } from 'lucide-react'
import { MovieGrid } from '@/components/ui/MovieGrid'
import { SearchAutocomplete } from '@/components/search/SearchAutocomplete'
import { CatalogFilters } from '@/components/search/CatalogFilters'
import { catalogQueryString, type CatalogQuery } from '@/lib/catalog'
import type { Country, Genre, Movie } from '@/lib/api'

interface CatalogPageProps {
  title: string
  description?: string
  movies: Movie[]
  query: CatalogQuery
  totalItems?: number
  totalPages?: number
  genres?: Genre[]
  countries?: Country[]
  showSearch?: boolean
}

export function CatalogPage({ title, description, movies, query, totalItems = movies.length, totalPages = 1, genres = [], countries = [], showSearch = false }: CatalogPageProps) {
  const previous = query.page > 1 ? `?${catalogQueryString(query, { page: query.page - 1 })}` : null
  const next = query.page < totalPages ? `?${catalogQueryString(query, { page: query.page + 1 })}` : null
  return <div className="mx-auto min-h-[70vh] max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
    {showSearch ? (
      <section className="relative mb-9 overflow-visible rounded-[2rem] border border-white/[0.06] bg-[radial-gradient(circle_at_top_left,rgba(192,38,211,.12),transparent_40%)] px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-300"><Sparkles className="h-4 w-4" /> Kho phim CineMind</div>
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">{query.keyword ? `Kết quả cho “${query.keyword}”` : 'Thư viện Điện ảnh'}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">{description || 'Gõ từ khóa và kết hợp bộ lọc thông minh để tìm bộ phim hợp gu nhất.'}</p>
        <p className="mt-2 text-xs font-semibold text-slate-600">{totalItems.toLocaleString('vi-VN')} phim trong kho</p>
        <div className="relative z-30 mt-7"><SearchAutocomplete initialValue={query.keyword} variant="hero" /></div>
      </section>
    ) : (
      <div className="mb-8 flex items-start gap-4"><span className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-fuchsia-500/10 text-fuchsia-300"><Clapperboard className="h-5 w-5" /></span><div><h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">{title}</h1>{description && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 sm:text-base">{description}</p>}<p className="mt-2 text-xs text-slate-600">{totalItems.toLocaleString('vi-VN')} phim</p></div></div>
    )}

    <CatalogFilters query={query} genres={genres} countries={countries} extended={showSearch} />

    {movies.length ? <MovieGrid movies={movies} /> : <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] py-24 text-center"><Clapperboard className="mx-auto h-9 w-9 text-slate-700" /><p className="mt-4 font-semibold text-slate-400">Không tìm thấy phim phù hợp</p><p className="mt-1 text-sm text-slate-600">Hãy thử từ khóa ngắn hơn hoặc đặt lại bộ lọc.</p></div>}

    {totalPages > 1 && <nav className="mt-12 flex items-center justify-center gap-3" aria-label="Phân trang">{previous ? <Link href={previous} aria-label="Trang trước" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-white hover:border-fuchsia-400/30 hover:bg-fuchsia-500/10"><ChevronLeft className="h-5 w-5" /></Link> : <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.02] text-slate-700"><ChevronLeft className="h-5 w-5" /></span>}<span className="flex h-11 items-center rounded-full border border-white/10 bg-white/[0.045] px-5 text-sm font-semibold text-white">Trang {query.page} <span className="mx-1.5 text-slate-600">/</span> {totalPages}</span>{next ? <Link href={next} aria-label="Trang sau" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-white hover:border-fuchsia-400/30 hover:bg-fuchsia-500/10"><ChevronRight className="h-5 w-5" /></Link> : <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.02] text-slate-700"><ChevronRight className="h-5 w-5" /></span>}</nav>}
  </div>
}
