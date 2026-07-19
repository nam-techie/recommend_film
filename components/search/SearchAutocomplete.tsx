'use client'

import { FormEvent, KeyboardEvent, useEffect, useId, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LoaderCircle, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getImageUrl, searchMovies, type Movie } from '@/lib/api'

type SearchVariant = 'header' | 'hero' | 'mobile'

interface SearchAutocompleteProps {
  initialValue?: string
  variant?: SearchVariant
  autoFocus?: boolean
}

export function SearchAutocomplete({ initialValue = '', variant = 'hero', autoFocus = false }: SearchAutocompleteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const listboxId = useId()
  const [value, setValue] = useState(initialValue)
  const [suggestions, setSuggestions] = useState<Movie[]>([])
  const [focused, setFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => setValue(initialValue), [initialValue])
  useEffect(() => { setFocused(false); setActiveIndex(-1) }, [pathname])

  useEffect(() => {
    const keyword = value.trim()
    if (keyword.length < 2 || keyword === initialValue.trim()) {
      setSuggestions([])
      setLoading(false)
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const result = await searchMovies({ keyword, limit: 5 }, { signal: controller.signal })
        if (!controller.signal.aborted) {
          setSuggestions((result.items || []).slice(0, 5))
          setActiveIndex(-1)
        }
      } catch {
        if (!controller.signal.aborted) setSuggestions([])
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 300)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [initialValue, value])

  const goToSearch = () => {
    const keyword = value.trim()
    router.push(keyword ? `/search?keyword=${encodeURIComponent(keyword)}` : '/search')
    setFocused(false)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      router.push(`/movie/${suggestions[activeIndex].slug}`)
      setFocused(false)
      return
    }
    goToSearch()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') { setFocused(false); setActiveIndex(-1); return }
    if (!suggestions.length) return
    if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((index) => Math.min(suggestions.length - 1, index + 1)) }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => Math.max(-1, index - 1)) }
  }

  const showPanel = focused && value.trim().length >= 2 && (loading || suggestions.length > 0)
  const isCompact = variant !== 'hero'

  return (
    <form onSubmit={submit} className={cn('relative', variant === 'hero' ? 'w-full max-w-4xl' : variant === 'header' ? 'w-[250px] 2xl:w-[360px]' : 'w-full')}>
      <div className={cn(
        'group relative flex items-center border bg-[#121522]/95 transition-[border-color,box-shadow,background-color] focus-within:border-fuchsia-400/70 focus-within:bg-[#151827]',
        variant === 'hero' ? 'h-14 rounded-2xl border-white/10 shadow-2xl focus-within:shadow-[0_0_0_4px_rgba(217,70,239,.08)] sm:h-16' : 'h-10 rounded-full border-white/10'
      )}>
        <Search className={cn('pointer-events-none absolute text-slate-500 group-focus-within:text-fuchsia-300', variant === 'hero' ? 'left-5 h-5 w-5' : 'left-3.5 h-4 w-4')} />
        <input
          autoFocus={autoFocus}
          value={value}
          onChange={(event) => { setValue(event.target.value); setFocused(true) }}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 180)}
          onKeyDown={onKeyDown}
          placeholder={variant === 'hero' ? 'Tìm tên phim, diễn viên hoặc đạo diễn...' : 'Tìm tên phim...'}
          aria-label="Tìm kiếm phim"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          autoComplete="off"
          className={cn('h-full w-full bg-transparent text-white outline-none placeholder:text-slate-600', variant === 'hero' ? 'pl-14 pr-32 text-base sm:pr-40' : 'pl-10 pr-10 text-sm')}
        />
        {loading && <LoaderCircle className={cn('absolute animate-spin text-fuchsia-300', variant === 'hero' ? 'right-32 h-4 w-4 sm:right-40' : 'right-3.5 h-4 w-4')} />}
        {!loading && value && isCompact && <button type="button" onClick={() => { setValue(''); setSuggestions([]) }} aria-label="Xóa từ khóa" className="absolute right-2 flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-white/[0.06] hover:text-white"><X className="h-3.5 w-3.5" /></button>}
        {variant === 'hero' && <button type="submit" className="absolute right-1.5 flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 px-5 text-sm font-bold text-white shadow-lg shadow-fuchsia-950/30 hover:brightness-110 sm:h-12 sm:px-7"><Search className="h-4 w-4" /><span className="hidden sm:inline">Tìm kiếm</span></button>}
      </div>

      {showPanel && (
        <div id={listboxId} role="listbox" className={cn('absolute z-[80] overflow-hidden rounded-2xl border border-white/10 bg-[#111522]/[.98] p-2 shadow-[0_24px_70px_rgba(0,0,0,.55)] backdrop-blur-xl', variant === 'header' ? 'left-0 top-[calc(100%+12px)] w-[430px]' : 'inset-x-0 top-[calc(100%+10px)]')}>
          {loading && !suggestions.length ? <div className="flex h-20 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Đang tìm trong kho phim…</div> : suggestions.map((movie, index) => (
            <Link
              id={`${listboxId}-${index}`}
              role="option"
              aria-selected={activeIndex === index}
              key={movie._id || movie.slug}
              href={`/movie/${movie.slug}`}
              className={cn('flex items-center gap-3 rounded-xl p-2.5 outline-none transition-colors hover:bg-white/[0.065]', activeIndex === index && 'bg-fuchsia-500/10')}
            >
              <span className="relative h-[62px] w-11 shrink-0 overflow-hidden rounded-lg bg-slate-900 ring-1 ring-white/10"><Image src={getImageUrl(movie.poster_url || movie.thumb_url)} alt="" fill sizes="44px" className="object-cover" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-white">{movie.name}</span><span className="mt-1 block truncate text-xs text-slate-500">{movie.origin_name || 'Đang cập nhật'}{movie.year ? ` · ${movie.year}` : ''}</span><span className="mt-1.5 flex gap-1.5 text-[10px] font-bold uppercase"><span className="rounded bg-fuchsia-500/15 px-1.5 py-0.5 text-fuchsia-200">{movie.quality || 'HD'}</span>{movie.episode_current && <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-slate-400">{movie.episode_current}</span>}</span></span>
            </Link>
          ))}
          {!loading && suggestions.length > 0 && <button type="submit" className="mt-1 flex min-h-10 w-full items-center justify-center rounded-xl border-t border-white/[0.06] text-xs font-semibold text-fuchsia-300 hover:bg-fuchsia-500/10">Xem tất cả kết quả cho “{value.trim()}”</button>}
        </div>
      )}
    </form>
  )
}
