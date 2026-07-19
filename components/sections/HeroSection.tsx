'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Info, Play, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getImageUrl, type Movie } from '@/lib/api'

export function HeroSection({ movies }: { movies: Movie[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const changeSlide = useCallback((index: number) => {
    if (!movies.length) return
    setCurrentIndex((index + movies.length) % movies.length)
  }, [movies.length])

  useEffect(() => {
    if (paused || movies.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') setCurrentIndex((value) => (value + 1) % movies.length)
    }, 8000)
    return () => window.clearInterval(timer)
  }, [movies.length, paused])

  if (!movies.length) {
    return <div className="hero-shell flex items-center justify-center bg-slate-950 text-slate-400">Chưa có phim nổi bật.</div>
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
      <Image
        key={movie.slug}
        src={getImageUrl(movie.thumb_url || movie.poster_url)}
        alt=""
        fill
        priority={currentIndex === 0}
        quality={78}
        sizes="100vw"
        className="object-cover object-center motion-safe:animate-hero-fade"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#080911] via-[#080911]/75 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#080911] via-transparent to-black/25" />

      <div className="relative z-10 flex h-full items-end px-4 pb-14 pt-28 sm:px-8 sm:pb-16 lg:items-center lg:px-12 xl:px-20">
        <div className="max-w-3xl">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-white sm:text-sm">
            {rating > 0 && <span className="inline-flex items-center gap-1 rounded-md bg-amber-400 px-2 py-1 text-black"><Star className="h-3.5 w-3.5 fill-current" />{rating.toFixed(1)}</span>}
            <span className="rounded-md border border-white/35 bg-black/25 px-2 py-1">{movie.quality || 'HD'}</span>
            <span className="rounded-md border border-white/35 bg-black/25 px-2 py-1">{movie.year}</span>
            <span className="rounded-md border border-white/35 bg-black/25 px-2 py-1">{movie.episode_current || movie.time}</span>
          </div>
          <h1 className="max-w-3xl text-3xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">{movie.name}</h1>
          {movie.origin_name && movie.origin_name !== movie.name && <p className="mt-2 text-sm text-slate-300 sm:text-lg">{movie.origin_name}</p>}
          {movie.content && <p className="mt-4 line-clamp-3 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base sm:leading-7">{movie.content.replace(/<[^>]*>/g, '')}</p>}
          <div className="mt-5 flex gap-3">
            <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 px-6 text-white shadow-lg shadow-fuchsia-950/30 hover:opacity-90">
              <Link href={`/movie/${movie.slug}?watch=1`}><Play className="h-5 w-5 fill-current" /> Xem ngay</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full border-white/25 bg-black/25 px-6 text-white hover:bg-white/10">
              <Link href={`/movie/${movie.slug}`}><Info className="h-5 w-5" /> Chi tiết</Link>
            </Button>
          </div>
        </div>
      </div>

      {movies.length > 1 && (
        <>
          <button type="button" onClick={() => changeSlide(currentIndex - 1)} aria-label="Phim nổi bật trước" className="hero-arrow left-3 sm:left-6"><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" onClick={() => changeSlide(currentIndex + 1)} aria-label="Phim nổi bật tiếp theo" className="hero-arrow right-3 sm:right-6"><ChevronRight className="h-5 w-5" /></button>
          <div className="absolute bottom-5 left-4 z-20 flex gap-2 sm:left-8 lg:left-12 xl:left-20">
            {movies.map((item, index) => (
              <button key={item.slug} type="button" onClick={() => changeSlide(index)} aria-label={`Xem ${item.name}`} aria-current={index === currentIndex} className={`h-1.5 rounded-full transition-[width,background-color] ${index === currentIndex ? 'w-9 bg-fuchsia-400' : 'w-3 bg-white/35 hover:bg-white/70'}`} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
