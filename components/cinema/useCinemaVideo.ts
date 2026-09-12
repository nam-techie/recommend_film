'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { watchPartyHlsCandidates } from '@/lib/media-url'
import { projectedPlaybackTime } from '@/lib/watch-sync'
import type { WatchPartyEpisode, WatchPartyPlayback } from '@/lib/watch-party-types'

export interface CinemaPlayback {
  episode?: WatchPartyEpisode; playback: WatchPartyPlayback; clockOffset: number; isHost: boolean; connected: boolean
  onPlaybackUpdate: (payload: { episodeId: string; currentTime: number; isPlaying: boolean; action: 'play' | 'pause' | 'seek' | 'heartbeat' }) => void
}
export function useCinemaVideo(media?: CinemaPlayback) {
  const latest = useRef(media); latest.current = media
  const element = useRef<HTMLVideoElement | null>(null)
  const syncRef = useRef<() => void>(() => {})
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'playing' | 'blocked' | 'error'>('idle')
  const [error, setError] = useState(''), [muted, setMuted] = useState(true), [version, setVersion] = useState(0)
  const source = media?.episode?.linkM3u8
  useEffect(() => {
    if (!source) { setVideo(null); setStatus('idle'); return }
    let disposed = false, hls: Hls | null = null, index = 0, timeout = 0, recovering = false
    let appliedRevision = -1, lastSeek = 0, blocked = false, attemptingPlay = false, fatal = false
    const candidates = watchPartyHlsCandidates(source)
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'; video.playsInline = true; video.muted = true; video.preload = 'auto'
    video.setAttribute('aria-hidden', 'true'); video.tabIndex = -1
    Object.assign(video.style, { position: 'fixed', width: '1px', height: '1px', left: '-4px', top: '0', opacity: '0', pointerEvents: 'none' })
    document.body.appendChild(video); element.current = video; setVideo(video); setMuted(true); setError(''); setStatus('loading')
    const fail = (message: string) => { fatal = true; window.clearTimeout(timeout); video.pause(); if (!disposed) { setError(message); setStatus('error') } }
    const sync = () => {
      const current = latest.current
      if (disposed || fatal || !current || video.readyState < 1) return
      const state = current.playback
      let target = projectedPlaybackTime(state.currentTime, state.isPlaying, state.serverUpdatedAt, current.clockOffset)
      if (Number.isFinite(video.duration)) target = Math.min(target, Math.max(0, video.duration - 0.1))
      else if (video.seekable.length) target = Math.max(video.seekable.start(0), Math.min(target, video.seekable.end(video.seekable.length - 1) - 0.1))
      const delta = target - video.currentTime
      const explicit = state.revision !== appliedRevision && ['seek', 'episode_change'].includes(state.action || '')
      if (appliedRevision < 0 || explicit || Math.abs(delta) > 1.5 && Date.now() - lastSeek > 8000) {
        try { video.currentTime = Math.max(0, target); lastSeek = Date.now() } catch { /* Wait for the seekable range. */ }
      }
      appliedRevision = state.revision
      video.playbackRate = Math.abs(delta) > 0.3 && Math.abs(delta) < 1.5 ? delta > 0 ? 1.04 : 0.96 : 1
      if (!state.isPlaying) { video.pause(); if (!blocked) setStatus('ready'); return }
      if (video.paused && !blocked && !attemptingPlay) {
        attemptingPlay = true
        void video.play().catch(reason => { if (!disposed) { blocked = true; setStatus('blocked'); if (reason?.name !== 'NotAllowedError' && reason?.name !== 'AbortError') setError('Chưa phát được video. Hãy chạm để thử lại.') } }).finally(() => { attemptingPlay = false })
      }
    }
    syncRef.current = sync
    const start = () => {
      window.clearTimeout(timeout); hls?.destroy(); hls = null; recovering = false; blocked = false; fatal = false; appliedRevision = -1
      video.pause(); video.removeAttribute('src'); video.load()
      const url = candidates[index]
      if (!url) { fail('Nguồn phim chưa phát được trên màn 3D. Bạn có thể quay lại trình phát chính.'); return }
      setStatus('loading'); setError('')
      timeout = window.setTimeout(() => { if (!disposed && video.readyState < 2) { index++; start() } }, 15000)
      if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: true, maxBufferLength: 15, backBufferLength: 8, capLevelToPlayerSize: false })
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!hls || disposed) return
          const ceiling = hls.levels.reduce((chosen, level, i) => level.height <= 1080 ? i : chosen, -1)
          if (ceiling >= 0) hls.autoLevelCapping = ceiling
          sync()
        })
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (disposed || !data.fatal) return
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !recovering) { recovering = true; hls?.recoverMediaError(); return }
          index++; start()
        })
        hls.loadSource(url); hls.attachMedia(video)
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) { video.src = url; video.load() }
      else fail('Trình duyệt này chưa hỗ trợ phát nguồn phim trong rạp 3D.')
    }
    const ready = () => { window.clearTimeout(timeout); if (!disposed) { setStatus(video.paused ? 'ready' : 'playing'); sync() } }
    const playing = () => { blocked = false; if (!disposed) setStatus('playing') }
    const errorEvent = () => { if (!hls && !disposed) { index++; start() } }
    const visibility = () => { if (document.visibilityState === 'visible') sync() }
    video.addEventListener('loadedmetadata', sync); video.addEventListener('loadeddata', ready); video.addEventListener('playing', playing); video.addEventListener('error', errorEvent)
    document.addEventListener('visibilitychange', visibility)
    const timer = window.setInterval(sync, 2000)
    start()
    return () => {
      disposed = true; syncRef.current = () => {}; window.clearInterval(timer); window.clearTimeout(timeout)
      document.removeEventListener('visibilitychange', visibility)
      video.removeEventListener('loadedmetadata', sync); video.removeEventListener('loadeddata', ready); video.removeEventListener('playing', playing); video.removeEventListener('error', errorEvent)
      hls?.destroy(); video.pause(); video.removeAttribute('src'); video.load(); video.remove(); element.current = null
    }
  }, [source, media?.episode?.id, version])
  useEffect(() => { syncRef.current() }, [media?.playback.revision, media?.clockOffset])
  const resume = useCallback(async () => {
    const video = element.current
    if (!video) return
    try { await video.play(); setError(''); setStatus('playing') } catch { setStatus('blocked'); setError('Trình duyệt chưa cho phép phát. Chạm để thử lại.') }
  }, [])
  const toggleSound = useCallback(async () => {
    const video = element.current
    if (!video) return
    video.muted = !video.muted; setMuted(video.muted)
    if (latest.current?.playback.isPlaying) await resume()
  }, [resume])
  const toggleRoomPlayback = useCallback(() => {
    const current = latest.current, video = element.current
    if (!current?.isHost || !current.connected || !current.episode) return
    const playing = !current.playback.isPlaying
    current.onPlaybackUpdate({ episodeId: current.episode.id, currentTime: video && video.readyState >= 1 ? video.currentTime : current.playback.currentTime, isPlaying: playing, action: playing ? 'play' : 'pause' })
    if (playing) void resume()
  }, [resume])
  const seekBy = useCallback((seconds: number) => {
    const current = latest.current, video = element.current
    if (!current?.isHost || !current.connected || !current.episode || !video || video.readyState < 1) return
    const limit = Number.isFinite(video.duration) ? Math.max(0, video.duration - 0.1) : Infinity
    const target = Math.min(limit, Math.max(0, video.currentTime + seconds))
    current.onPlaybackUpdate({ episodeId: current.episode.id, currentTime: target, isPlaying: current.playback.isPlaying, action: 'seek' })
  }, [])
  const adjustVolume = useCallback((delta: number) => {
    const video = element.current
    if (!video) return null
    video.volume = Math.min(1, Math.max(0, (video.muted ? 0 : video.volume) + delta))
    video.muted = video.volume === 0
    setMuted(video.muted)
    return Math.round(video.volume * 100)
  }, [])
  const seekToRatio = useCallback((ratio: number) => {
    const video = element.current
    if (video && Number.isFinite(video.duration) && video.duration > 0) seekBy(video.duration * ratio - video.currentTime)
  }, [seekBy])
  const resync = useCallback(() => {
    const current = latest.current, video = element.current
    if (!current || !video || video.readyState < 1) return
    const target = projectedPlaybackTime(current.playback.currentTime, current.playback.isPlaying, current.playback.serverUpdatedAt, current.clockOffset)
    const limit = Number.isFinite(video.duration) ? Math.max(0, video.duration - 0.1) : Infinity
    try { video.currentTime = Math.min(limit, Math.max(0, target)); syncRef.current() } catch { /* Wait for a seekable range. */ }
  }, [])
  return { adjustVolume, seekToRatio, seekBy, resync, video, status, error, muted, resume, toggleSound, toggleRoomPlayback, retry: () => setVersion(value => value + 1), available: Boolean(source) }
}
