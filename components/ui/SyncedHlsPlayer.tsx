'use client'

import { MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Hls from 'hls.js'
import {
  AlertTriangle,
  AudioLines,
  Gauge,
  Headphones,
  Keyboard,
  LockKeyhole,
  Maximize,
  MessageCircle,
  Mic,
  MicOff,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RefreshCw,
  RotateCcw,
  RotateCw,
  ServerCog,
  Settings,
  SkipBack,
  SkipForward,
  SmilePlus,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlayerSeekBar, formatClock } from '@/components/ui/PlayerSeekBar'
import { PlayerShortcuts } from '@/components/ui/PlayerShortcuts'
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
  /** Ảnh nền hiển thị trước khi có khung hình đầu tiên. */
  poster?: string
  /** Cho phép người xem đổi máy chủ phát khi nguồn lỗi. */
  onRequestServerChange?: () => void
}

const formatTime = formatClock
const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const
const STORAGE_KEYS = { volume: 'cinemind:player:volume', muted: 'cinemind:player:muted', rate: 'cinemind:player:rate' } as const

const readStored = <T,>(key: string, fallback: T, parse: (raw: string) => T): T => {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : parse(raw)
  } catch {
    return fallback
  }
}
const memberInitials = (name = '?') => name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase() || '?'

function SeekIcon({ direction }: { direction: 'back' | 'forward' }) {
  const Icon = direction === 'back' ? RotateCcw : RotateCw
  return <span className="relative flex h-7 w-7 items-center justify-center"><Icon className="h-7 w-7" /><span className="absolute text-xs font-black leading-none">10</span></span>
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
  poster,
  onRequestServerChange,
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
  // Khôi phục tuỳ chọn lần xem trước — trước đây âm lượng luôn reset về 0.85.
  const [volume, setVolume] = useState(() => readStored(STORAGE_KEYS.volume, 0.85, (raw) => {
    const value = Number(raw)
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.85
  }))
  const [muted, setMuted] = useState(() => readStored(STORAGE_KEYS.muted, false, (raw) => raw === '1'))
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

  const [bufferedEnd, setBufferedEnd] = useState(0)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showSpeed, setShowSpeed] = useState(false)
  const [pipActive, setPipActive] = useState(false)
  /** Chỉ hiện spinner khi buffering kéo dài — nếu không, mỗi lần seek nhỏ là một lần nhấp nháy. */
  const [showBufferSpinner, setShowBufferSpinner] = useState(false)
  const [userRate, setUserRate] = useState(() => readStored(STORAGE_KEYS.rate, 1, (raw) => {
    const value = Number(raw)
    return PLAYBACK_RATES.includes(value as (typeof PLAYBACK_RATES)[number]) ? value : 1
  }))
  /** Đang giữ để xem nhanh 2× trên mobile; nhả tay là trả về tốc độ cũ. */
  const [holdBoost, setHoldBoost] = useState(false)
  const holdTimerRef = useRef<number | null>(null)
  const gestureRef = useRef<{ mode: 'none' | 'seek' | 'volume'; startX: number; startY: number; startTime: number; startVolume: number } | null>(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.volume, String(volume))
      window.localStorage.setItem(STORAGE_KEYS.muted, muted ? '1' : '0')
      window.localStorage.setItem(STORAGE_KEYS.rate, String(userRate))
    } catch {
      // localStorage bị chặn (chế độ riêng tư) — bỏ qua, chỉ mất phần ghi nhớ
    }
  }, [muted, userRate, volume])

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
    if (isPlaying && !isScrubbing && !showReactionTray && !showSettings) {
      controlsTimerRef.current = window.setTimeout(() => setControlsVisible(false), 3000)
    }
  }, [isPlaying, isScrubbing, showReactionTray, showSettings])

  useEffect(() => {
    if (!isPlaying || isScrubbing || showReactionTray || showSettings) setControlsVisible(true)
    scheduleControls()
  }, [isPlaying, isScrubbing, scheduleControls, showReactionTray, showSettings])

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

  const seekBy = useCallback((delta: number) => {
    commitSeek(currentTime + delta)
    showGestureFeedback(`${delta > 0 ? '+' : '−'}${Math.abs(delta)} giây`, delta > 0 ? 'right' : 'left')
  }, [commitSeek, currentTime, showGestureFeedback])

  const adjustVolume = useCallback((delta: number) => {
    setMuted(false)
    setVolume((value) => {
      const next = Math.min(1, Math.max(0, value + delta))
      showGestureFeedback(`Âm lượng ${Math.round(next * 100)}%`, 'center')
      return next
    })
  }, [showGestureFeedback])

  const changeRate = useCallback((rate: number) => {
    setUserRate(rate)
    showGestureFeedback(`Tốc độ ${rate}×`, 'center')
  }, [showGestureFeedback])

  const togglePip = useCallback(async () => {
    const video = videoRef.current
    if (!video || !document.pictureInPictureEnabled) return
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else await video.requestPictureInPicture()
    } catch {
      showGestureFeedback('Không mở được cửa sổ nhỏ', 'center')
    }
  }, [showGestureFeedback])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      // Chỉ nhường phím khi người dùng đang gõ chữ thật.
      // Trước đây loại trừ toàn bộ INPUT, mà thanh tua và thanh âm lượng của chính
      // player lại là input → click vào thanh tua một lần là Space chết cho tới khi
      // click ra chỗ khác. Đây chính là lỗi "nhấn Space không play/pause được".
      if (target) {
        if (target.isContentEditable) return
        if (['TEXTAREA', 'SELECT'].includes(target.tagName)) return
        if (target.tagName === 'INPUT') {
          const type = (target as HTMLInputElement).type
          if (!['range', 'checkbox', 'radio', 'button', 'submit'].includes(type)) return
        }
      }

      const key = event.key.toLowerCase()
      const localKeys = ['f', 'm', 'i', '?', 'arrowup', 'arrowdown']
      const isLocal = localKeys.includes(key) || event.key === '?' || event.key === 'Escape'

      // Phím điều khiển phim chỉ dành cho host. Vẫn preventDefault trước khi thoát
      // để Space của guest không cuộn trang.
      if (!isHost && !isLocal) {
        if (key === ' ' || key.startsWith('arrow')) {
          event.preventDefault()
          showGestureFeedback('Host đang điều khiển', 'center')
        }
        return
      }

      switch (true) {
        case key === 'f': event.preventDefault(); toggleFullscreen(); break
        case key === 'm': event.preventDefault(); toggleMute(); break
        case key === 'i': event.preventDefault(); void togglePip(); break
        case event.key === '?': event.preventDefault(); setShowShortcuts((value) => !value); break
        case event.key === 'Escape': setShowShortcuts(false); setShowSettings(false); setShowSpeed(false); setShowReactionTray(false); break
        case event.key === 'ArrowUp': event.preventDefault(); adjustVolume(0.05); break
        case event.key === 'ArrowDown': event.preventDefault(); adjustVolume(-0.05); break
        case key === ' ' || key === 'k': event.preventDefault(); togglePlayback(); break
        case key === 'j': event.preventDefault(); seekBy(-10); break
        case key === 'l': event.preventDefault(); seekBy(10); break
        case event.key === 'ArrowLeft': event.preventDefault(); seekBy(-5); break
        case event.key === 'ArrowRight': event.preventDefault(); seekBy(5); break
        case key === 'n': event.preventDefault(); if (nextEpisode) onNextEpisode?.('next'); break
        case key === 'p': event.preventDefault(); if (previousEpisode) onPreviousEpisode?.(); break
        case event.key === '<' || event.key === ',': {
          event.preventDefault()
          const index = PLAYBACK_RATES.indexOf(userRate as (typeof PLAYBACK_RATES)[number])
          changeRate(PLAYBACK_RATES[Math.max(0, index - 1)])
          break
        }
        case event.key === '>' || event.key === '.': {
          event.preventDefault()
          const index = PLAYBACK_RATES.indexOf(userRate as (typeof PLAYBACK_RATES)[number])
          changeRate(PLAYBACK_RATES[Math.min(PLAYBACK_RATES.length - 1, index + 1)])
          break
        }
        case /^[0-9]$/.test(event.key): {
          event.preventDefault()
          if (duration > 0) {
            const ratio = Number(event.key) / 10
            commitSeek(duration * ratio)
            showGestureFeedback(`${Number(event.key) * 10}%`, 'center')
          }
          break
        }
        default: return
      }
      scheduleControls()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [adjustVolume, changeRate, commitSeek, duration, isHost, nextEpisode, onNextEpisode, onPreviousEpisode, previousEpisode, scheduleControls, seekBy, showGestureFeedback, toggleFullscreen, toggleMute, togglePip, togglePlayback, userRate])

  /** Tốc độ phát do người dùng chọn. Guest để cơ chế đồng bộ tự chỉnh (xem applyRoomPlayback). */
  useEffect(() => {
    const video = videoRef.current
    if (!video || (!standalone && !isHost)) return
    video.playbackRate = holdBoost ? 2 : userRate
  }, [holdBoost, isHost, standalone, userRate, playerState])

  /** Vùng đã tải sẵn, để thanh tua vẽ lớp buffered. */
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const update = () => {
      try {
        const ranges = video.buffered
        for (let index = 0; index < ranges.length; index += 1) {
          if (ranges.start(index) <= video.currentTime && video.currentTime <= ranges.end(index)) {
            setBufferedEnd(ranges.end(index))
            return
          }
        }
        if (ranges.length > 0) setBufferedEnd(ranges.end(ranges.length - 1))
      } catch {
        // buffered không đọc được ở một số nguồn — bỏ qua, chỉ mất lớp hiển thị
      }
    }
    video.addEventListener('progress', update)
    video.addEventListener('timeupdate', update)
    return () => {
      video.removeEventListener('progress', update)
      video.removeEventListener('timeupdate', update)
    }
  }, [sourceVersion])

  /** Trễ 350ms trước khi hiện spinner buffering. */
  useEffect(() => {
    if (playerState !== 'buffering') { setShowBufferSpinner(false); return }
    const timer = window.setTimeout(() => setShowBufferSpinner(true), 350)
    return () => window.clearTimeout(timer)
  }, [playerState])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onEnter = () => setPipActive(true)
    const onLeave = () => setPipActive(false)
    video.addEventListener('enterpictureinpicture', onEnter)
    video.addEventListener('leavepictureinpicture', onLeave)
    return () => {
      video.removeEventListener('enterpictureinpicture', onEnter)
      video.removeEventListener('leavepictureinpicture', onLeave)
    }
  }, [])

  const handleSurfaceClick = () => {
    // Đưa focus về player để phím tắt luôn thuộc về nó, kể cả khi trước đó
    // người dùng vừa bấm một nút khác trên trang.
    rootRef.current?.focus({ preventScroll: true })
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

  // ---- Cử chỉ trên màn cảm ứng --------------------------------------------
  const SWIPE_THRESHOLD = 18

  const handleSurfacePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'touch') return
    gestureRef.current = {
      mode: 'none',
      startX: event.clientX,
      startY: event.clientY,
      startTime: currentTime,
      startVolume: volume,
    }
    if (!isHost) return
    // Giữ 500ms → xem nhanh 2×, nhả tay là về tốc độ cũ.
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current)
    holdTimerRef.current = window.setTimeout(() => {
      if (gestureRef.current?.mode === 'none' && !videoRef.current?.paused) {
        setHoldBoost(true)
        showGestureFeedback('2× ▶▶', 'center')
      }
    }, 500)
  }

  const handleSurfacePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const gesture = gestureRef.current
    if (event.pointerType !== 'touch' || !gesture) return
    const deltaX = event.clientX - gesture.startX
    const deltaY = event.clientY - gesture.startY

    if (gesture.mode === 'none') {
      if (Math.abs(deltaX) < SWIPE_THRESHOLD && Math.abs(deltaY) < SWIPE_THRESHOLD) return
      if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current)
      gesture.mode = Math.abs(deltaX) > Math.abs(deltaY) ? 'seek' : 'volume'
      if (gesture.mode === 'seek' && (!isHost || !duration)) gesture.mode = 'none'
    }

    if (gesture.mode === 'volume') {
      const rect = event.currentTarget.getBoundingClientRect()
      // Chỉ nửa phải chỉnh âm lượng, để dành nửa trái cho thao tác khác.
      if (gesture.startX - rect.left < rect.width / 2) return
      const next = Math.min(1, Math.max(0, gesture.startVolume - deltaY / rect.height))
      setMuted(false)
      setVolume(next)
      showGestureFeedback(`Âm lượng ${Math.round(next * 100)}%`, 'center')
    } else if (gesture.mode === 'seek') {
      const rect = event.currentTarget.getBoundingClientRect()
      // Kéo hết chiều ngang màn hình = 90 giây.
      const next = Math.min(duration, Math.max(0, gesture.startTime + (deltaX / rect.width) * 90))
      setScrubTime(next)
      setIsScrubbing(true)
      showGestureFeedback(`${formatTime(next)} (${next >= gesture.startTime ? '+' : '−'}${Math.abs(Math.round(next - gesture.startTime))}s)`, 'center')
    }
  }

  const handleSurfacePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'touch') return
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current)
    if (holdBoost) setHoldBoost(false)
    const gesture = gestureRef.current
    if (gesture?.mode === 'seek') {
      commitSeek(scrubTime)
      setIsScrubbing(false)
    }
    gestureRef.current = null
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

  if (!episode) return <div className="flex h-full min-h-80 items-center justify-center bg-black text-fg-secondary">Chưa có tập phim để phát.</div>
  if (playerState === 'fallback_embed') return <div ref={rootRef} className={cn('relative w-full bg-black', fillContainer ? 'h-full' : 'aspect-video h-full')}>
    <iframe src={episode.linkEmbed} title={episode.name} className="h-full w-full border-0" allowFullScreen allow="autoplay; encrypted-media; picture-in-picture" />
    <div className="absolute left-3 top-3 max-w-md rounded-lg border border-rating/40 bg-black/90 px-3 py-2 text-sm text-rating">{sourceError || 'Nguồn này chỉ hỗ trợ đồng bộ giới hạn. Chat, reaction và đổi tập vẫn hoạt động.'}</div>
    <div className="absolute bottom-3 right-3 flex gap-2">
      {!standalone && onToggleChat && <Button size="icon" variant="outline" aria-label={chatOpen ? 'Ẩn chat' : 'Hiện chat'} onClick={onToggleChat} className="relative h-11 w-11 rounded-full border-white/20 bg-black/60 text-fg hover:bg-white/20"><MessageCircle className="h-5 w-5" />{unreadCount > 0 && <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold">{Math.min(unreadCount, 99)}</span>}</Button>}
      <Button size="icon" variant="outline" aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'} onClick={toggleFullscreen} className="h-11 w-11 rounded-full border-white/20 bg-black/60 text-fg hover:bg-white/20">{isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}</Button>
    </div>
  </div>

  const connectionText = !isConnected ? 'Mất kết nối' : roomStatus === 'host_reconnecting' ? 'Host đang kết nối lại' : playerState === 'buffering' ? 'Đang tải dữ liệu' : playerState === 'playing' || playerState === 'ready' ? 'Đã đồng bộ' : 'Đang bắt kịp'
  const controlsAreVisible = controlsVisible || !isPlaying
  // Nút trong suốt trên nền phim, nhún nhẹ khi bấm. Vùng bấm giữ 44px.
  const iconButtonClass = 'rounded-full border-0 bg-transparent text-fg shadow-none hover:bg-fg/15 hover:text-fg focus-visible:ring-offset-0 disabled:opacity-35'
  const primaryButtonClass = 'rounded-full bg-fg text-black shadow-none hover:bg-fg/85 focus-visible:ring-offset-0 disabled:opacity-35'
  const panelClass = 'absolute bottom-[4.75rem] right-3 z-40 w-[min(18rem,calc(100%-1.5rem))] rounded-lg border border-white/12 bg-surface-1/95 p-2 shadow-raised backdrop-blur-md sm:right-4'
  const chipClass = 'min-h-9 rounded-md border border-border px-3 text-xs font-medium text-fg-secondary transition-colors hover:border-fg/25 hover:text-fg'
  const chipActiveClass = 'border-accent bg-accent/20 text-fg'
  const pipSupported = typeof document !== 'undefined' && document.pictureInPictureEnabled

  return <div
    ref={rootRef}
    tabIndex={-1}
    className={cn('group relative w-full overflow-hidden bg-black text-fg outline-none', fillContainer ? 'h-full min-h-0' : 'aspect-video h-full', !controlsAreVisible && 'cursor-none')}
    onPointerMove={scheduleControls}
    onPointerDown={scheduleControls}
    onFocusCapture={scheduleControls}
    onMouseLeave={() => { if (isPlaying) scheduleControls() }}
  >
      <video ref={videoRef} poster={poster} className="h-full w-full bg-black object-contain" playsInline preload="metadata"
      onLoadedMetadata={() => { const video = videoRef.current; if (video) { setDuration(Number.isFinite(video.duration) ? video.duration : 0); if (!standalone) void applyRoomPlayback() } }}
      onWaiting={() => setPlayerState('buffering')}
      onCanPlay={(event) => {
        const nextState = event.currentTarget.paused ? 'ready' : 'playing'
        setPlayerState((state) => state === 'autoplay_blocked' ? state : nextState)
      }}
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

    <button
      type="button"
      aria-label={isHost ? 'Nhấn để phát hoặc tạm dừng; nhấn đúp hai bên để tua 10 giây' : 'Hiện điều khiển video'}
      className={cn('absolute inset-0 z-10 touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent', controlsAreVisible ? 'cursor-default' : 'cursor-none')}
      onClick={handleSurfaceClick}
      onDoubleClick={handleSurfaceDoubleClick}
      onPointerDown={handleSurfacePointerDown}
      onPointerMove={handleSurfacePointerMove}
      onPointerUp={handleSurfacePointerUp}
      onPointerCancel={handleSurfacePointerUp}
    />

    {!standalone && <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-live="polite">
      {reactions.map((reaction, index) => <div key={reaction.id} className="watch-party-reaction absolute flex -translate-x-1/2 flex-col items-center" style={{ left: `${16 + (index * 17) % 68}%`, bottom: `${23 + (index * 9) % 33}%` }}>
        <span className="text-4xl drop-shadow-lg sm:text-5xl">{reaction.emoji}</span>
        <span className="mt-1 max-w-28 truncate rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium text-fg/90">{reaction.displayName}</span>
      </div>)}
    </div>}

    {gestureFeedback && <div className={cn('pointer-events-none absolute top-1/2 z-30 -translate-y-1/2 rounded-full bg-black/65 px-5 py-4 text-center font-semibold shadow-xl', gestureFeedback.side === 'left' ? 'left-[18%]' : gestureFeedback.side === 'right' ? 'right-[18%]' : 'left-1/2 -translate-x-1/2')}>
      {gestureFeedback.side === 'center' && (gestureFeedback.label === 'Phát' ? <Play className="mx-auto mb-1 h-7 w-7 fill-current" /> : <Pause className="mx-auto mb-1 h-7 w-7 fill-current" />)}
      <span className="text-xs sm:text-sm">{gestureFeedback.label}</span>
    </div>}

    {!standalone && <div className={cn('absolute left-3 top-3 z-30 flex items-center rounded-full bg-black/65 px-3 py-1.5 text-xs transition-opacity duration-200', controlsAreVisible ? 'opacity-100' : 'opacity-0')} aria-live="polite">
      <span className={cn('mr-2 inline-block h-2 w-2 rounded-full', connectionText === 'Đã đồng bộ' ? 'bg-ok' : !isConnected ? 'bg-bad' : 'bg-rating')} />{connectionText}
    </div>}
    {!standalone && !isHost && <div className={cn('absolute right-3 top-3 z-30 hidden items-center rounded-full bg-black/65 px-3 py-1.5 text-xs transition-opacity duration-200 sm:flex', controlsAreVisible ? 'opacity-100' : 'opacity-0')}><LockKeyhole className="mr-1.5 h-3.5 w-3.5" />Host đang điều khiển</div>}
    {!standalone && speakingMembers.length > 0 && <div className="pointer-events-none absolute right-3 top-12 z-30 flex max-w-[70%] flex-wrap justify-end gap-2" aria-live="polite">
      {speakingMembers.slice(0, 4).map((member) => <div key={member.memberId} className="flex items-center gap-2 rounded-full border border-ok/70 bg-black/75 py-1 pl-1 pr-2 shadow-lg"><span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-accent/30 text-xs font-bold ring-2 ring-ok">{memberInitials(member.displayName)}{member.avatar && <img src={member.avatar} alt="" referrerPolicy="no-referrer" onError={(event) => event.currentTarget.remove()} className="absolute inset-0 h-full w-full object-cover" />}</span><span className="max-w-24 truncate text-xs font-medium">{member.displayName}</span><AudioLines className="h-3.5 w-3.5 text-ok" /></div>)}
    </div>}

    {!standalone && commandError && <div role="status" className="absolute left-1/2 top-3 z-40 max-w-[80%] -translate-x-1/2 rounded-full border border-rating/30 bg-black/85 px-3 py-1.5 text-center text-xs text-rating">
      {commandError === 'DISCONNECTED' ? 'Mất kết nối phòng.' : commandError === 'TIMEOUT' ? 'Phòng phản hồi quá lâu. Hãy thử lại.' : commandError === 'HOST_ONLY' ? 'Chỉ host được điều khiển phim.' : 'Thao tác chưa thực hiện được.'}
    </div>}

    {(playerState === 'loading_manifest' || playerState === 'loading_media') && <div role="status" aria-live="polite" className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/70">
      <span className="h-12 w-12 animate-spin rounded-full border-[3px] border-accent border-t-transparent motion-reduce:animate-none" aria-hidden />
      <span className="text-sm text-fg-secondary">Đang tải nguồn phim…</span>
      {allowIframeFallback && episode.linkEmbed && <Button size="sm" variant="outline" onClick={() => useFallbackOrFail('Đã chuyển sang trình phát dự phòng theo yêu cầu.')} className="text-xs">Chuyển sang trình phát dự phòng</Button>}
    </div>}

    {showBufferSpinner && <div role="status" aria-live="polite" className="pointer-events-none absolute left-1/2 top-1/2 z-40 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
      <span className="h-14 w-14 animate-spin rounded-full border-[3px] border-accent border-t-transparent motion-reduce:animate-none" aria-hidden />
      <span className="sr-only">Đang tải đoạn phim</span>
    </div>}

    {playerState === 'autoplay_blocked' && <Button onClick={() => void applyRoomPlayback()} className="absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 rounded-full">Bấm để bắt kịp phòng</Button>}

    {playerState === 'fatal_error' && <div role="alert" className="absolute inset-0 z-40 flex items-center justify-center bg-black/88 p-6 text-center">
      <div className="max-w-sm">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-warn" aria-hidden />
        <p className="mb-1 font-semibold text-fg">Không phát được nguồn này</p>
        <p className="mb-5 text-sm text-fg-muted">{sourceError || 'Nguồn phim không phản hồi. Thử lại hoặc đổi sang máy chủ khác.'}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button className="rounded-full" onClick={() => { setDeliveryAttempt({ episodeId: episode?.id || '', index: 0 }); setSourceVersion((value) => value + 1) }}>
            <RefreshCw className="h-4 w-4" aria-hidden />Thử lại
          </Button>
          {onRequestServerChange && <Button variant="outline" className="rounded-full" onClick={onRequestServerChange}>
            <ServerCog className="h-4 w-4" aria-hidden />Đổi máy chủ
          </Button>}
        </div>
      </div>
    </div>}

    {showShortcuts && <PlayerShortcuts onClose={() => setShowShortcuts(false)} />}

    {!standalone && showReactionTray && <div className="absolute bottom-[5.6rem] right-3 z-40 flex max-w-[calc(100%-1.5rem)] items-center gap-1 rounded-xl border border-white/10 bg-black/85 p-1.5 shadow-2xl backdrop-blur-sm sm:bottom-24 sm:right-4">
      {reactionOptions.map((emoji) => <button key={emoji} type="button" aria-label={`Gửi reaction ${emoji}`} disabled={!isConnected} onClick={() => { onSendReaction?.(emoji); setShowReactionTray(false); scheduleControls() }} className="flex h-10 w-10 items-center justify-center rounded-lg text-xl transition duration-200 hover:-translate-y-0.5 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong disabled:opacity-40 sm:h-11 sm:w-11">{emoji}</button>)}
      {reactionError && <span className="absolute -top-8 right-0 whitespace-nowrap rounded-full bg-black/90 px-2 py-1 text-xs text-rating">{reactionError}</span>}
    </div>}

    {showSettings && <div className={panelClass}>
      <div className="mb-2 flex items-center justify-between px-1"><span className="text-sm font-semibold">Cài đặt phát</span><button type="button" onClick={() => setShowSettings(false)} aria-label="Đóng cài đặt" className="flex h-9 w-9 items-center justify-center rounded-full text-fg-secondary hover:bg-surface-3 hover:text-fg">✕</button></div>
      {onToggleAutoNext && <button type="button" disabled={!isHost} aria-pressed={autoNextEnabled} onClick={onToggleAutoNext} className="flex min-h-11 w-full items-center justify-between rounded-md px-2 text-sm hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-60"><span>Tự động chuyển tập</span><span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', autoNextEnabled ? 'bg-ok/20 text-ok' : 'bg-fg/10 text-fg-muted')}>{autoNextEnabled ? 'BẬT' : 'TẮT'}</span></button>}
      {onRequestServerChange && <button type="button" onClick={() => { setShowSettings(false); onRequestServerChange() }} className="flex min-h-11 w-full items-center justify-between rounded-md px-2 text-sm hover:bg-surface-3"><span>Đổi máy chủ phát</span><ServerCog className="h-4 w-4 text-fg-muted" aria-hidden /></button>}
      <div className="mt-2 border-t border-border pt-2">
        <p className="px-2 pb-2 text-xs text-fg-muted">Chất lượng</p>
        <div className="flex flex-wrap gap-2 px-1">
          <button type="button" aria-pressed={qualityLevel === -1} onClick={() => selectQuality(-1)} className={cn(chipClass, qualityLevel === -1 && chipActiveClass)}>Tự động</button>
          {qualityOptions.map((option) => <button key={option.index} type="button" aria-pressed={qualityLevel === option.index} onClick={() => selectQuality(option.index)} className={cn(chipClass, qualityLevel === option.index && chipActiveClass)}>{option.label}</button>)}
        </div>
        {qualityOptions.length === 0 && <p className="mt-2 px-2 text-xs text-fg-muted">Trình duyệt đang tự chọn chất lượng.</p>}
      </div>
    </div>}

    {showSpeed && <div className={panelClass}>
      <p className="px-2 pb-2 text-xs text-fg-muted">Tốc độ phát</p>
      <div className="flex flex-wrap gap-2 px-1">
        {PLAYBACK_RATES.map((rate) => <button key={rate} type="button" aria-pressed={userRate === rate} disabled={!standalone && !isHost} onClick={() => { changeRate(rate); setShowSpeed(false) }} className={cn(chipClass, userRate === rate && chipActiveClass, !standalone && !isHost && 'cursor-not-allowed opacity-50')}>{rate === 1 ? 'Chuẩn' : `${rate}×`}</button>)}
      </div>
      {!standalone && !isHost && <p className="mt-2 px-2 text-xs text-fg-muted">Chỉ host đổi được tốc độ, để cả phòng xem khớp nhau.</p>}
    </div>}

    <div className={cn('absolute inset-x-0 bottom-0 z-30 safe-x bg-gradient-to-t from-black via-black/80 to-transparent px-3 pb-2 pt-14 transition-opacity duration-200 motion-reduce:transition-none sm:px-4 sm:pb-3', controlsAreVisible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0')}>
      <div className="mb-0.5 flex items-center justify-between gap-3 text-xs sm:text-sm">
        <span className="truncate font-medium">{episode.name}</span>
        <span className="hidden shrink-0 text-xs text-fg-muted sm:inline">{episode.serverName}</span>
      </div>

      <PlayerSeekBar
        currentTime={isScrubbing ? scrubTime : currentTime}
        duration={duration}
        bufferedEnd={bufferedEnd}
        disabled={!isHost || !duration || !isConnected}
        disabledReason={!isHost ? 'Host đang điều khiển' : undefined}
        previewUrl={hlsCandidates[deliveryIndex]}
        onScrubStart={() => { scrubbingRef.current = true; setIsScrubbing(true); setScrubTime(currentTime) }}
        onScrubMove={(time) => setScrubTime(time)}
        onScrubCommit={(time) => { commitSeek(time); scrubbingRef.current = false; setIsScrubbing(false) }}
      />

      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-0.5 sm:gap-1">
          <Button size="icon-lg" iconSize="lg" aria-label={isPlaying ? 'Tạm dừng' : 'Phát'} title={!isHost ? 'Host đang điều khiển' : isPlaying ? 'Tạm dừng (Space)' : 'Phát (Space)'} disabled={!isHost || !isConnected || playerState === 'fatal_error'} onClick={togglePlayback} className={primaryButtonClass}>{isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current" />}</Button>
          <Button size="icon-lg" iconSize="xl" variant="ghost" aria-label="Lùi 10 giây" title="Lùi 10 giây (J)" disabled={!isHost || !isConnected || !duration} onClick={() => seekBy(-10)} className={iconButtonClass}><SeekIcon direction="back" /></Button>
          <Button size="icon-lg" iconSize="xl" variant="ghost" aria-label="Tiến 10 giây" title="Tiến 10 giây (L)" disabled={!isHost || !isConnected || !duration} onClick={() => seekBy(10)} className={iconButtonClass}><SeekIcon direction="forward" /></Button>
          {onPreviousEpisode && <Button size="icon-lg" variant="ghost" aria-label="Tập trước" title="Tập trước (P)" disabled={!isHost || !previousEpisode || !isConnected} onClick={onPreviousEpisode} className={cn(iconButtonClass, 'hidden sm:inline-flex')}><SkipBack /></Button>}
          <Button size="icon-lg" variant="ghost" aria-label="Tập kế" title={nextEpisode ? `Chuyển sang ${nextEpisode.name} (N)` : 'Đây là tập cuối'} disabled={!isHost || !nextEpisode || !isConnected} onClick={() => onNextEpisode?.('next')} className={iconButtonClass}><SkipForward /></Button>

          {/* Slider âm lượng trượt ra khi rê vào nhóm — gọn mà vẫn dùng được bằng chuột. */}
          <div className="group/volume hidden items-center sm:flex">
            <Button size="icon-lg" variant="ghost" aria-label={muted ? 'Bật tiếng phim' : 'Tắt tiếng phim'} title={muted ? 'Bật tiếng (M)' : 'Tắt tiếng (M)'} onClick={toggleMute} className={iconButtonClass}>{muted || volume === 0 ? <VolumeX /> : volume < 0.5 ? <Volume1 /> : <Volume2 />}</Button>
            {volumeWritable && <input aria-label="Âm lượng" type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={(event) => { setMuted(false); setVolume(Number(event.target.value)) }} className="h-1 w-0 cursor-pointer accent-accent opacity-0 transition-[width,opacity] duration-200 group-hover/volume:ml-1 group-hover/volume:w-20 group-hover/volume:opacity-100 focus:ml-1 focus:w-20 focus:opacity-100 motion-reduce:transition-none" />}
          </div>

          <span className="ml-1.5 whitespace-nowrap font-mono text-xs text-fg/90">
            {formatTime(isScrubbing ? scrubTime : currentTime)}
            <span className="hidden text-fg/45 min-[360px]:inline"> / {formatTime(duration)}</span>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          {!standalone && onToggleMic && <Button size="icon-lg" variant="ghost" aria-label={micEnabled ? 'Tắt mic' : 'Bật mic'} aria-pressed={micEnabled} title={voiceEnabled ? (micEnabled ? 'Tắt mic' : 'Bật mic') : 'Host chưa mở voice'} disabled={!voiceEnabled} onClick={onToggleMic} className={cn(iconButtonClass, micEnabled && 'bg-ok/25 text-ok')}>{micEnabled ? <Mic /> : <MicOff />}</Button>}
          {!standalone && onToggleSpeaker && <Button size="icon-lg" variant="ghost" aria-label={speakerEnabled ? 'Tắt tiếng phòng' : 'Bật tiếng phòng'} aria-pressed={speakerEnabled} disabled={!voiceEnabled} onClick={onToggleSpeaker} className={cn(iconButtonClass, 'hidden sm:inline-flex')}>{speakerEnabled ? <Headphones /> : <VolumeX />}</Button>}
          {!standalone && <Button size="icon-lg" variant="ghost" aria-label="Đồng bộ lại" title="Đồng bộ lại với phòng" onClick={() => void applyRoomPlayback()} className={cn(iconButtonClass, 'hidden md:inline-flex')}><RefreshCw /></Button>}
          {!standalone && onSendReaction && <Button size="icon-lg" variant="ghost" aria-label={showReactionTray ? 'Ẩn reaction' : 'Gửi reaction'} onClick={() => { setShowReactionTray((value) => !value); setShowSettings(false); setShowSpeed(false); setControlsVisible(true) }} className={cn(iconButtonClass, showReactionTray && 'bg-fg/20')}><SmilePlus /></Button>}
          {!standalone && onToggleChat && <Button size="icon-lg" variant="ghost" aria-label={chatOpen ? 'Ẩn chat' : 'Hiện chat'} onClick={onToggleChat} className={cn(iconButtonClass, 'relative', chatOpen && 'bg-fg/20')}><MessageCircle />{unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-accent-fg">{Math.min(unreadCount, 99)}</span>}</Button>}

          <Button size="icon-lg" variant="ghost" aria-label="Tốc độ phát" aria-expanded={showSpeed} title={`Tốc độ ${userRate}× (< >)`} onClick={() => { setShowSpeed((value) => !value); setShowSettings(false); setShowReactionTray(false); setControlsVisible(true) }} className={cn(iconButtonClass, 'relative hidden sm:inline-flex', showSpeed && 'bg-fg/20')}>
            <Gauge />
            {userRate !== 1 && <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-accent px-1 text-[0.625rem] font-bold leading-tight text-accent-fg">{userRate}×</span>}
          </Button>
          <Button size="icon-lg" variant="ghost" aria-label="Cài đặt phát" aria-expanded={showSettings} onClick={() => { setShowSettings((value) => !value); setShowReactionTray(false); setShowSpeed(false); setControlsVisible(true) }} className={cn(iconButtonClass, showSettings && 'bg-fg/20')}><Settings /></Button>
          {pipSupported && <Button size="icon-lg" variant="ghost" aria-label="Cửa sổ nhỏ" title="Cửa sổ nhỏ (I)" aria-pressed={pipActive} onClick={() => void togglePip()} className={cn(iconButtonClass, 'hidden lg:inline-flex', pipActive && 'bg-fg/20')}><PictureInPicture2 /></Button>}
          <Button size="icon-lg" variant="ghost" aria-label="Phím tắt" title="Phím tắt (?)" onClick={() => setShowShortcuts(true)} className={cn(iconButtonClass, 'hidden lg:inline-flex')}><Keyboard /></Button>
          <Button size="icon-lg" variant="ghost" aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'} title={isFullscreen ? 'Thoát toàn màn hình (F)' : 'Toàn màn hình (F)'} onClick={toggleFullscreen} className={iconButtonClass}>{isFullscreen ? <Minimize /> : <Maximize />}</Button>
        </div>
      </div>
    </div>
  </div>
}
