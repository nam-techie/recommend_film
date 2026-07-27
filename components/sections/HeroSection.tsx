'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Info, Pause, Play, Star } from 'lucide-react'
import { MovieImage } from '@/components/ui/MovieImage'
import { Button } from '@/components/ui/button'
import { getImageUrl, type Movie } from '@/lib/api'

export function HeroSection({ movies }: { movies: Movie[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [userPaused, setUserPaused] = useState(false)

  const changeSlide = useCallback((index: number) => {
    if (!movies.length) return
    setCurrentIndex((index + movies.length) % movies.length)
  }, [movies.length])

  useEffect(() => {
    if (paused || userPaused || movies.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') setCurrentIndex((value) => (value + 1) % movies.length)
    }, 8000)
    return () => window.clearInterval(timer)
  }, [movies.length, paused, userPaused])

  if (!movies.length) {
    return <div className="hero-shell flex items-center justify-center bg-slate-950 text-fg-secondary">Chưa có phim nổi bật.</div>
  }

  const movie = movies[currentIndex]
  const rating = movie.tmdb?.vote_average || 0

  return (
    <section
      className="hero-shell group"
      aria-label="Phim nổi bật"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <MovieImage
        key={movie.slug}
        src={getImageUrl(movie.thumb_url || movie.poster_url)}
        alt=""
        fill
        priority={currentIndex === 0}
       
        quality={72}
        sizes="100vw"
        className="object-cover object-center motion-safe:animate-hero-fade"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#080911] via-[#080911]/75 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#080911] via-transparent to-black/25" />

      <div className="relative z-10 flex h-full items-end px-4 pb-14 pt-28 sm:px-8 sm:pb-16 lg:items-center lg:px-12 xl:px-20">
        <div className="max-w-3xl">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-fg sm:text-sm">
            {rating > 0 && <span className="inline-flex items-center gap-1 rounded-md bg-rating px-2 py-1 text-black"><Star className="h-3.5 w-3.5 fill-current" aria-hidden />{rating.toFixed(1)}</span>}
            <span className="rounded-md border border-white/35 bg-black/25 px-2 py-1">{movie.quality || 'HD'}</span>
            <span className="rounded-md border border-white/35 bg-black/25 px-2 py-1">{movie.year}</span>
            <span className="rounded-md border border-white/35 bg-black/25 px-2 py-1">{movie.episode_current || movie.time}</span>
          </div>
          <h1 className="text-display max-w-3xl text-fg">{movie.name}</h1>
          {movie.origin_name && movie.origin_name !== movie.name && <p className="mt-2 text-sm text-fg-secondary sm:text-lg">{movie.origin_name}</p>}
          {movie.content && <p className="mt-4 line-clamp-3 max-w-2xl text-sm leading-6 text-fg-secondary sm:text-base sm:leading-7">{movie.content.replace(/<[^>]*>/g, '')}</p>}
          <div className="mt-5 flex gap-3">
            <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-accent to-accent-strong px-6 text-accent-fg shadow-accent hover:opacity-90">
              <Link href={`/movie/${movie.slug}?watch=1`}><Play className="h-5 w-5 fill-current" aria-hidden /> Xem ngay</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full border-white/25 bg-black/25 px-6 text-fg hover:bg-white/10">
              <Link href={`/movie/${movie.slug}`}><Info className="h-5 w-5" aria-hidden /> Chi tiết</Link>
            </Button>
          </div>
        </div>
      </div>

      {movies.length > 1 && (
        <>
          <button type="button" onClick={() => changeSlide(currentIndex - 1)} aria-label="Phim nổi bật trước" className="hero-arrow left-3 sm:left-6"><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" onClick={() => changeSlide(currentIndex + 1)} aria-label="Phim nổi bật tiếp theo" className="hero-arrow right-3 sm:right-6"><ChevronRight className="h-5 w-5" /></button>
          <div className="absolute bottom-3 left-4 z-20 flex items-center gap-1 sm:left-8 lg:left-12 xl:left-20">
            {movies.map((item, index) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => changeSlide(index)}
                aria-label={`Xem ${item.name}`}
                aria-current={index === currentIndex}
                /* Vùng bấm 44px (py-5 + px-1.5) nhưng vạch chỉ báo vẫn mảnh về thị giác.
                   Trước đây target chỉ cao 6px — không bấm được trên mobile. */
                className="group/dot flex h-11 items-center px-1.5"
              >
                <span
                  className={`block h-1.5 rounded-full transition-[width,background-color] ${
                    index === currentIndex ? 'w-9 bg-accent' : 'w-3 bg-white/40 group-hover/dot:bg-white/80'
                  }`}
                />
              </button>
            ))}
            {/* WCAG 2.2.2: carousel tự chạy phải có cách dừng tường minh, không chỉ dựa vào hover. */}
            <button
              type="button"
              onClick={() => setUserPaused((value) => !value)}
              aria-label={userPaused ? 'Chạy lại trình chiếu phim nổi bật' : 'Tạm dừng trình chiếu phim nổi bật'}
              className="ml-2 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/40 text-fg transition-colors hover:bg-black/70"
            >
              {userPaused ? <Play className="h-4 w-4 fill-current" aria-hidden /> : <Pause className="h-4 w-4 fill-current" aria-hidden />}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
