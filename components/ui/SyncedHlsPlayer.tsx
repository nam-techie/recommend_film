'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Hls from 'hls.js'
import { AlertTriangle, FastForward, Maximize, Pause, Play, RefreshCw, Rewind, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WATCH_PARTY_DRIFT_HARD_SECONDS, WATCH_PARTY_DRIFT_SOFT_SECONDS, WatchPartyEpisode, WatchPartyPlayback, WatchPartyReaction, WatchPartyRoomStatus } from '@/lib/watch-party-types'
import { playableHlsUrl } from '@/lib/media-url'

type PlayerState = 'idle' | 'loading_manifest' | 'loading_media' | 'ready' | 'playing' | 'buffering' | 'autoplay_blocked' | 'fallback_embed' | 'fatal_error'
type ProgressReason = 'timeupdate' | 'pause' | 'seek'

interface Props {
  episode?: WatchPartyEpisode
  playback: WatchPartyPlayback
  isHost: boolean
  isConnected: boolean
  clockOffset: number
  reactions: WatchPartyReaction[]
  roomStatus: WatchPartyRoomStatus
  onPlaybackUpdate: (payload: { episodeId: string; currentTime: number; isPlaying: boolean; action: 'play' | 'pause' | 'seek' | 'heartbeat' }) => void
  onProgress?: (currentTime: number, duration: number, reason: ProgressReason) => void
  allowIframeFallback?: boolean
  initialTime?: number
  standalone?: boolean
}

const formatTime = (seconds = 0) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`

export function SyncedHlsPlayer({ episode, playback, isHost, isConnected, clockOffset, reactions, roomStatus, onPlaybackUpdate, onProgress, allowIframeFallback = false, initialTime = 0, standalone = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const applyingRemoteRef = useRef(false)
  const lastAppliedRevisionRef = useRef(-1)
  const lastHardSeekAtRef = useRef(0)
  const suppressSeekEventRef = useRef(false)
  const scrubbingRef = useRef(false)
  const latestPlaybackRef = useRef(playback)
  const retryTimersRef = useRef<number[]>([])
  const [playerState, setPlayerState] = useState<PlayerState>('idle')
  const [sourceError, setSourceError] = useState<string | null>(null)
  const [sourceVersion, setSourceVersion] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.85)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [scrubTime, setScrubTime] = useState(0)

  const playerStateRef = useRef(playerState)
  useEffect(() => { playerStateRef.current = playerState }, [playerState])

  useEffect(() => { latestPlaybackRef.current = playback }, [playback])

  const targetTime = useMemo(() => {
    const elapsed = playback.isPlaying ? Math.max(0, Date.now() + clockOffset - playback.serverUpdatedAt) / 1000 : 0
    return Math.max(0, playback.currentTime + elapsed)
  }, [clockOffset, playback])

  const destroySource = useCallback(() => {
    retryTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    retryTimersRef.current = []
    const hls = hlsRef.current
    hlsRef.current = null
    if (hls) hls.destroy()
    const video = videoRef.current
    if (video) {
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [])

  const useFallbackOrFail = useCallback((message: string) => {
    const hls = hlsRef.current
    hlsRef.current = null
    if (hls) hls.destroy()
    if (allowIframeFallback && episode?.linkEmbed) {
      setSourceError('Nguồn HLS đang lỗi, đã chuyển sang trình phát dự phòng.')
      setPlayerState('fallback_embed')
    } else {
      setSourceError(message)
      setPlayerState('fatal_error')
    }
  }, [allowIframeFallback, episode?.linkEmbed])

  useEffect(() => {
    destroySource()
    setDuration(0)
    setCurrentTime(0)
    setScrubTime(0)
    setIsScrubbing(false)
    scrubbingRef.current = false
    setIsPlaying(false)
    setSourceError(null)
    if (!episode) { setPlayerState('idle'); return undefined }
    if (!episode.linkM3u8) {
      setPlayerState(allowIframeFallback && episode.linkEmbed ? 'fallback_embed' : 'fatal_error')
      if (!allowIframeFallback || !episode.linkEmbed) setSourceError('Tập này không có nguồn HLS để đồng bộ chính xác. Host hãy chọn nguồn khác.')
      return undefined
    }

    const video = videoRef.current
    if (!video) return undefined
    const hlsSource = playableHlsUrl(episode.linkM3u8)
    if (!hlsSource) {
      setSourceError('Thiếu NEXT_PUBLIC_WATCH_PARTY_API_URL. Hãy trỏ biến này tới watch-party server đã deploy.')
      setPlayerState('fatal_error')
      return undefined
    }
    let disposed = false
    let networkRetries = 0
    let recoveredMedia = false
    const ready = () => { if (!disposed) setPlayerState('ready') }
    const metadata = () => { if (!disposed) { setDuration(Number.isFinite(video.duration) ? video.duration : 0); if (initialTime > 0) video.currentTime = Math.min(initialTime, Math.max(0, video.duration - 1)); ready() } }
    const handleVideoError = () => {
      if (!disposed) {
        const mediaError = video.error
        console.warn('Video element error', { code: mediaError?.code, message: mediaError?.message, networkState: video.networkState, readyState: video.readyState, source: video.currentSrc })
        // hls.js owns the MediaSource on Chromium. Let its ERROR handler
        // recover first; destroying it here races recoverMediaError().
        if (hlsRef.current) return
        useFallbackOrFail('Lỗi khi tải hoặc phát nguồn video gốc.')
      }
    }
    video.addEventListener('loadedmetadata', metadata)
    video.addEventListener('error', handleVideoError)
    setPlayerState('loading_manifest')

    // CDN startup can be slow; five seconds caused healthy sources to fail.
    const timeoutId = window.setTimeout(() => {
      if (!disposed && (playerStateRef.current === 'loading_manifest' || playerStateRef.current === 'loading_media' || playerStateRef.current === 'idle')) {
        console.warn('HLS stream load timed out, automatically falling back to iframe embed.')
        useFallbackOrFail('Nguồn HLS tải quá lâu (hết thời gian chờ). Đã chuyển sang trình phát dự phòng.')
      }
    }, 15000)

    // Chromium may report that it recognizes the HLS MIME type while still
    // failing with MEDIA_ERR_SRC_NOT_SUPPORTED. Prefer MSE/hls.js whenever
    // available; native HLS remains the Safari fallback.
    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false })
      hlsRef.current = hls
      hls.on(Hls.Events.MEDIA_ATTACHED, () => { if (!disposed) setPlayerState('loading_media') })
      hls.on(Hls.Events.MANIFEST_PARSED, ready)
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (disposed) return
        console.warn('HLS playback error', { type: data.type, details: data.details, fatal: data.fatal, responseCode: data.response?.code, url: data.url })
        if (!data.fatal) return
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRetries < 2) {
          const delay = networkRetries++ === 0 ? 1000 : 2000
          setSourceError(`Nguồn đang mất kết nối, thử lại lần ${networkRetries}/2…`)
          const timer = window.setTimeout(() => { if (!disposed) { setSourceError(null); hls.startLoad() } }, delay)
          retryTimersRef.current.push(timer)
          return
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !recoveredMedia) {
          recoveredMedia = true
          hls.recoverMediaError()
          return
        }
        useFallbackOrFail('Không thể tải tập này — hãy thử server khác.')
      })
      hls.attachMedia(video)
      hls.loadSource(hlsSource)
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsSource
      video.load()
    } else {
      useFallbackOrFail('Trình duyệt này không hỗ trợ nguồn HLS.')
    }

    return () => {
      disposed = true
      window.clearTimeout(timeoutId)
      video.removeEventListener('loadedmetadata', metadata)
      video.removeEventListener('error', handleVideoError)
      destroySource()
    }
  }, [allowIframeFallback, destroySource, episode?.id, episode?.linkEmbed, episode?.linkM3u8, initialTime, sourceVersion, useFallbackOrFail])

  useEffect(() => { if (videoRef.current) videoRef.current.volume = volume }, [volume])

  const applyRoomPlayback = useCallback(async () => {
    const video = videoRef.current
    const state = latestPlaybackRef.current
    if (!video || video.readyState < HTMLMediaElement.HAVE_METADATA || !video.currentSrc) return
    applyingRemoteRef.current = true
    const nowTarget = state.currentTime + (state.isPlaying ? Math.max(0, Date.now() + clockOffset - state.serverUpdatedAt) / 1000 : 0)
    const drift = nowTarget - video.currentTime
    const isNewRevision = state.revision > lastAppliedRevisionRef.current
    const isExplicitSeek = isNewRevision && (state.action === 'seek' || state.action === 'episode_change')
    if (isNewRevision) lastAppliedRevisionRef.current = state.revision
    if (!isExplicitSeek && video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
      if (!state.isPlaying && !video.paused) video.pause()
      applyingRemoteRef.current = false
      return
    }
    const hardCorrectionReady = Date.now() - lastHardSeekAtRef.current >= 8000
    if (isExplicitSeek || (hardCorrectionReady && Math.abs(drift) >= WATCH_PARTY_DRIFT_HARD_SECONDS)) {
      video.currentTime = Math.max(0, nowTarget)
      lastHardSeekAtRef.current = Date.now()
    }
    else if (Math.abs(drift) >= WATCH_PARTY_DRIFT_SOFT_SECONDS) video.playbackRate = drift > 0 ? 1.05 : 0.95
    else video.playbackRate = 1
    try {
      if (state.isPlaying && video.paused) await video.play()
      if (!state.isPlaying && !video.paused) video.pause()
      setPlayerState(state.isPlaying ? 'playing' : 'ready')
    } catch (error) {
      const name = error instanceof DOMException ? error.name : ''
      setPlayerState(name === 'NotAllowedError' ? 'autoplay_blocked' : 'fatal_error')
      if (name !== 'NotAllowedError') setSourceError('Trình duyệt không thể phát nguồn này — hãy thử server khác.')
    } finally {
      window.setTimeout(() => { applyingRemoteRef.current = false }, 250)
    }
  }, [clockOffset])

  useEffect(() => {
    if (standalone || isHost) return
    if (playerState !== 'ready' && playerState !== 'playing' && playerState !== 'buffering' && playerState !== 'autoplay_blocked') return
    void applyRoomPlayback()
  }, [applyRoomPlayback, isHost, playback.revision, playerState, standalone])

  useEffect(() => {
    if (standalone || isHost || !isConnected || !['ready', 'playing', 'buffering'].includes(playerState)) return undefined
    const timer = window.setInterval(() => void applyRoomPlayback(), 750)
    return () => window.clearInterval(timer)
  }, [applyRoomPlayback, isConnected, isHost, playerState, standalone])

  useEffect(() => {
    if (!isHost || !episode || playerState === 'fallback_embed' || playerState === 'fatal_error') return undefined
    const interval = window.setInterval(() => {
      const video = videoRef.current
      if (video?.currentSrc) onPlaybackUpdate({ episodeId: episode.id, currentTime: video.currentTime, isPlaying: !video.paused, action: 'heartbeat' })
    }, playback.isPlaying ? 5000 : 15000)
    return () => window.clearInterval(interval)
  }, [episode, isHost, onPlaybackUpdate, playback.isPlaying, playerState])

  const emitNative = (action: 'play' | 'pause' | 'seek') => {
    const video = videoRef.current
    if (!video || !episode || !isHost || applyingRemoteRef.current || !video.currentSrc) return
    onPlaybackUpdate({ episodeId: episode.id, currentTime: video.currentTime, isPlaying: !video.paused, action })
  }

  const commitSeek = (requestedTime: number) => {
    const video = videoRef.current
    if (!video || !episode || !isHost || !isConnected || !Number.isFinite(requestedTime)) return
    const value = Math.max(0, Math.min(duration || requestedTime, requestedTime))
    suppressSeekEventRef.current = true
    video.currentTime = value
    setCurrentTime(value)
    setScrubTime(value)
    onPlaybackUpdate({ episodeId: episode.id, currentTime: value, isPlaying: !video.paused, action: 'seek' })
  }

  if (!episode) return <div className="flex h-full min-h-80 items-center justify-center bg-black text-gray-400">Chưa có tập phim để phát.</div>
  if (playerState === 'fallback_embed') return <div className="relative aspect-video h-full w-full bg-black">
    <iframe src={episode.linkEmbed} title={episode.name} className="h-full w-full border-0" allowFullScreen allow="autoplay; encrypted-media; picture-in-picture" />
    <div className="absolute left-3 top-3 max-w-md rounded-lg border border-amber-500/40 bg-black/90 px-3 py-2 text-sm text-amber-100">{sourceError || 'Nguồn này chỉ hỗ trợ đồng bộ giới hạn. Chat, reaction và đổi tập vẫn hoạt động.'}</div>
  </div>

  const connectionText = !isConnected ? 'Mất kết nối' : roomStatus === 'host_reconnecting' ? 'Host đang kết nối lại' : playerState === 'buffering' ? 'Đang tải dữ liệu' : playerState === 'playing' || playerState === 'ready' ? 'Đã đồng bộ' : 'Đang bắt kịp'
  return <div className="relative aspect-video h-full w-full overflow-hidden bg-black">
    <video ref={videoRef} className="h-full w-full bg-black object-contain" playsInline
      onLoadedMetadata={() => { const video = videoRef.current; if (video) { setDuration(Number.isFinite(video.duration) ? video.duration : 0); if (!standalone) void applyRoomPlayback() } }}
      onWaiting={() => setPlayerState('buffering')}
      onCanPlay={() => setPlayerState((state) => state === 'autoplay_blocked' ? state : 'ready')}
      onTimeUpdate={(event) => { const video = event.currentTarget; if (!isScrubbing) setCurrentTime(video.currentTime); onProgress?.(video.currentTime, video.duration, 'timeupdate'); if (!isHost && Math.abs(targetTime - video.currentTime) < 0.2) video.playbackRate = 1 }}
      onPlay={() => { setIsPlaying(true); setPlayerState('playing'); emitNative('play') }}
      onPause={() => { setIsPlaying(false); onProgress?.(currentTime, duration, 'pause'); emitNative('pause') }}
      onSeeked={(event) => { const time = event.currentTarget.currentTime; setCurrentTime(time); onProgress?.(time, duration, 'seek'); if (suppressSeekEventRef.current) { suppressSeekEventRef.current = false; return } emitNative('seek') }} />

    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">{reactions.map((reaction, index) => <div key={reaction.id} className="absolute animate-bounce text-4xl" style={{ left: `${18 + (index * 13) % 65}%`, bottom: `${22 + (index * 7) % 42}%` }}>{reaction.emoji}</div>)}</div>
    <div className="absolute left-3 top-3 rounded-md bg-black/80 px-3 py-1.5 text-xs" aria-live="polite"><span className={`mr-2 inline-block h-2 w-2 rounded-full ${connectionText === 'Đã đồng bộ' ? 'bg-emerald-400' : !isConnected ? 'bg-red-400' : 'bg-amber-400'}`} />{connectionText}</div>
    {!isHost && <div className="absolute right-3 top-3 rounded-md bg-black/80 px-3 py-1.5 text-xs">Host đang điều khiển</div>}

    {(playerState === 'loading_manifest' || playerState === 'loading_media') && (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 z-10">
        <div className="rounded-lg bg-black/80 px-4 py-3 text-sm">Đang tải nguồn phim…</div>
        {allowIframeFallback && episode?.linkEmbed && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => useFallbackOrFail('Đã chuyển sang trình phát dự phòng theo yêu cầu.')}
            className="border-white/30 text-xs text-white hover:bg-white/10"
          >
            Chuyển sang trình phát dự phòng (Iframe)
          </Button>
        )}
      </div>
    )}
    {playerState === 'buffering' && <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-black/75 px-4 py-3 text-sm">Đang tải đoạn phim…</div>}
    {playerState === 'autoplay_blocked' && <Button onClick={() => void applyRoomPlayback()} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">Bấm để bắt kịp phòng</Button>}
    {playerState === 'fatal_error' && <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center"><div><AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-400" /><p className="mb-4 text-sm text-gray-200">{sourceError || 'Không thể tải nguồn phim.'}</p><Button onClick={() => setSourceVersion((value) => value + 1)}><RefreshCw className="mr-2 h-4 w-4" />Thử lại</Button></div></div>}

    <div className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-black via-black/80 to-transparent p-4">
      <div className="flex items-center justify-between text-sm"><span className="font-medium">{episode.name}</span><span className="text-xs text-gray-300">{episode.serverName}</span></div>
      <input aria-label="Tiến độ phát" type="range" min={0} max={duration || 0} step={0.1} value={Math.min(isScrubbing ? scrubTime : currentTime, duration || currentTime)} disabled={!isHost || !duration || !isConnected} onPointerDown={() => { scrubbingRef.current = true; setIsScrubbing(true); setScrubTime(currentTime) }} onChange={(event) => { const value = Number(event.target.value); setScrubTime(value); if (!scrubbingRef.current) commitSeek(value) }} onPointerUp={(event) => { commitSeek(Number(event.currentTarget.value)); scrubbingRef.current = false; setIsScrubbing(false) }} onPointerCancel={() => { scrubbingRef.current = false; setIsScrubbing(false); setScrubTime(currentTime) }} className="w-full accent-purple-500" />
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Button size="icon" disabled={!isHost || !isConnected || playerState === 'fatal_error'} onClick={() => { const video = videoRef.current; if (!video?.currentSrc) return; if (video.paused) void video.play().catch(() => setPlayerState('autoplay_blocked')); else video.pause() }}>{isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button><Button size="icon" variant="outline" aria-label="Lùi 10 giây" disabled={!isHost || !isConnected || !duration} onClick={() => commitSeek(currentTime - 10)}><Rewind className="h-4 w-4" /></Button><Button size="icon" variant="outline" aria-label="Tiến 10 giây" disabled={!isHost || !isConnected || !duration} onClick={() => commitSeek(currentTime + 10)}><FastForward className="h-4 w-4" /></Button><span className="font-mono text-xs">{formatTime(isScrubbing ? scrubTime : currentTime)} / {formatTime(duration)}</span></div>
        <div className="flex items-center gap-2"><Volume2 className="h-4 w-4" /><input aria-label="Âm lượng" type="range" min={0} max={1} step={0.05} value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="w-20 accent-purple-500" /><Button size="icon" variant="outline" onClick={() => void applyRoomPlayback()}><RefreshCw className="h-4 w-4" /></Button><Button size="icon" variant="outline" onClick={() => void videoRef.current?.requestFullscreen?.()}><Maximize className="h-4 w-4" /></Button></div></div>
    </div>
  </div>
}
