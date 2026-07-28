'use client'

import { FormEvent, KeyboardEvent, useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LoaderCircle, Search, X } from 'lucide-react'
import { MovieImage } from '@/components/ui/MovieImage'
import { cn } from '@/lib/utils'
import { getImageUrl, searchMovies, type Movie } from '@/lib/api'

type SearchVariant = 'header' | 'hero' | 'mobile'

interface SearchAutocompleteProps {
  initialValue?: string
  variant?: SearchVariant
  autoFocus?: boolean
  preservedQuery?: string
}

export function SearchAutocomplete({ initialValue = '', variant = 'hero', autoFocus = false, preservedQuery = '' }: SearchAutocompleteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const listboxId = useId()
  const rootRef = useRef<HTMLFormElement>(null)
  const [value, setValue] = useState(initialValue)
  const [suggestions, setSuggestions] = useState<Movie[]>([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => setValue(initialValue), [initialValue])
  useEffect(() => { setPanelOpen(false); setActiveIndex(-1) }, [pathname])
  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setPanelOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [])

  useEffect(() => {
    const keyword = value.trim()
    setSuggestions([])
    setActiveIndex(-1)
    setLoaded(false)
    setSearchError(false)
    if (!panelOpen || keyword.length < 2) { setLoading(false); return }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const result = await searchMovies({ keyword, limit: 5 }, { signal: controller.signal })
        if (!controller.signal.aborted) {
          setSuggestions((result.items || []).slice(0, 5))
          setLoaded(true)
        }
      } catch {
        if (!controller.signal.aborted) { setSearchError(true); setLoaded(true) }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 300)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [panelOpen, value])

  const closePanel = () => { setPanelOpen(false); setActiveIndex(-1) }
  const goToSearch = () => {
    const keyword = value.trim()
    const params = new URLSearchParams(preservedQuery)
    if (keyword) params.set('keyword', keyword)
    else params.delete('keyword')
    params.delete('page')
    const query = params.toString()
    router.push(query ? `/search?${query}` : '/search')
    closePanel()
  }
  const chooseMovie = (movie: Movie) => { router.push(`/movie/${movie.slug}`); closePanel() }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (activeIndex >= 0 && suggestions[activeIndex]) return chooseMovie(suggestions[activeIndex])
    goToSearch()
  }
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); closePanel(); return }
    if (event.key === 'ArrowDown') {
      event.preventDefault(); setPanelOpen(true)
      setActiveIndex((index) => suggestions.length ? Math.min(suggestions.length - 1, index + 1) : -1)
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault(); setPanelOpen(true)
      setActiveIndex((index) => Math.max(-1, index - 1))
    }
  }
  const keywordReady = value.trim().length >= 2
  const showPanel = panelOpen && keywordReady && (loading || loaded || searchError)
  const isCompact = variant !== 'hero'

  return (
    <form ref={rootRef} onSubmit={submit} className={cn('relative', variant === 'hero' ? 'w-full max-w-4xl' : variant === 'header' ? 'w-[250px] 2xl:w-[360px]' : 'w-full')}>
      <div className={cn('group relative flex items-center border bg-[#121522]/95 transition-[border-color,box-shadow,background-color] focus-within:border-accent/70 focus-within:bg-[#151827]', variant === 'hero' ? 'h-14 rounded-2xl border-white/10 shadow-2xl focus-within:shadow-[0_0_0_4px_rgba(217,70,239,.08)] sm:h-16' : 'h-10 rounded-full border-white/10')}>
        <Search className={cn('pointer-events-none absolute text-fg-muted group-focus-within:text-accent-soft', variant === 'hero' ? 'left-5 h-5 w-5' : 'left-3.5 h-4 w-4')} />
        <input
          autoFocus={autoFocus}
          role="combobox"
          value={value}
          onChange={(event) => { setValue(event.target.value); setPanelOpen(true); setSuggestions([]); setLoaded(false); setSearchError(false) }}
          onFocus={() => setPanelOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={variant === 'hero' ? 'Tìm tên phim, diễn viên hoặc đạo diễn...' : 'Tìm tên phim...'}
          aria-label="Tìm kiếm phim"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls={showPanel ? listboxId : undefined}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          autoComplete="off"
          className={cn('h-full w-full bg-transparent text-fg outline-none placeholder:text-fg-muted', variant === 'hero' ? 'pl-14 pr-32 text-base sm:pr-40' : 'pl-10 pr-10 text-sm')}
        />
        {loading && <LoaderCircle className={cn('absolute animate-spin text-accent-soft', variant === 'hero' ? 'right-32 h-4 w-4 sm:right-40' : 'right-3.5 h-4 w-4')} />}
        {!loading && value && isCompact && <button type="button" onClick={() => { setValue(''); setSuggestions([]); setLoaded(false) }} aria-label="Xóa từ khóa" className="absolute right-2 flex h-7 w-7 items-center justify-center rounded-full text-fg-muted hover:bg-white/[0.06] hover:text-fg"><X className="h-3.5 w-3.5" /></button>}
        {variant === 'hero' && <button type="submit" className="absolute right-1.5 flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-strong px-5 text-sm font-bold text-fg shadow-lg shadow-accent hover:brightness-110 sm:h-12 sm:px-7"><Search className="h-4 w-4" /><span className="hidden sm:inline">Tìm kiếm</span></button>}
      </div>

      {showPanel && <div id={listboxId} role="listbox" className={cn('absolute z-[80] overflow-hidden rounded-2xl border border-white/10 bg-[#111522]/[.98] p-2 shadow-[0_24px_70px_rgba(0,0,0,.55)] backdrop-blur-xl', variant === 'header' ? 'left-0 top-[calc(100%+12px)] w-[min(430px,calc(100vw-2rem))]' : 'inset-x-0 top-[calc(100%+10px)]')}>
        {loading && !suggestions.length && <div className="flex h-20 items-center justify-center gap-2 text-sm text-fg-muted"><LoaderCircle className="h-4 w-4 animate-spin" /> Đang tìm trong kho phim…</div>}
        {!loading && searchError && <div role="status" className="px-4 py-6 text-center text-sm text-bad">Không thể tải gợi ý. Bạn vẫn có thể bấm Tìm kiếm.</div>}
        {!loading && loaded && !searchError && !suggestions.length && <div role="status" className="px-4 py-6 text-center text-sm text-fg-muted">Không có gợi ý phù hợp.</div>}
        {suggestions.map((movie, index) => <Link
          id={`${listboxId}-${index}`}
          role="option"
          aria-selected={activeIndex === index}
          tabIndex={-1}
          key={movie._id || movie.slug}
          href={`/movie/${movie.slug}`}
          onPointerMove={() => setActiveIndex(index)}
          onClick={closePanel}
          className={cn('flex items-center gap-3 rounded-xl p-2.5 outline-none transition-colors hover:bg-white/[0.065]', activeIndex === index && 'bg-accent/10')}
        >
          <span className="relative h-[62px] w-11 shrink-0 overflow-hidden rounded-lg bg-slate-900 ring-1 ring-white/10"><MovieImage src={getImageUrl(movie.poster_url || movie.thumb_url)} alt="" fill sizes="44px" className="object-cover" /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-fg">{movie.name}</span><span className="mt-1 block truncate text-xs text-fg-muted">{movie.origin_name || 'Đang cập nhật'}{movie.year ? ` · ${movie.year}` : ''}</span><span className="mt-1.5 flex gap-1.5 text-xs font-bold uppercase"><span className="rounded bg-accent/15 px-1.5 py-0.5 text-accent-soft">{movie.quality || 'HD'}</span>{movie.episode_current && <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-fg-secondary">{movie.episode_current}</span>}</span></span>
        </Link>)}
        {!loading && suggestions.length > 0 && <button type="button" onClick={goToSearch} className="mt-1 flex min-h-10 w-full items-center justify-center rounded-xl border-t border-white/[0.06] text-xs font-semibold text-accent-soft hover:bg-accent/10">Xem tất cả kết quả cho “{value.trim()}”</button>}
      </div>}
    </form>
  )
}
