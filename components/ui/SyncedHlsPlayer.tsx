'use client'

import { MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Hls from 'hls.js'
import {
  AlertTriangle,
  AudioLines,
  LockKeyhole,
  Maximize,
  MessageCircle,
  Minimize,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Settings,
  SkipBack,
  SkipForward,
  SmilePlus,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  WATCH_PARTY_DRIFT_HARD_SECONDS,
  WATCH_PARTY_DRIFT_SOFT_SECONDS,
  WatchPartyEpisode,
  WatchPartyMember,
  WatchPartyPlayback,
  WatchPartyReaction,
  WatchPartyRoomStatus,
} from '@/lib/watch-party-types'
import { watchPartyHlsCandidates } from '@/lib/media-url'
import { cn } from '@/lib/utils'

type PlayerState = 'idle' | 'loading_manifest' | 'loading_media' | 'ready' | 'playing' | 'buffering' | 'autoplay_blocked' | 'fallback_embed' | 'fatal_error'
type ProgressReason = 'timeupdate' | 'pause' | 'seek'
type GestureFeedback = { label: string; side: 'left' | 'center' | 'right' } | null

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
  isFullscreen?: boolean
  chatOpen?: boolean
  unreadCount?: number
  fillContainer?: boolean
  onToggleChat?: () => void
  onToggleFullscreen?: () => void
  voiceEnabled?: boolean
  micEnabled?: boolean
  speakerEnabled?: boolean
  voiceJoined?: boolean
  speakingMembers?: WatchPartyMember[]
  reactionOptions?: string[]
  reactionError?: string | null
  onToggleMic?: () => void
  onToggleSpeaker?: () => void
  onToggleVoicePermission?: () => void
  onSendReaction?: (emoji: string) => void
  previousEpisode?: WatchPartyEpisode
  nextEpisode?: WatchPartyEpisode
  autoNextEnabled?: boolean
  commandError?: string | null
  onPreviousEpisode?: () => void
  onNextEpisode?: (reason?: 'next' | 'auto_next') => void
  onToggleAutoNext?: () => void
}

const formatTime = (seconds = 0) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
const memberInitials = (name = '?') => name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase() || '?'

function SeekIcon({ direction }: { direction: 'back' | 'forward' }) {
  const Icon = direction === 'back' ? RotateCcw : RotateCw
  return <span className="relative flex h-7 w-7 items-center justify-center"><Icon className="h-7 w-7" /><span className="absolute text-[9px] font-black leading-none">10</span></span>
}

export function SyncedHlsPlayer({
  episode,
  playback,
  isHost,
  isConnected,
  clockOffset,
  reactions,
  roomStatus,
  onPlaybackUpdate,
  onProgress,
  allowIframeFallback = false,
  initialTime = 0,
  standalone = false,
  isFullscreen = false,
  chatOpen = false,
  unreadCount = 0,
  fillContainer = false,
  onToggleChat,
  onToggleFullscreen,
  voiceEnabled = false,
  micEnabled = false,
  speakerEnabled = true,
  voiceJoined = false,
  speakingMembers = [],
  reactionOptions = [],
  reactionError = null,
  onToggleMic,
  onToggleSpeaker,
  onToggleVoicePermission,
  onSendReaction,
  previousEpisode,
  nextEpisode,
  autoNextEnabled = true,
  commandError = null,
  onPreviousEpisode,
  onNextEpisode,
  onToggleAutoNext,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const applyingRemoteRef = useRef(false)
  const lastAppliedRevisionRef = useRef(-1)
  const lastHardSeekAtRef = useRef(0)
  const suppressSeekEventRef = useRef(false)
  const scrubbingRef = useRef(false)
  const latestPlaybackRef = useRef(playback)
  const retryTimersRef = useRef<number[]>([])
  const controlsTimerRef = useRef<number | null>(null)
  const gestureTimerRef = useRef<number | null>(null)
  const feedbackTimerRef = useRef<number | null>(null)
  const [playerState, setPlayerState] = useState<PlayerState>('idle')
  const [sourceError, setSourceError] = useState<string | null>(null)
  const [sourceVersion, setSourceVersion] = useState(0)
  const [deliveryAttempt, setDeliveryAttempt] = useState({ episodeId: '', index: 0 })
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.85)
  const [muted, setMuted] = useState(false)
  const [volumeWritable, setVolumeWritable] = useState(true)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [scrubTime, setScrubTime] = useState(0)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [gestureFeedback, setGestureFeedback] = useState<GestureFeedback>(null)
  const [showReactionTray, setShowReactionTray] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [qualityLevel, setQualityLevel] = useState(-1)
  const [qualityOptions, setQualityOptions] = useState<Array<{ index: number; label: string }>>([])
  const endedEpisodeRef = useRef<string | null>(null)

  const playerStateRef = useRef(playerState)
  useEffect(() => { playerStateRef.current = playerState }, [playerState])
  useEffect(() => { latestPlaybackRef.current = playback }, [playback])

  const targetTime = useMemo(() => {
    const elapsed = playback.isPlaying ? Math.max(0, Date.now() + clockOffset - playback.serverUpdatedAt) / 1000 : 0
    return Math.max(0, playback.currentTime + elapsed)
  }, [clockOffset, playback])
  const hlsCandidates = useMemo(() => watchPartyHlsCandidates(episode?.linkM3u8), [episode?.linkM3u8])
  const deliveryIndex = deliveryAttempt.episodeId === episode?.id ? deliveryAttempt.index : 0

  const clearInteractionTimers = useCallback(() => {
    if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current)
    if (gestureTimerRef.current) window.clearTimeout(gestureTimerRef.current)
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current)
    controlsTimerRef.current = null
    gestureTimerRef.current = null
    feedbackTimerRef.current = null
  }, [])

  useEffect(() => clearInteractionTimers, [clearInteractionTimers])

  const scheduleControls = useCallback(() => {
    setControlsVisible(true)
    if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current)
    controlsTimerRef.current = null
    if (!standalone && isPlaying && !isScrubbing && !showReactionTray && !showSettings && playerState === 'playing') {
      controlsTimerRef.current = window.setTimeout(() => setControlsVisible(false), 2500)
    }
  }, [isPlaying, isScrubbing, playerState, showReactionTray, showSettings, standalone])

  useEffect(() => {
    if (!isPlaying || isScrubbing || playerState !== 'playing') setControlsVisible(true)
    scheduleControls()
  }, [isPlaying, isScrubbing, playerState, scheduleControls])

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
    if (episode?.id && deliveryIndex + 1 < hlsCandidates.length) {
      setSourceError('Nguồn trực tiếp đang lỗi, đang thử tuyến dự phòng…')
      setPlayerState('loading_manifest')
      setDeliveryAttempt({ episodeId: episode.id, index: deliveryIndex + 1 })
    } else if (allowIframeFallback && episode?.linkEmbed) {
      setSourceError('Nguồn HLS đang lỗi, đã chuyển sang trình phát dự phòng.')
      setPlayerState('fallback_embed')
    } else {
      setSourceError(message)
      setPlayerState('fatal_error')
    }
  }, [allowIframeFallback, deliveryIndex, episode?.id, episode?.linkEmbed, hlsCandidates.length])

  useEffect(() => {
    destroySource()
    setDuration(0)
    setCurrentTime(0)
    setScrubTime(0)
    setIsScrubbing(false)
    scrubbingRef.current = false
    setIsPlaying(false)
    setSourceError(null)
    setQualityOptions([])
    setQualityLevel(-1)
    endedEpisodeRef.current = null
    if (!episode) { setPlayerState('idle'); return undefined }
    if (!episode.linkM3u8) {
      setPlayerState(allowIframeFallback && episode.linkEmbed ? 'fallback_embed' : 'fatal_error')
      if (!allowIframeFallback || !episode.linkEmbed) setSourceError('Tập này không có nguồn HLS để đồng bộ chính xác. Host hãy chọn nguồn khác.')
      return undefined
    }

    const video = videoRef.current
    if (!video) return undefined
    const hlsSource = hlsCandidates[deliveryIndex]
    if (!hlsSource) {
      setSourceError('Không tìm thấy tuyến phát HLS cho tập này.')
      setPlayerState('fatal_error')
      return undefined
    }
    let disposed = false
    let networkRetries = 0
    let recoveredMedia = false
    const ready = () => { if (!disposed) setPlayerState('ready') }
    const metadata = () => {
      if (!disposed) {
        setDuration(Number.isFinite(video.duration) ? video.duration : 0)
        if (initialTime > 0) video.currentTime = Math.min(initialTime, Math.max(0, video.duration - 1))
        ready()
      }
    }
    const handleVideoError = () => {
      if (!disposed) {
        const mediaError = video.error
        console.warn('Video element error', { code: mediaError?.code, message: mediaError?.message, networkState: video.networkState, readyState: video.readyState, source: video.currentSrc })
        if (hlsRef.current) return
        useFallbackOrFail('Lỗi khi tải hoặc phát nguồn video gốc.')
      }
    }
    video.addEventListener('loadedmetadata', metadata)
    video.addEventListener('error', handleVideoError)
    setPlayerState('loading_manifest')

    const timeoutId = window.setTimeout(() => {
      if (!disposed && ['loading_manifest', 'loading_media', 'idle'].includes(playerStateRef.current)) {
        console.warn('HLS stream load timed out, trying the next watch-party delivery route.')
        useFallbackOrFail('Nguồn HLS tải quá lâu và không còn tuyến phát dự phòng.')
      }
    }, 15000)

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false })
      hlsRef.current = hls
      hls.on(Hls.Events.MEDIA_ATTACHED, () => { if (!disposed) setPlayerState('loading_media') })
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setQualityOptions(hls.levels.map((level, index) => ({ index, label: level.height ? `${level.height}p` : `${Math.round(level.bitrate / 1000)} kbps` })).filter((item, index, items) => items.findIndex((candidate) => candidate.label === item.label) === index))
        ready()
      })
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
  }, [allowIframeFallback, deliveryIndex, destroySource, episode?.id, episode?.linkEmbed, episode?.linkM3u8, hlsCandidates, initialTime, sourceVersion, useFallbackOrFail])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = muted
    if (volumeWritable) video.volume = volume
  }, [muted, volume, volumeWritable])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const original = video.volume
    try {
      video.volume = original === 0.57 ? 0.63 : 0.57
      const writable = Math.abs(video.volume - (original === 0.57 ? 0.63 : 0.57)) < 0.01
      video.volume = original
      setVolumeWritable(writable)
    } catch { setVolumeWritable(false) }
  }, [episode?.id])

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
    } else if (Math.abs(drift) >= WATCH_PARTY_DRIFT_SOFT_SECONDS) video.playbackRate = drift > 0 ? 1.05 : 0.95
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
    if (!['ready', 'playing', 'buffering', 'autoplay_blocked'].includes(playerState)) return
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

  const togglePlayback = useCallback(() => {
    const video = videoRef.current
    if (!video?.currentSrc || !isHost || !isConnected || playerState === 'fatal_error') return
    if (video.paused) void video.play().catch(() => setPlayerState('autoplay_blocked'))
    else video.pause()
  }, [isConnected, isHost, playerState])

  const commitSeek = useCallback((requestedTime: number) => {
    const video = videoRef.current
    if (!video || !episode || !isHost || !isConnected || !Number.isFinite(requestedTime)) return
    const value = Math.max(0, Math.min(duration || requestedTime, requestedTime))
    suppressSeekEventRef.current = true
    video.currentTime = value
    setCurrentTime(value)
    setScrubTime(value)
    onPlaybackUpdate({ episodeId: episode.id, currentTime: value, isPlaying: !video.paused, action: 'seek' })
  }, [duration, episode, isConnected, isHost, onPlaybackUpdate])

  const showGestureFeedback = useCallback((label: string, side: 'left' | 'center' | 'right') => {
    setGestureFeedback({ label, side })
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current)
    feedbackTimerRef.current = window.setTimeout(() => setGestureFeedback(null), 700)
  }, [])

  const toggleMute = useCallback(() => {
    setMuted((value) => !value)
    scheduleControls()
  }, [scheduleControls])

  const selectQuality = useCallback((level: number) => {
    setQualityLevel(level)
    if (hlsRef.current) hlsRef.current.currentLevel = level
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (onToggleFullscreen) { onToggleFullscreen(); return }
    const root = rootRef.current
    if (!root) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void root.requestFullscreen?.()
  }, [onToggleFullscreen])

  useEffect(() => {
    if (standalone) return undefined
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      const key = event.key.toLowerCase()
      if (key === 'f') { event.preventDefault(); toggleFullscreen(); return }
      if (key === 'm') { event.preventDefault(); toggleMute(); return }
      if (!isHost) return
      if (key === ' ' || key === 'k') { event.preventDefault(); togglePlayback() }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); commitSeek(currentTime - 10); showGestureFeedback('−10 giây', 'left') }
      else if (event.key === 'ArrowRight') { event.preventDefault(); commitSeek(currentTime + 10); showGestureFeedback('+10 giây', 'right') }
      scheduleControls()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [commitSeek, currentTime, isHost, scheduleControls, showGestureFeedback, standalone, toggleFullscreen, toggleMute, togglePlayback])

  const handleSurfaceClick = () => {
    scheduleControls()
    if (gestureTimerRef.current) window.clearTimeout(gestureTimerRef.current)
    gestureTimerRef.current = window.setTimeout(() => {
      if (isHost) {
        const willPlay = videoRef.current?.paused ?? true
        togglePlayback()
        showGestureFeedback(willPlay ? 'Phát' : 'Tạm dừng', 'center')
      }
    }, 240)
  }

  const handleSurfaceDoubleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (gestureTimerRef.current) window.clearTimeout(gestureTimerRef.current)
    gestureTimerRef.current = null
    scheduleControls()
    if (!isHost) return
    const rect = event.currentTarget.getBoundingClientRect()
    const side = event.clientX - rect.left < rect.width / 2 ? 'left' : 'right'
    commitSeek(currentTime + (side === 'left' ? -10 : 10))
    showGestureFeedback(side === 'left' ? '−10 giây' : '+10 giây', side)
  }

  if (!episode) return <div className="flex h-full min-h-80 items-center justify-center bg-black text-gray-400">Chưa có tập phim để phát.</div>
  if (playerState === 'fallback_embed') return <div ref={rootRef} className={cn('relative w-full bg-black', fillContainer ? 'h-full' : 'aspect-video h-full')}>
    <iframe src={episode.linkEmbed} title={episode.name} className="h-full w-full border-0" allowFullScreen allow="autoplay; encrypted-media; picture-in-picture" />
    <div className="absolute left-3 top-3 max-w-md rounded-lg border border-amber-500/40 bg-black/90 px-3 py-2 text-sm text-amber-100">{sourceError || 'Nguồn này chỉ hỗ trợ đồng bộ giới hạn. Chat, reaction và đổi tập vẫn hoạt động.'}</div>
    <div className="absolute bottom-3 right-3 flex gap-2">
      {!standalone && onToggleChat && <Button size="icon" variant="outline" aria-label={chatOpen ? 'Ẩn chat' : 'Hiện chat'} onClick={onToggleChat} className="relative h-11 w-11 rounded-full border-white/20 bg-black/60 text-white hover:bg-white/20"><MessageCircle className="h-5 w-5" />{unreadCount > 0 && <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-purple-500 px-1 text-[10px] font-bold">{Math.min(unreadCount, 99)}</span>}</Button>}
      <Button size="icon" variant="outline" aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'} onClick={toggleFullscreen} className="h-11 w-11 rounded-full border-white/20 bg-black/60 text-white hover:bg-white/20">{isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}</Button>
    </div>
  </div>

  const connectionText = !isConnected ? 'Mất kết nối' : roomStatus === 'host_reconnecting' ? 'Host đang kết nối lại' : playerState === 'buffering' ? 'Đang tải dữ liệu' : playerState === 'playing' || playerState === 'ready' ? 'Đã đồng bộ' : 'Đang bắt kịp'
  const controlsAreVisible = standalone || controlsVisible || !isPlaying
  const iconButtonClass = 'h-11 w-11 rounded-full border-white/20 bg-black/45 text-white shadow-none hover:bg-white/20 hover:text-white'

  return <div
    ref={rootRef}
    className={cn('group relative w-full overflow-hidden bg-black text-white', fillContainer ? 'h-full min-h-0' : 'aspect-video h-full')}
    onPointerMove={standalone ? undefined : scheduleControls}
    onPointerDown={standalone ? undefined : scheduleControls}
    onMouseLeave={() => { if (!standalone && isPlaying) scheduleControls() }}
  >
      <video ref={videoRef} className="h-full w-full bg-black object-contain" playsInline preload="metadata"
      onLoadedMetadata={() => { const video = videoRef.current; if (video) { setDuration(Number.isFinite(video.duration) ? video.duration : 0); if (!standalone) void applyRoomPlayback() } }}
      onWaiting={() => setPlayerState('buffering')}
      onCanPlay={() => setPlayerState((state) => state === 'autoplay_blocked' ? state : 'ready')}
      onTimeUpdate={(event) => { const video = event.currentTarget; if (!isScrubbing) setCurrentTime(video.currentTime); onProgress?.(video.currentTime, video.duration, 'timeupdate'); if (!isHost && Math.abs(targetTime - video.currentTime) < 0.2) video.playbackRate = 1 }}
      onPlay={() => { setIsPlaying(true); setPlayerState('playing'); emitNative('play') }}
      onPause={() => { setIsPlaying(false); onProgress?.(currentTime, duration, 'pause'); emitNative('pause') }}
      onEnded={() => {
        setIsPlaying(false)
        if (isHost && autoNextEnabled && nextEpisode && endedEpisodeRef.current !== episode.id) {
          endedEpisodeRef.current = episode.id
          onNextEpisode?.('auto_next')
        }
      }}
      onSeeked={(event) => { const time = event.currentTarget.currentTime; setCurrentTime(time); onProgress?.(time, duration, 'seek'); if (suppressSeekEventRef.current) { suppressSeekEventRef.current = false; return } emitNative('seek') }} />

    <button type="button" aria-label={isHost ? 'Nhấn để phát hoặc tạm dừng; nhấn đúp hai bên để tua 10 giây' : 'Hiện điều khiển video'} className="absolute inset-0 z-10 cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-400" onClick={handleSurfaceClick} onDoubleClick={handleSurfaceDoubleClick} />

    {!standalone && <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-live="polite">
      {reactions.map((reaction, index) => <div key={reaction.id} className="watch-party-reaction absolute flex -translate-x-1/2 flex-col items-center" style={{ left: `${16 + (index * 17) % 68}%`, bottom: `${23 + (index * 9) % 33}%` }}>
        <span className="text-4xl drop-shadow-lg sm:text-5xl">{reaction.emoji}</span>
        <span className="mt-1 max-w-28 truncate rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white/90">{reaction.displayName}</span>
      </div>)}
    </div>}

    {gestureFeedback && <div className={cn('pointer-events-none absolute top-1/2 z-30 -translate-y-1/2 rounded-full bg-black/65 px-5 py-4 text-center font-semibold shadow-xl', gestureFeedback.side === 'left' ? 'left-[18%]' : gestureFeedback.side === 'right' ? 'right-[18%]' : 'left-1/2 -translate-x-1/2')}>
      {gestureFeedback.side === 'center' && (gestureFeedback.label === 'Phát' ? <Play className="mx-auto mb-1 h-7 w-7 fill-current" /> : <Pause className="mx-auto mb-1 h-7 w-7 fill-current" />)}
      <span className="text-xs sm:text-sm">{gestureFeedback.label}</span>
    </div>}

    {!standalone && <div className={cn('absolute left-3 top-3 z-30 flex items-center rounded-full bg-black/65 px-3 py-1.5 text-xs transition-opacity duration-200', controlsAreVisible ? 'opacity-100' : 'opacity-0')} aria-live="polite">
      <span className={cn('mr-2 inline-block h-2 w-2 rounded-full', connectionText === 'Đã đồng bộ' ? 'bg-emerald-400' : !isConnected ? 'bg-red-400' : 'bg-amber-400')} />{connectionText}
    </div>}
    {!standalone && !isHost && <div className={cn('absolute right-3 top-3 z-30 hidden items-center rounded-full bg-black/65 px-3 py-1.5 text-xs transition-opacity duration-200 sm:flex', controlsAreVisible ? 'opacity-100' : 'opacity-0')}><LockKeyhole className="mr-1.5 h-3.5 w-3.5" />Host đang điều khiển</div>}
    {!standalone && speakingMembers.length > 0 && <div className="pointer-events-none absolute right-3 top-12 z-30 flex max-w-[70%] flex-wrap justify-end gap-2" aria-live="polite">
      {speakingMembers.slice(0, 4).map((member) => <div key={member.memberId} className="flex items-center gap-2 rounded-full border border-emerald-400/70 bg-black/75 py-1 pl-1 pr-2 shadow-lg"><span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-purple-500/30 text-[10px] font-bold ring-2 ring-emerald-400">{memberInitials(member.displayName)}{member.avatar && <img src={member.avatar} alt="" referrerPolicy="no-referrer" onError={(event) => event.currentTarget.remove()} className="absolute inset-0 h-full w-full object-cover" />}</span><span className="max-w-24 truncate text-[11px] font-medium">{member.displayName}</span><AudioLines className="h-3.5 w-3.5 text-emerald-400" /></div>)}
    </div>}

    {!standalone && commandError && <div role="status" className="absolute left-1/2 top-3 z-40 max-w-[80%] -translate-x-1/2 rounded-full border border-amber-400/30 bg-black/85 px-3 py-1.5 text-center text-xs text-amber-100">
      {commandError === 'DISCONNECTED' ? 'Mất kết nối phòng.' : commandError === 'TIMEOUT' ? 'Phòng phản hồi quá lâu. Hãy thử lại.' : commandError === 'HOST_ONLY' ? 'Chỉ host được điều khiển phim.' : 'Thao tác chưa thực hiện được.'}
    </div>}

    {(playerState === 'loading_manifest' || playerState === 'loading_media') && <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-black/60">
      <div className="rounded-lg bg-black/80 px-4 py-3 text-sm">Đang tải nguồn phim…</div>
      {allowIframeFallback && episode.linkEmbed && <Button size="sm" variant="outline" onClick={() => useFallbackOrFail('Đã chuyển sang trình phát dự phòng theo yêu cầu.')} className="border-white/30 bg-black/60 text-xs text-white hover:bg-white/10">Chuyển sang trình phát dự phòng</Button>}
    </div>}
    {playerState === 'buffering' && <div className="pointer-events-none absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-black/75 px-4 py-3 text-sm">Đang tải đoạn phim…</div>}
    {playerState === 'autoplay_blocked' && <Button onClick={() => void applyRoomPlayback()} className="absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2">Bấm để bắt kịp phòng</Button>}
    {playerState === 'fatal_error' && <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 p-6 text-center"><div><AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-400" /><p className="mb-4 text-sm text-gray-200">{sourceError || 'Không thể tải nguồn phim.'}</p><Button onClick={() => { setDeliveryAttempt({ episodeId: episode?.id || '', index: 0 }); setSourceVersion((value) => value + 1) }}><RefreshCw className="mr-2 h-4 w-4" />Thử lại</Button></div></div>}

    {!standalone && showReactionTray && <div className="absolute bottom-[5.6rem] right-3 z-40 flex max-w-[calc(100%-1.5rem)] items-center gap-1 rounded-xl border border-white/10 bg-black/85 p-1.5 shadow-2xl backdrop-blur-sm sm:bottom-24 sm:right-4">
      {reactionOptions.map((emoji) => <button key={emoji} type="button" aria-label={`Gửi reaction ${emoji}`} disabled={!isConnected} onClick={() => { onSendReaction?.(emoji); setShowReactionTray(false); scheduleControls() }} className="flex h-10 w-10 items-center justify-center rounded-lg text-xl transition duration-200 hover:-translate-y-0.5 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 disabled:opacity-40 sm:h-11 sm:w-11">{emoji}</button>)}
      {reactionError && <span className="absolute -top-8 right-0 whitespace-nowrap rounded-full bg-black/90 px-2 py-1 text-[11px] text-amber-200">{reactionError}</span>}
    </div>}

    {showSettings && <div className="absolute bottom-[5.6rem] right-3 z-40 w-[min(18rem,calc(100%-1.5rem))] rounded-2xl border border-white/10 bg-[#0b0e18]/95 p-3 shadow-2xl backdrop-blur-md sm:bottom-24 sm:right-4">
      <div className="mb-3 flex items-center justify-between"><span className="text-sm font-semibold">Cài đặt phát</span><button type="button" onClick={() => setShowSettings(false)} className="touch-target rounded-full text-xs text-slate-400 hover:text-white">Đóng</button></div>
      {onToggleAutoNext && <button type="button" disabled={!isHost} onClick={onToggleAutoNext} className="flex min-h-11 w-full items-center justify-between rounded-xl px-2 text-sm hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"><span>Tự động chuyển tập</span><span className={cn('rounded-full px-2 py-1 text-[10px] font-bold', autoNextEnabled ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/10 text-slate-400')}>{autoNextEnabled ? 'ON' : 'OFF'}</span></button>}
      <div className="mt-2 border-t border-white/10 pt-2"><p className="px-2 pb-2 text-xs text-slate-400">Chất lượng</p><div className="flex flex-wrap gap-2"><button type="button" onClick={() => selectQuality(-1)} className={cn('rounded-lg border px-3 py-2 text-xs', qualityLevel === -1 ? 'border-purple-400 bg-purple-500/20' : 'border-white/10')}>Tự động</button>{qualityOptions.map((option) => <button key={option.index} type="button" onClick={() => selectQuality(option.index)} className={cn('rounded-lg border px-3 py-2 text-xs', qualityLevel === option.index ? 'border-purple-400 bg-purple-500/20' : 'border-white/10')}>{option.label}</button>)}</div>{qualityOptions.length === 0 && <p className="mt-2 px-2 text-[11px] text-slate-500">Trình duyệt đang tự chọn chất lượng.</p>}</div>
    </div>}

    {controlsAreVisible && <div className="absolute left-1/2 top-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 md:hidden">
      <Button size="icon" iconSize="xl" variant="outline" aria-label="Lùi 10 giây" disabled={!isHost || !isConnected || !duration} onClick={() => { commitSeek(currentTime - 10); showGestureFeedback('−10 giây', 'left') }} className={iconButtonClass}><SeekIcon direction="back" /></Button>
      <Button size="icon" iconSize="lg" aria-label={isPlaying ? 'Tạm dừng' : 'Phát'} disabled={!isHost || !isConnected || playerState === 'fatal_error'} onClick={togglePlayback} className="h-12 w-12 rounded-full bg-white text-black hover:bg-white/85">{isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current" />}</Button>
      <Button size="icon" iconSize="xl" variant="outline" aria-label="Tiến 10 giây" disabled={!isHost || !isConnected || !duration} onClick={() => { commitSeek(currentTime + 10); showGestureFeedback('+10 giây', 'right') }} className={iconButtonClass}><SeekIcon direction="forward" /></Button>
    </div>}

    <div className={cn('absolute inset-x-0 bottom-0 z-30 space-y-1.5 bg-gradient-to-t from-black via-black/85 to-transparent px-3 pb-3 pt-12 transition-opacity duration-200 sm:space-y-2 sm:px-4 sm:pb-4 sm:pt-16', controlsAreVisible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0')}>
      <div className="flex items-center justify-between gap-3 text-xs sm:text-sm"><span className="truncate font-medium">{episode.name}</span><span className="hidden shrink-0 text-xs text-gray-300 sm:inline">{episode.serverName}</span></div>
      <input aria-label="Tiến độ phát" title={!isHost ? 'Host đang điều khiển tiến độ phát' : undefined} type="range" min={0} max={duration || 0} step={0.1} value={Math.min(isScrubbing ? scrubTime : currentTime, duration || currentTime)} disabled={!isHost || !duration || !isConnected} onPointerDown={() => { scrubbingRef.current = true; setIsScrubbing(true); setScrubTime(currentTime) }} onChange={(event) => { const value = Number(event.target.value); setScrubTime(value); if (!scrubbingRef.current) commitSeek(value) }} onPointerUp={(event) => { commitSeek(Number(event.currentTarget.value)); scrubbingRef.current = false; setIsScrubbing(false) }} onPointerCancel={() => { scrubbingRef.current = false; setIsScrubbing(false); setScrubTime(currentTime) }} className="h-5 w-full cursor-pointer accent-purple-500 disabled:cursor-not-allowed" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <Button size="icon" iconSize="lg" aria-label={isPlaying ? 'Tạm dừng' : 'Phát'} title={!isHost ? 'Host đang điều khiển' : isPlaying ? 'Tạm dừng (K)' : 'Phát (K)'} disabled={!isHost || !isConnected || playerState === 'fatal_error'} onClick={togglePlayback} className={cn(iconButtonClass, 'hidden md:inline-flex')}>{isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current" />}</Button>
          <Button size="icon" iconSize="xl" variant="outline" aria-label="Lùi 10 giây" disabled={!isHost || !isConnected || !duration} onClick={() => { commitSeek(currentTime - 10); showGestureFeedback('−10 giây', 'left') }} className={cn(iconButtonClass, 'hidden md:inline-flex')}><SeekIcon direction="back" /></Button>
          <Button size="icon" iconSize="xl" variant="outline" aria-label="Tiến 10 giây" disabled={!isHost || !isConnected || !duration} onClick={() => { commitSeek(currentTime + 10); showGestureFeedback('+10 giây', 'right') }} className={cn(iconButtonClass, 'hidden md:inline-flex')}><SeekIcon direction="forward" /></Button>
          <span className="whitespace-nowrap font-mono text-[11px] text-white/90 sm:text-xs">{formatTime(isScrubbing ? scrubTime : currentTime)} <span className="hidden text-white/50 min-[360px]:inline">/ {formatTime(duration)}</span></span>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {onPreviousEpisode && <Button size="icon" variant="outline" aria-label="Tập trước" disabled={!isHost || !previousEpisode || !isConnected} onClick={onPreviousEpisode} className={cn(iconButtonClass, 'hidden lg:inline-flex')}><SkipBack /></Button>}
          <Button size="icon" variant="outline" aria-label="Tập kế" title={nextEpisode ? `Chuyển sang ${nextEpisode.name}` : 'Đây là tập cuối'} disabled={!isHost || !nextEpisode || !isConnected} onClick={() => onNextEpisode?.('next')} className={iconButtonClass}><SkipForward /></Button>
          <Button size="icon" variant="outline" aria-label={muted ? 'Bật tiếng phim' : 'Tắt tiếng phim'} title={muted ? 'Bật tiếng (M)' : 'Tắt tiếng (M)'} onClick={toggleMute} className={iconButtonClass}>{muted ? <VolumeX /> : <Volume2 />}</Button>
          {volumeWritable && <input aria-label="Âm lượng" type="range" min={0} max={1} step={0.05} value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="hidden w-20 accent-purple-500 lg:block" />}
          {!standalone && <Button size="icon" variant="outline" aria-label="Đồng bộ lại" title="Đồng bộ lại với phòng" onClick={() => void applyRoomPlayback()} className={cn(iconButtonClass, 'hidden lg:inline-flex')}><RefreshCw /></Button>}
          <Button size="icon" variant="outline" aria-label="Cài đặt phát" aria-expanded={showSettings} onClick={() => { setShowSettings((value) => !value); setShowReactionTray(false); setControlsVisible(true) }} className={cn(iconButtonClass, showSettings && 'bg-white/20')}><Settings /></Button>
          {!standalone && onSendReaction && <Button size="icon" variant="outline" aria-label={showReactionTray ? 'Ẩn reaction' : 'Gửi reaction'} onClick={() => { setShowReactionTray((value) => !value); setShowSettings(false); setControlsVisible(true) }} className={cn(iconButtonClass, 'hidden sm:inline-flex', showReactionTray && 'bg-white/20')}><SmilePlus /></Button>}
          {!standalone && onToggleChat && <Button size="icon" variant="outline" aria-label={chatOpen ? 'Ẩn chat' : 'Hiện chat'} onClick={onToggleChat} className={cn(iconButtonClass, 'relative', chatOpen && 'bg-white/20')}><MessageCircle />{unreadCount > 0 && <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-purple-500 px-1 text-[10px] font-bold">{Math.min(unreadCount, 99)}</span>}</Button>}
          <Button size="icon" variant="outline" aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'} onClick={toggleFullscreen} className={iconButtonClass}>{isFullscreen ? <Minimize /> : <Maximize />}</Button>
        </div>
      </div>
    </div>
  </div>
}
