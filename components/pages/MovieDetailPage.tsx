'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CalendarDays, CheckCircle2, Clapperboard, Clock3, Film, Info, Lightbulb, LightbulbOff, ListVideo, MessageSquareText, Play, PlayCircle, RectangleHorizontal, Sparkles, Star, Users } from 'lucide-react'
import { buildWatchPartyEpisodes } from '@/hooks/useWatchParty'
import { useWatchProgress } from '@/hooks/useWatchProgress'
import { Button } from '@/components/ui/button'
import { CreateWatchPartyDialog } from '@/components/ui/CreateWatchPartyDialog'
import { MovieLibraryActions } from '@/components/account/MovieLibraryActions'
import { MovieSocialPanel } from '@/components/account/MovieSocialPanel'
import { cn } from '@/lib/utils'
import { getImageUrl, type MovieDetail } from '@/lib/api'
import type { WatchPartyPlayback } from '@/lib/watch-party-types'

const SyncedHlsPlayer = dynamic(
  () => import('@/components/ui/SyncedHlsPlayer').then((module) => module.SyncedHlsPlayer),
  { ssr: false, loading: () => <div className="aspect-video w-full animate-pulse bg-slate-950" /> },
)

type DetailTab = 'episodes' | 'info' | 'reviews'

export function MovieDetailPage({ slug, initialDetail }: { slug: string; initialDetail: MovieDetail }) {
  const [selectedServer, setSelectedServer] = useState(0)
  const [selectedEpisode, setSelectedEpisode] = useState(0)
  const [showPlayer, setShowPlayer] = useState(false)
  const [tab, setTab] = useState<DetailTab>('episodes')
  const [autoNext, setAutoNext] = useState(true)
  const [playerFullscreen, setPlayerFullscreen] = useState(false)
  const [pseudoFullscreen, setPseudoFullscreen] = useState(false)
  const [lightsOff, setLightsOff] = useState(false)
  const [theaterMode, setTheaterMode] = useState(false)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const lastSavedAtRef = useRef(0)
  const searchParams = useSearchParams()
  const { saveProgress } = useWatchProgress()
  const { movie, episodes } = initialDetail
  const watchPartyEpisodes = useMemo(() => buildWatchPartyEpisodes(episodes || []), [episodes])
  const currentEpisode = episodes?.[selectedServer]?.server_data?.[selectedEpisode]
  const currentHlsEpisode = useMemo(() => watchPartyEpisodes.find((episode) => episode.serverIndex === selectedServer && episode.episodeIndex === selectedEpisode), [selectedEpisode, selectedServer, watchPartyEpisodes])
  const previousHlsEpisode = useMemo(() => watchPartyEpisodes.find((episode) => episode.serverIndex === selectedServer && episode.episodeIndex === selectedEpisode - 1 && episode.linkM3u8), [selectedEpisode, selectedServer, watchPartyEpisodes])
  const nextHlsEpisode = useMemo(() => watchPartyEpisodes.find((episode) => episode.serverIndex === selectedServer && episode.episodeIndex === selectedEpisode + 1 && episode.linkM3u8), [selectedEpisode, selectedServer, watchPartyEpisodes])
  const [soloPlayback, setSoloPlayback] = useState<WatchPartyPlayback>({ episodeId: '', currentTime: 0, isPlaying: false, revision: 0, serverUpdatedAt: Date.now(), updatedBy: 'solo', action: 'pause' })

  useEffect(() => {
    if (!currentHlsEpisode) return
    setSoloPlayback((current) => ({ ...current, episodeId: currentHlsEpisode.id, currentTime: 0, isPlaying: false, revision: current.revision + 1, serverUpdatedAt: Date.now(), action: 'episode_change' }))
  }, [currentHlsEpisode])

  useEffect(() => {
    if (searchParams.get('watch') !== '1' || !episodes?.length) return
    const requested = searchParams.get('episode')
    if (requested) {
      for (let serverIndex = 0; serverIndex < episodes.length; serverIndex += 1) {
        const episodeIndex = episodes[serverIndex].server_data.findIndex((episode) => episode.slug === requested)
        if (episodeIndex >= 0) { setSelectedServer(serverIndex); setSelectedEpisode(episodeIndex); break }
      }
    }
    setShowPlayer(true)
  }, [episodes, searchParams])

  useEffect(() => {
    const onFullscreenChange = () => setPlayerFullscreen(document.fullscreenElement === playerContainerRef.current || pseudoFullscreen)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [pseudoFullscreen])

  useEffect(() => {
    if (!showPlayer) return
    const frame = requestAnimationFrame(() => playerContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    return () => cancelAnimationFrame(frame)
  }, [selectedEpisode, selectedServer, showPlayer])

  useEffect(() => {
    if (!lightsOff && !theaterMode) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.fullscreenElement) return
      setLightsOff(false)
      setTheaterMode(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lightsOff, theaterMode])

  const toggleFullscreen = async () => {
    const container = playerContainerRef.current
    if (!container) return
    if (pseudoFullscreen) { setPseudoFullscreen(false); setPlayerFullscreen(false); return }
    if (document.fullscreenElement === container) { await document.exitFullscreen(); return }
    try { await container.requestFullscreen() } catch { setPseudoFullscreen(true); setPlayerFullscreen(true) }
  }

  const selectEpisode = (serverIndex: number, episodeIndex: number, play = false) => {
    setSelectedServer(serverIndex)
    setSelectedEpisode(episodeIndex)
    if (play || showPlayer) setShowPlayer(true)
  }

  const rating = movie.tmdb?.vote_average || 0
  const content = decodeMovieContent(movie.content || 'Chưa có mô tả chi tiết cho phim này.')
  const videoUrl = currentEpisode?.link_m3u8 || currentEpisode?.link_embed
  const episodeCount = episodes?.reduce((sum, server) => sum + server.server_data.length, 0) || 0
  const libraryMovie = { slug: movie.slug, title: movie.name, poster: getImageUrl(movie.poster_url), year: movie.year }

  return (
    <div className="min-w-0 max-w-full overflow-x-clip bg-[#070912] pb-14">
      {lightsOff && <button type="button" aria-label="Bật đèn trở lại" onClick={() => setLightsOff(false)} className="fixed inset-0 z-[60] cursor-default bg-black/90" />}
      <section className="relative min-h-[690px] overflow-hidden border-b border-white/[0.06] bg-[#080911] lg:min-h-[760px]">
        <Image src={getImageUrl(movie.thumb_url || movie.poster_url)} alt="" fill priority quality={80} sizes="100vw" className="object-cover object-top" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_35%,transparent_0%,rgba(8,9,17,.24)_34%,rgba(8,9,17,.94)_88%)]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080911] via-[#080911]/76 to-[#080911]/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070912] via-transparent to-black/20" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#070912] to-transparent" />

        <div className="relative mx-auto flex min-h-[690px] max-w-[1540px] items-end gap-8 px-4 pb-16 pt-28 sm:px-6 lg:min-h-[760px] lg:items-center lg:px-8 lg:pb-20 xl:gap-11">
          <div className="relative hidden aspect-[2/3] w-52 shrink-0 overflow-hidden rounded-[1.7rem] border border-white/15 bg-slate-950 shadow-[0_30px_80px_rgba(0,0,0,.55)] md:block xl:w-60">
            <Image src={getImageUrl(movie.poster_url)} alt={movie.name} fill sizes="240px" className="object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/90 to-transparent" />
            {rating > 0 && <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-black text-black shadow-lg"><Star className="h-3.5 w-3.5 fill-current" /> {rating.toFixed(1)}</span>}
          </div>

          <div className="min-w-0 w-full max-w-4xl">
            <div className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-fuchsia-300"><Sparkles className="h-4 w-4" /> CineMind Spotlight</div>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-black text-white">
              <span className="rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 px-2.5 py-1.5 shadow-lg shadow-fuchsia-950/30">{movie.quality || 'HD'}</span>
              {movie.lang && <span className="rounded-lg border border-white/20 bg-black/30 px-2.5 py-1.5 backdrop-blur-md">{movie.lang}</span>}
              {movie.episode_current && <span className="rounded-lg border border-white/20 bg-black/30 px-2.5 py-1.5 backdrop-blur-md">{movie.episode_current}</span>}
              {rating > 0 && <span className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-2.5 py-1.5 text-black md:hidden"><Star className="h-3.5 w-3.5 fill-current" />{rating.toFixed(1)}</span>}
            </div>

            <h1 className="max-w-4xl text-4xl font-black leading-[.98] tracking-[-0.04em] text-white drop-shadow-2xl sm:text-6xl lg:text-7xl">{movie.name}</h1>
            {movie.origin_name && <p className="mt-3 text-lg font-medium text-slate-300 sm:text-2xl">{movie.origin_name}</p>}

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-slate-300">
              {movie.year && <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-fuchsia-300" />{movie.year}</span>}
              {movie.time && <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-fuchsia-300" />{movie.time}</span>}
              {movie.type && <span className="inline-flex items-center gap-1.5"><Clapperboard className="h-4 w-4 text-fuchsia-300" />{movie.type === 'single' ? 'Phim lẻ' : movie.type === 'series' ? 'Phim bộ' : 'Hoạt hình'}</span>}
            </div>

            <p className="mt-5 line-clamp-3 max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">{content}</p>
            <div className="mt-4 flex flex-wrap gap-2">{movie.category?.slice(0, 5).map((item) => <Link key={item.slug} href={`/genre/${item.slug}`} className="rounded-full border border-white/12 bg-white/[0.055] px-3 py-1.5 text-xs font-semibold text-slate-300 backdrop-blur-md hover:border-fuchsia-400/40 hover:text-fuchsia-100">{item.name}</Link>)}</div>

            <div className="mt-7 grid grid-cols-2 items-center gap-3 sm:flex sm:flex-wrap">
              {episodes?.length > 0 && <Button size="lg" onClick={() => selectEpisode(selectedServer, selectedEpisode, true)} className="h-12 w-full rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 px-5 font-bold text-white shadow-xl shadow-fuchsia-950/35 hover:brightness-110 sm:w-auto sm:px-7"><Play className="h-5 w-5 fill-current" /> Xem ngay</Button>}
              {episodes?.length > 0 && <CreateWatchPartyDialog movieSlug={movie.slug} movieTitle={movie.name} moviePoster={getImageUrl(movie.poster_url)} movieVideoUrl={videoUrl} episodes={watchPartyEpisodes} initialEpisodeId={currentHlsEpisode?.id}><Button size="lg" variant="outline" className="h-12 w-full rounded-full border-white/25 bg-black/25 px-4 text-white backdrop-blur-md hover:bg-white/10 sm:w-auto sm:px-6"><Users className="h-5 w-5" /> Xem chung</Button></CreateWatchPartyDialog>}
              {movie.trailer_url && <Button asChild size="lg" variant="outline" className="h-12 w-full rounded-full border-white/25 bg-black/25 px-5 text-white backdrop-blur-md hover:bg-white/10 sm:w-auto sm:px-6"><a href={movie.trailer_url} target="_blank" rel="noopener noreferrer"><Film className="h-5 w-5" /> Trailer</a></Button>}
            </div>
            <div className="mt-4 [&_button]:rounded-full [&_button]:border-white/20 [&_button]:bg-black/20 [&_button]:text-slate-200 [&_button]:backdrop-blur-md [&_button:hover]:bg-white/10"><MovieLibraryActions movie={libraryMovie} compact /></div>
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-4 max-w-[1500px] space-y-8 px-4 sm:px-6 lg:px-8">
        {showPlayer && currentEpisode && currentHlsEpisode && (
          <section className={cn('overflow-hidden rounded-3xl border border-white/10 bg-black shadow-[0_30px_90px_rgba(0,0,0,.55)]', (lightsOff || theaterMode) && 'relative z-[70]', theaterMode && 'left-1/2 w-screen -translate-x-1/2 rounded-none border-x-0 sm:w-[min(100vw,1800px)] sm:rounded-3xl sm:border-x')}>
            <div ref={playerContainerRef} className={cn('relative w-full bg-black', (pseudoFullscreen || playerFullscreen) && 'watch-party-pseudo-fullscreen h-[100dvh]')}>
              <SyncedHlsPlayer episode={currentHlsEpisode} previousEpisode={previousHlsEpisode} nextEpisode={nextHlsEpisode} playback={soloPlayback} isHost isConnected clockOffset={0} reactions={[]} roomStatus="active" standalone allowIframeFallback autoNextEnabled={autoNext} isFullscreen={playerFullscreen} fillContainer={playerFullscreen || pseudoFullscreen} onToggleFullscreen={() => void toggleFullscreen()} onToggleAutoNext={() => setAutoNext((value) => !value)} onPreviousEpisode={previousHlsEpisode ? () => selectEpisode(selectedServer, previousHlsEpisode.episodeIndex, true) : undefined} onNextEpisode={nextHlsEpisode ? () => selectEpisode(selectedServer, nextHlsEpisode.episodeIndex, true) : undefined} onPlaybackUpdate={(payload) => setSoloPlayback((current) => ({ ...current, ...payload, revision: current.revision + 1, serverUpdatedAt: Date.now(), updatedBy: 'solo' }))} onProgress={(time, duration, reason) => { if (!Number.isFinite(duration) || duration <= 0) return; const now = Date.now(); if (reason === 'timeupdate' && now - lastSavedAtRef.current < 10_000) return; lastSavedAtRef.current = now; void saveProgress({ movieSlug: movie.slug, movieTitle: movie.name, poster: getImageUrl(movie.poster_url), episodeId: currentHlsEpisode.id, episodeName: currentHlsEpisode.name, serverName: currentHlsEpisode.serverName, currentTime: time, duration, percentage: Math.min(100, time / duration * 100), completed: time / duration >= 0.9 || duration - time < 120, source: 'solo', updatedAt: now, episodeKey: currentHlsEpisode.episodeKey, sourceId: currentHlsEpisode.sourceId }) }} />
            </div>
            <div className="flex flex-col gap-3 border-t border-white/10 bg-[#0e1019] p-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-bold text-white">Đang xem: {currentEpisode.name}</p><p className="mt-1 text-xs text-slate-500">{episodes[selectedServer]?.server_name}</p></div><div className="flex flex-wrap items-center gap-2"><Button type="button" size="sm" variant="outline" aria-pressed={lightsOff} onClick={() => setLightsOff((value) => !value)} className="border-white/15 bg-white/[0.035] text-slate-200 hover:bg-white/10">{lightsOff ? <Lightbulb className="h-4 w-4" /> : <LightbulbOff className="h-4 w-4" />}{lightsOff ? 'Bật đèn' : 'Tắt đèn'}</Button><Button type="button" size="sm" variant="outline" aria-pressed={theaterMode} onClick={() => setTheaterMode((value) => !value)} className="border-white/15 bg-white/[0.035] text-slate-200 hover:bg-white/10"><RectangleHorizontal className="h-4 w-4" />{theaterMode ? 'Thu gọn' : 'Chiếu rạp'}</Button><MovieLibraryActions movie={libraryMovie} /></div></div>
          </section>
        )}

        <section className="overflow-hidden rounded-3xl border border-white/[0.09] bg-gradient-to-b from-[#10131f] to-[#0b0e18] shadow-[0_24px_70px_rgba(0,0,0,.22)]">
          <div className="flex gap-2 overflow-x-auto border-b border-white/[0.08] bg-black/10 p-2.5" role="tablist" aria-label="Thông tin phim">
            <TabButton active={tab === 'episodes'} onClick={() => setTab('episodes')} icon={ListVideo} badge={episodeCount}>Tập phim</TabButton>
            <TabButton active={tab === 'info'} onClick={() => setTab('info')} icon={Info}>Thông tin</TabButton>
            <TabButton active={tab === 'reviews'} onClick={() => setTab('reviews')} icon={MessageSquareText}>Đánh giá</TabButton>
          </div>

          {tab === 'episodes' && (
            <div className="p-5 sm:p-7">
              <div className="flex flex-col gap-4 border-b border-white/[0.07] pb-6 sm:flex-row sm:items-center sm:justify-between">
                <div><h2 className="text-lg font-black text-white">Chọn máy chủ</h2><p className="mt-1 text-sm text-slate-500">Chọn nguồn phát phù hợp, sau đó bấm vào tập muốn xem.</p></div>
                <div className="flex flex-wrap gap-2">{episodes.map((server, index) => <button key={`${server.server_name}-${index}`} type="button" onClick={() => { setSelectedServer(index); setSelectedEpisode(0) }} className={`min-h-10 rounded-xl border px-4 text-sm font-bold transition-colors ${selectedServer === index ? 'border-fuchsia-400/60 bg-gradient-to-r from-fuchsia-600/25 to-purple-600/20 text-fuchsia-100 shadow-[0_0_0_3px_rgba(217,70,239,.06)]' : 'border-white/10 bg-black/15 text-slate-400 hover:border-white/20 hover:text-white'}`}>{server.server_name}<span className="ml-2 text-[10px] opacity-60">{server.server_data.length} tập</span></button>)}</div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">{episodes[selectedServer]?.server_data.map((episode, index) => <button key={`${episode.slug}-${index}`} type="button" onClick={() => selectEpisode(selectedServer, index, showPlayer)} className={`group flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition-[color,background-color,border-color] ${selectedEpisode === index ? 'border-fuchsia-400/60 bg-gradient-to-br from-fuchsia-600/25 to-purple-600/20 text-white' : 'border-white/[0.09] bg-black/20 text-slate-300 hover:border-fuchsia-400/30 hover:bg-fuchsia-500/[0.07] hover:text-white'}`}><PlayCircle className={`h-4 w-4 ${selectedEpisode === index ? 'text-fuchsia-300' : 'text-slate-600 group-hover:text-fuchsia-300'}`} />{episode.name}</button>)}</div>
            </div>
          )}

          {tab === 'info' && <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]"><article className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6"><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-300"><Clapperboard className="h-4 w-4" /></span><h2 className="text-xl font-black text-white">Nội dung phim</h2></div><p className="mt-5 leading-7 text-slate-300">{content}</p>{movie.actor?.length ? <div className="mt-7 border-t border-white/[0.07] pt-5"><h3 className="font-bold text-white">Diễn viên</h3><p className="mt-2 text-sm leading-6 text-slate-400">{movie.actor.join(', ')}</p></div> : null}</article><dl className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 text-sm">{[['Trạng thái', movie.episode_current], ['Định dạng', movie.quality], ['Năm', String(movie.year)], ['Thời lượng', movie.time], ['Đạo diễn', movie.director?.join(', ') || 'Đang cập nhật'], ['Quốc gia', movie.country?.map((item) => item.name).join(', ')], ['Thể loại', movie.category?.map((item) => item.name).join(', ')]].map(([label, value]) => <div key={label} className="grid grid-cols-[100px_1fr] gap-4 border-b border-white/[0.06] py-3.5 first:pt-0 last:border-0 last:pb-0"><dt className="text-slate-500">{label}</dt><dd className="font-medium text-slate-200">{value}</dd></div>)}</dl></div>}

          {tab === 'reviews' && <div className="p-4 sm:p-7"><MovieSocialPanel movie={libraryMovie} /></div>}
        </section>

        <div className="grid gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.018] p-4 text-xs text-slate-500 sm:grid-cols-3"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Lưu tiến độ xem tự động</span><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Tự chuyển tập có thể bật/tắt</span><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Hỗ trợ xem chung cùng bạn bè</span></div>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children, icon: Icon, badge }: { active: boolean; onClick: () => void; children: React.ReactNode; icon: typeof Info; badge?: number }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`flex min-h-12 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors ${active ? 'bg-gradient-to-r from-fuchsia-600/25 to-purple-600/20 text-fuchsia-100 shadow-[inset_0_0_0_1px_rgba(232,121,249,.2)]' : 'text-slate-500 hover:bg-white/[0.04] hover:text-white'}`}><Icon className="h-4 w-4" />{children}{badge !== undefined && <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? 'bg-fuchsia-400/15 text-fuchsia-200' : 'bg-white/[0.05] text-slate-600'}`}>{badge}</span>}</button>
}

function decodeMovieContent(value: string) {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
}
