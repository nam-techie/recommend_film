'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { MovieImage } from '@/components/ui/MovieImage'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CalendarDays, CheckCircle2, Clapperboard, Clock3, Film, Info, Lightbulb, LightbulbOff, ListVideo, Loader2, LockKeyhole, MessageSquareText, Play, PlayCircle, RectangleHorizontal, Sparkles, Star, Users } from 'lucide-react'
import { buildWatchPartyEpisodes } from '@/hooks/useWatchParty'
import { useWatchProgress } from '@/hooks/useWatchProgress'
import { usePlaybackAnalytics } from '@/hooks/usePlaybackAnalytics'
import { Button } from '@/components/ui/button'
import { CreateWatchPartyDialog } from '@/components/ui/CreateWatchPartyDialog'
import { MovieLibraryActions } from '@/components/account/MovieLibraryActions'
import { MovieSocialPanel } from '@/components/account/MovieSocialPanel'
import { cn } from '@/lib/utils'
import { getImageUrl, type MovieDetail } from '@/lib/api'
import type { WatchPartyPlayback } from '@/lib/watch-party-types'
import { useAuth } from '@/components/auth/AuthProvider'
import { AffiliateInterstitial } from '@/components/ui/AffiliateInterstitial'
import type { AffiliateCreative } from '@/lib/affiliate'
import type { AccountPlan, DailyUsage, WatchAccessResponse } from '@/lib/monetization'

const SyncedHlsPlayer = dynamic(
  () => import('@/components/ui/SyncedHlsPlayer').then((module) => module.SyncedHlsPlayer),
  { ssr: false, loading: () => <div className="aspect-video w-full animate-pulse bg-slate-950" /> },
)

type DetailTab = 'episodes' | 'info' | 'reviews'
type WatchAccessResult = { allowed: boolean; affiliate: AffiliateCreative | null; plan?: AccountPlan; usage?: DailyUsage | null }

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
  const analyticsDurationRef = useRef(0)
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [watchAccessState, setWatchAccessState] = useState<'idle' | 'checking' | 'allowed' | 'denied'>('idle')
  const [watchAccessError, setWatchAccessError] = useState<string | null>(null)
  const [affiliateGate, setAffiliateGate] = useState<AffiliateCreative | null>(null)
  const [watchUsage, setWatchUsage] = useState<DailyUsage | null>(null)
  const [resolvedPlan, setResolvedPlan] = useState<AccountPlan | null>(null)
  const deepLinkRequestRef = useRef<{ target: string; requestId: string } | null>(null)
  const latestOpenRequestRef = useRef<string | null>(null)
  const activeViewSessionRef = useRef<{ episodeKey: string; requestId: string; gateCompleted: boolean } | null>(null)
  const { saveProgress } = useWatchProgress()
  const { movie, episodes } = initialDetail
  const watchPartyEpisodes = useMemo(() => buildWatchPartyEpisodes(episodes || []), [episodes])
  const currentEpisode = episodes?.[selectedServer]?.server_data?.[selectedEpisode]
  const currentHlsEpisode = useMemo(() => watchPartyEpisodes.find((episode) => episode.serverIndex === selectedServer && episode.episodeIndex === selectedEpisode), [selectedEpisode, selectedServer, watchPartyEpisodes])
  const previousHlsEpisode = useMemo(() => watchPartyEpisodes.find((episode) => episode.serverIndex === selectedServer && episode.episodeIndex === selectedEpisode - 1 && episode.linkM3u8), [selectedEpisode, selectedServer, watchPartyEpisodes])
  const nextHlsEpisode = useMemo(() => watchPartyEpisodes.find((episode) => episode.serverIndex === selectedServer && episode.episodeIndex === selectedEpisode + 1 && episode.linkM3u8), [selectedEpisode, selectedServer, watchPartyEpisodes])
  const [soloPlayback, setSoloPlayback] = useState<WatchPartyPlayback>({ episodeId: '', currentTime: 0, isPlaying: false, revision: 0, serverUpdatedAt: Date.now(), updatedBy: 'solo', action: 'pause' })
  const analyticsMetadata = useMemo(() => ({
    movieSlug: movie.slug,
    movieTitle: movie.name,
    episodeKey: currentHlsEpisode?.episodeKey || currentHlsEpisode?.id || `${selectedServer}:${selectedEpisode}`,
    episodeName: currentHlsEpisode?.name,
    genres: movie.category?.map((item) => item.name) || [],
    source: 'solo' as const,
  }), [currentHlsEpisode, movie.category, movie.name, movie.slug, selectedEpisode, selectedServer])
  const { signal: trackPlayback, finalize: finalizePlayback } = usePlaybackAnalytics(analyticsMetadata)

  const requestWatchAccess = useCallback(async (serverIndex: number, episodeIndex: number, requestId = crypto.randomUUID()): Promise<WatchAccessResult> => {
    if (authLoading) return { allowed: false, affiliate: null }
    if (!user) {
      setWatchAccessState('denied')
      setWatchAccessError('Bạn cần đăng nhập để hệ thống áp dụng quyền và giới hạn gói CinePass.')
      return { allowed: false, affiliate: null }
    }
    const target = watchPartyEpisodes.find((episode) => episode.serverIndex === serverIndex && episode.episodeIndex === episodeIndex)
    if (!target) { setWatchAccessError('Không xác định được tập phim.'); return { allowed: false, affiliate: null } }
    latestOpenRequestRef.current = requestId
    setWatchAccessState('checking'); setWatchAccessError(null)
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/me/watch-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ movieSlug: movie.slug, episodeKey: target.slug || target.id, requestId, context: 'solo' }),
      })
      const payload = await response.json().catch(() => ({})) as Partial<WatchAccessResponse> & { error?: string; usage?: DailyUsage }
      if (!response.ok) {
        if (latestOpenRequestRef.current === requestId && payload.usage) setWatchUsage(payload.usage)
        throw new Error(payload.error || 'Tài khoản hiện không thể mở tập phim này.')
      }
      if (latestOpenRequestRef.current !== requestId) return { allowed: false, affiliate: null }
      setWatchAccessState('allowed')
      setResolvedPlan(payload.plan || null)
      setWatchUsage(payload.usage || null)
      return { allowed: true, affiliate: payload.viewSession?.affiliate || null, plan: payload.plan, usage: payload.usage || null }
    } catch (error) {
      if (latestOpenRequestRef.current !== requestId) return { allowed: false, affiliate: null }
      setWatchAccessState('denied')
      setWatchAccessError(error instanceof Error ? error.message : 'Không thể kiểm tra quyền xem phim.')
      return { allowed: false, affiliate: null }
    }
  }, [authLoading, movie.slug, user, watchPartyEpisodes])

  useEffect(() => {
    if (!currentHlsEpisode) return
    void finalizePlayback()
    analyticsDurationRef.current = 0
    setSoloPlayback((current) => ({ ...current, episodeId: currentHlsEpisode.id, currentTime: 0, isPlaying: false, revision: current.revision + 1, serverUpdatedAt: Date.now(), action: 'episode_change' }))
  }, [currentHlsEpisode, finalizePlayback])

  useEffect(() => {
    if (searchParams.get('watch') !== '1' || !episodes?.length || authLoading) return
    const requested = searchParams.get('episode')
    let targetServer = 0
    let targetEpisode = 0
    if (requested) {
      for (let serverIndex = 0; serverIndex < episodes.length; serverIndex += 1) {
        const episodeIndex = episodes[serverIndex].server_data.findIndex((episode) => episode.slug === requested)
        if (episodeIndex >= 0) { targetServer = serverIndex; targetEpisode = episodeIndex; break }
      }
    }
    setSelectedServer(targetServer); setSelectedEpisode(targetEpisode)
    const deepLinkTarget = `${movie.slug}:${targetServer}:${targetEpisode}`
    if (deepLinkRequestRef.current?.target !== deepLinkTarget) deepLinkRequestRef.current = { target: deepLinkTarget, requestId: crypto.randomUUID() }
    void requestWatchAccess(targetServer, targetEpisode, deepLinkRequestRef.current.requestId).then((result) => {
      if (!result.allowed) return
      const episodeKey = watchPartyEpisodes.find((episode) => episode.serverIndex === targetServer && episode.episodeIndex === targetEpisode)?.slug
        || watchPartyEpisodes.find((episode) => episode.serverIndex === targetServer && episode.episodeIndex === targetEpisode)?.id
        || `${targetServer}:${targetEpisode}`
      activeViewSessionRef.current = { episodeKey, requestId: deepLinkRequestRef.current!.requestId, gateCompleted: !result.affiliate }
      setAffiliateGate(result.affiliate)
      setShowPlayer(!result.affiliate)
    })
  }, [authLoading, episodes, requestWatchAccess, searchParams])

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

  useEffect(() => {
    const immersive = playerFullscreen || pseudoFullscreen
    document.documentElement.dataset.cinemindImmersive = immersive ? 'true' : 'false'
    window.dispatchEvent(new CustomEvent('cinemind:immersive-change', { detail: immersive }))
    return () => {
      delete document.documentElement.dataset.cinemindImmersive
      window.dispatchEvent(new CustomEvent('cinemind:immersive-change', { detail: false }))
    }
  }, [playerFullscreen, pseudoFullscreen])

  const toggleFullscreen = async () => {
    const container = playerContainerRef.current
    if (!container) return
    if (pseudoFullscreen) { setPseudoFullscreen(false); setPlayerFullscreen(false); return }
    if (document.fullscreenElement === container) { await document.exitFullscreen(); return }
    try { await container.requestFullscreen() } catch { setPseudoFullscreen(true); setPlayerFullscreen(true) }
  }

  const selectEpisode = async (serverIndex: number, episodeIndex: number, play = false) => {
    const target = watchPartyEpisodes.find((episode) => episode.serverIndex === serverIndex && episode.episodeIndex === episodeIndex)
    const episodeKey = target?.slug || target?.id || `${serverIndex}:${episodeIndex}`
    const existingSession = activeViewSessionRef.current?.episodeKey === episodeKey ? activeViewSessionRef.current : null
    const requestId = existingSession?.requestId || crypto.randomUUID()
    setSelectedServer(serverIndex)
    setSelectedEpisode(episodeIndex)
    if (play || showPlayer) {
      setShowPlayer(false)
      setAffiliateGate(null)
      const result = await requestWatchAccess(serverIndex, episodeIndex, requestId)
      if (result.allowed) {
        const affiliate = existingSession?.gateCompleted ? null : result.affiliate
        activeViewSessionRef.current = { episodeKey, requestId, gateCompleted: existingSession?.gateCompleted || !affiliate }
        setAffiliateGate(affiliate)
        setShowPlayer(!affiliate)
      }
    }
  }

  const rating = movie.tmdb?.vote_average || 0
  const content = decodeMovieContent(movie.content || 'Chưa có mô tả chi tiết cho phim này.')
  const videoUrl = currentEpisode?.link_m3u8 || currentEpisode?.link_embed
  const episodeCount = episodes?.reduce((sum, server) => sum + server.server_data.length, 0) || 0
  const libraryMovie = { slug: movie.slug, title: movie.name, poster: getImageUrl(movie.poster_url), year: movie.year }

  return (
    <div className="min-w-0 max-w-full overflow-x-clip bg-[#070912] pb-14">
      {lightsOff && <button type="button" aria-label="Bật đèn trở lại" onClick={() => setLightsOff(false)} className="fixed inset-0 z-[60] cursor-default bg-black/90" />}
      <section className="relative min-h-[690px] overflow-hidden bg-[#080911] lg:min-h-[760px]">
        <MovieImage src={getImageUrl(movie.thumb_url || movie.poster_url)} alt="" fill priority quality={72} sizes="100vw" className="object-cover object-top" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_35%,transparent_0%,rgba(8,9,17,.24)_34%,rgba(8,9,17,.94)_88%)]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080911] via-[#080911]/76 to-[#080911]/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070912] via-transparent to-black/20" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#070912] to-transparent" />

        <div className="relative mx-auto flex min-h-[690px] max-w-shell items-end gap-8 px-4 pb-16 pt-28 sm:px-6 lg:min-h-[760px] lg:items-center lg:px-8 lg:pb-20 xl:gap-11">
          <div className="relative hidden aspect-[2/3] w-52 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-slate-950 shadow-[0_30px_80px_rgba(0,0,0,.55)] md:block xl:w-60">
            <MovieImage src={getImageUrl(movie.poster_url)} alt={movie.name} fallbackLabel={movie.name} fill sizes="240px" className="object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/90 to-transparent" />
            {rating > 0 && <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-rating px-3 py-1.5 text-xs font-black text-black shadow-lg"><Star className="h-3.5 w-3.5 fill-current" /> {rating.toFixed(1)}</span>}
          </div>

          <div className="min-w-0 w-full max-w-4xl">
            <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-accent-soft"><Sparkles className="h-4 w-4" /> CineMind Spotlight</div>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-black text-fg">
              <span className="rounded-lg bg-gradient-to-br from-accent to-accent-strong px-2.5 py-1.5 shadow-lg shadow-accent">{movie.quality || 'HD'}</span>
              {movie.lang && <span className="rounded-lg border border-white/20 bg-black/30 px-2.5 py-1.5 backdrop-blur-md">{movie.lang}</span>}
              {movie.episode_current && <span className="rounded-lg border border-white/20 bg-black/30 px-2.5 py-1.5 backdrop-blur-md">{movie.episode_current}</span>}
              {rating > 0 && <span className="inline-flex items-center gap-1 rounded-lg bg-rating px-2.5 py-1.5 text-black md:hidden"><Star className="h-3.5 w-3.5 fill-current" />{rating.toFixed(1)}</span>}
            </div>

            <h1 className="max-w-4xl text-4xl font-black leading-[.98] tracking-[-0.04em] text-fg drop-shadow-2xl sm:text-6xl lg:text-7xl">{movie.name}</h1>
            {movie.origin_name && <p className="mt-3 text-lg font-medium text-fg-secondary sm:text-2xl">{movie.origin_name}</p>}

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-fg-secondary">
              {movie.year && <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-accent-soft" />{movie.year}</span>}
              {movie.time && <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-accent-soft" />{movie.time}</span>}
              {movie.type && <span className="inline-flex items-center gap-1.5"><Clapperboard className="h-4 w-4 text-accent-soft" />{movie.type === 'single' ? 'Phim lẻ' : movie.type === 'series' ? 'Phim bộ' : 'Hoạt hình'}</span>}
            </div>

            <p className="mt-5 line-clamp-3 max-w-3xl text-sm leading-7 text-fg-secondary sm:text-base">{content}</p>
            <div className="mt-4 flex flex-wrap gap-2">{movie.category?.slice(0, 5).map((item) => <Link key={item.slug} href={`/genre/${item.slug}`} className="rounded-full border border-white/12 bg-white/[0.055] px-3 py-1.5 text-xs font-semibold text-fg-secondary backdrop-blur-md hover:border-accent/40 hover:text-accent-soft">{item.name}</Link>)}</div>

            <div className="mt-7 grid grid-cols-2 items-center gap-3 sm:flex sm:flex-wrap">
              {episodes?.length > 0 && <Button size="lg" onClick={() => selectEpisode(selectedServer, selectedEpisode, true)} className="h-12 w-full rounded-full bg-gradient-to-r from-accent to-accent-strong px-5 font-bold text-fg shadow-xl shadow-accent hover:brightness-110 sm:w-auto sm:px-7"><Play className="h-5 w-5 fill-current" /> Xem ngay</Button>}
              {episodes?.length > 0 && <CreateWatchPartyDialog movieSlug={movie.slug} movieTitle={movie.name} movieOriginalTitle={movie.origin_name} moviePoster={movie.poster_url ? getImageUrl(movie.poster_url) : undefined} movieYear={movie.year >= 1888 ? movie.year : undefined} movieDuration={movie.time} movieType={movie.type} movieGenres={movie.category?.slice(0, 5).map((item) => item.name)} movieQuality={movie.quality} movieLanguage={movie.lang} movieRating={rating} movieVideoUrl={videoUrl} episodes={watchPartyEpisodes} initialEpisodeId={currentHlsEpisode?.id}><Button size="lg" variant="outline" className="h-12 w-full rounded-full border-white/25 bg-black/25 px-4 text-fg backdrop-blur-md hover:bg-white/10 sm:w-auto sm:px-6"><Users className="h-5 w-5" /> Xem chung</Button></CreateWatchPartyDialog>}
              {movie.trailer_url && <Button asChild size="lg" variant="outline" className="h-12 w-full rounded-full border-white/25 bg-black/25 px-5 text-fg backdrop-blur-md hover:bg-white/10 sm:w-auto sm:px-6"><a href={movie.trailer_url} target="_blank" rel="noopener noreferrer"><Film className="h-5 w-5" /> Trailer</a></Button>}
            </div>
            <div className="mt-4 [&_button]:rounded-full [&_button]:border-white/20 [&_button]:bg-black/20 [&_button]:text-fg-secondary [&_button]:backdrop-blur-md [&_button:hover]:bg-white/10"><MovieLibraryActions movie={libraryMovie} compact /></div>
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-4 max-w-shell space-y-8 px-4 sm:px-6 lg:px-8">
        {watchAccessState === 'checking' && <div className="flex items-center justify-center gap-2 rounded-2xl border border-accent/20 bg-accent/[0.07] p-4 text-sm text-accent-soft"><Loader2 className="h-4 w-4 animate-spin" />Đang kiểm tra quyền xem của tài khoản…</div>}
        {watchAccessState === 'denied' && watchAccessError && <section className="flex flex-col gap-4 rounded-2xl border border-warn/25 bg-warn/10 p-5 sm:flex-row sm:items-center"><LockKeyhole className="h-6 w-6 shrink-0 text-warn" /><div className="min-w-0 flex-1"><h2 className="font-semibold text-fg">Tập phim đang bị khóa</h2><p className="mt-1 text-sm text-fg-secondary">{watchAccessError}</p>{watchUsage && <p className="mt-2 text-xs font-medium text-warn">Đã dùng {watchUsage.moviesUsed}/{watchUsage.moviesLimit} phim hôm nay · {watchUsage.episodesUsed}/{watchUsage.episodesLimit} tập trong phim này · đặt lại lúc {new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }).format(watchUsage.resetsAt)}</p>}</div><div className="flex gap-2">{!user && <Button asChild variant="outline"><Link href={`/login?returnUrl=${encodeURIComponent(`/movie/${movie.slug}?watch=1`)}`}>Đăng nhập</Link></Button>}<Button asChild><Link href="/pricing">Xem gói nâng cấp</Link></Button></div></section>}
        {watchAccessState === 'allowed' && resolvedPlan && <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-xs text-fg-secondary"><span>{resolvedPlan === 'normal' && watchUsage ? `${watchUsage.moviesUsed}/${watchUsage.moviesLimit} phim hôm nay · ${watchUsage.episodesUsed}/${watchUsage.episodesLimit} tập trong phim này` : 'Gói hiện tại được xem không giới hạn'}</span>{resolvedPlan === 'normal' && <Link href="/pricing" className="font-semibold text-accent-soft hover:underline">Nâng cấp để xem không giới hạn</Link>}</div>}
        {affiliateGate && currentEpisode && <section className="overflow-hidden rounded-3xl border border-white/10 bg-black shadow-[0_30px_90px_rgba(0,0,0,.55)]"><AffiliateInterstitial creative={affiliateGate} onContinue={() => { if (activeViewSessionRef.current) activeViewSessionRef.current.gateCompleted = true; setAffiliateGate(null); setShowPlayer(true) }} /><div className="border-t border-white/10 bg-[#0e1019] p-4"><p className="font-bold text-fg">Sắp xem: {currentEpisode.name}</p><p className="mt-1 text-xs text-fg-muted">Player chưa được tải cho tới khi bạn bấm Tiếp tục xem.</p></div></section>}
        {showPlayer && currentEpisode && currentHlsEpisode && (
          <section className={cn('overflow-hidden rounded-3xl border border-white/10 bg-black shadow-[0_30px_90px_rgba(0,0,0,.55)]', (lightsOff || theaterMode) && 'relative z-[70]', theaterMode && 'left-1/2 w-screen -translate-x-1/2 rounded-none border-x-0 sm:w-[min(100vw,1800px)] sm:rounded-3xl sm:border-x')}>
            <div ref={playerContainerRef} className={cn('relative w-full bg-black', (pseudoFullscreen || playerFullscreen) && 'watch-party-pseudo-fullscreen h-[100dvh]')}>
              <SyncedHlsPlayer poster={getImageUrl(movie.thumb_url || movie.poster_url)} onRequestServerChange={() => { if (!episodes?.length) return; const next = (selectedServer + 1) % episodes.length; void selectEpisode(next, 0, true) }} episode={currentHlsEpisode} previousEpisode={previousHlsEpisode} nextEpisode={nextHlsEpisode} playback={soloPlayback} isHost isConnected clockOffset={0} reactions={[]} roomStatus="active" standalone allowIframeFallback autoNextEnabled={autoNext} isFullscreen={playerFullscreen} fillContainer={playerFullscreen || pseudoFullscreen} onToggleFullscreen={() => void toggleFullscreen()} onToggleAutoNext={() => setAutoNext((value) => !value)} onPreviousEpisode={previousHlsEpisode ? () => selectEpisode(selectedServer, previousHlsEpisode.episodeIndex, true) : undefined} onNextEpisode={nextHlsEpisode ? () => selectEpisode(selectedServer, nextHlsEpisode.episodeIndex, true) : undefined} onPlaybackUpdate={(payload) => { setSoloPlayback((current) => ({ ...current, ...payload, revision: current.revision + 1, serverUpdatedAt: Date.now(), updatedBy: 'solo' })); void trackPlayback({ action: payload.action === 'seek' ? 'seek' : payload.action === 'heartbeat' ? 'heartbeat' : payload.action, position: payload.currentTime, duration: analyticsDurationRef.current, isPlaying: payload.isPlaying }) }} onProgress={(time, duration, reason) => { if (!Number.isFinite(duration) || duration <= 0) return; analyticsDurationRef.current = duration; const now = Date.now(); if (reason === 'timeupdate' && now - lastSavedAtRef.current < 10_000) return; lastSavedAtRef.current = now; void saveProgress({ movieSlug: movie.slug, movieTitle: movie.name, poster: getImageUrl(movie.poster_url), episodeId: currentHlsEpisode.id, episodeName: currentHlsEpisode.name, serverName: currentHlsEpisode.serverName, currentTime: time, duration, percentage: Math.min(100, time / duration * 100), completed: time / duration >= 0.9 || duration - time < 120, source: 'solo', updatedAt: now, episodeKey: currentHlsEpisode.episodeKey, sourceId: currentHlsEpisode.sourceId }) }} />
            </div>
            <div className="flex flex-col gap-3 border-t border-white/10 bg-[#0e1019] p-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-bold text-fg">Đang xem: {currentEpisode.name}</p><p className="mt-1 text-xs text-fg-muted">{episodes[selectedServer]?.server_name}</p></div><div className="flex flex-wrap items-center gap-2"><Button type="button" size="sm" variant="outline" aria-pressed={lightsOff} onClick={() => setLightsOff((value) => !value)} className="border-white/15 bg-white/[0.035] text-fg-secondary hover:bg-white/10">{lightsOff ? <Lightbulb className="h-4 w-4" /> : <LightbulbOff className="h-4 w-4" />}{lightsOff ? 'Bật đèn' : 'Tắt đèn'}</Button><Button type="button" size="sm" variant="outline" aria-pressed={theaterMode} onClick={() => setTheaterMode((value) => !value)} className="border-white/15 bg-white/[0.035] text-fg-secondary hover:bg-white/10"><RectangleHorizontal className="h-4 w-4" />{theaterMode ? 'Thu gọn' : 'Chiếu rạp'}</Button><MovieLibraryActions movie={libraryMovie} /></div></div>
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
                <div><h2 className="text-lg font-black text-fg">Chọn máy chủ</h2><p className="mt-1 text-sm text-fg-muted">Chọn nguồn phát phù hợp, sau đó bấm vào tập muốn xem.</p></div>
                <div className="flex flex-wrap gap-2">{episodes.map((server, index) => <button key={`${server.server_name}-${index}`} type="button" onClick={() => { if (showPlayer || affiliateGate) void selectEpisode(index, 0, true); else { setSelectedServer(index); setSelectedEpisode(0) } }} className={`min-h-10 rounded-xl border px-4 text-sm font-bold transition-colors ${selectedServer === index ? 'border-accent/60 bg-gradient-to-r from-accent/25 to-accent-strong/20 text-accent-soft shadow-[0_0_0_3px_rgba(217,70,239,.06)]' : 'border-white/10 bg-black/15 text-fg-secondary hover:border-white/20 hover:text-fg'}`}>{server.server_name}<span className="ml-2 text-xs opacity-60">{server.server_data.length} tập</span></button>)}</div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">{episodes[selectedServer]?.server_data.map((episode, index) => <button key={`${episode.slug}-${index}`} type="button" onClick={() => selectEpisode(selectedServer, index, showPlayer || Boolean(affiliateGate))} className={`group flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition-[color,background-color,border-color] ${selectedEpisode === index ? 'border-accent/60 bg-gradient-to-br from-accent/25 to-accent-strong/20 text-fg' : 'border-white/[0.09] bg-black/20 text-fg-secondary hover:border-accent/30 hover:bg-accent/[0.07] hover:text-fg'}`}><PlayCircle className={`h-4 w-4 ${selectedEpisode === index ? 'text-accent-soft' : 'text-fg-muted group-hover:text-accent-soft'}`} />{episode.name}</button>)}</div>
            </div>
          )}

          {tab === 'info' && <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]"><article className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6"><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent-soft"><Clapperboard className="h-4 w-4" /></span><h2 className="text-xl font-black text-fg">Nội dung phim</h2></div><p className="mt-5 leading-7 text-fg-secondary">{content}</p>{movie.actor?.length ? <div className="mt-7 border-t border-white/[0.07] pt-5"><h3 className="font-bold text-fg">Diễn viên</h3><p className="mt-2 text-sm leading-6 text-fg-secondary">{movie.actor.join(', ')}</p></div> : null}</article><dl className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 text-sm">{[['Trạng thái', movie.episode_current], ['Định dạng', movie.quality], ['Năm', String(movie.year)], ['Thời lượng', movie.time], ['Đạo diễn', movie.director?.join(', ') || 'Đang cập nhật'], ['Quốc gia', movie.country?.map((item) => item.name).join(', ')], ['Thể loại', movie.category?.map((item) => item.name).join(', ')]].map(([label, value]) => <div key={label} className="grid grid-cols-[100px_1fr] gap-4 border-b border-white/[0.06] py-3.5 first:pt-0 last:border-0 last:pb-0"><dt className="text-fg-muted">{label}</dt><dd className="font-medium text-fg-secondary">{value}</dd></div>)}</dl></div>}

          {tab === 'reviews' && <div className="p-4 sm:p-7"><MovieSocialPanel movie={libraryMovie} /></div>}
        </section>

        <div className="grid gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.018] p-4 text-xs text-fg-muted sm:grid-cols-3"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-ok" /> Lưu tiến độ xem tự động</span><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-ok" /> Tự chuyển tập có thể bật/tắt</span><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-ok" /> Hỗ trợ xem chung cùng bạn bè</span></div>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children, icon: Icon, badge }: { active: boolean; onClick: () => void; children: React.ReactNode; icon: typeof Info; badge?: number }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`flex min-h-12 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors ${active ? 'bg-gradient-to-r from-accent/25 to-accent-strong/20 text-accent-soft shadow-[inset_0_0_0_1px_rgba(232,121,249,.2)]' : 'text-fg-muted hover:bg-white/[0.04] hover:text-fg'}`}><Icon className="h-4 w-4" />{children}{badge !== undefined && <span className={`rounded-full px-2 py-0.5 text-xs ${active ? 'bg-accent/15 text-accent-soft' : 'bg-white/[0.05] text-fg-muted'}`}>{badge}</span>}</button>
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
