'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { cn } from '@/lib/utils'

export const formatClock = (seconds = 0) => {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  const pad = (value: number) => value.toString().padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`
}

/** Làm tròn mốc thời gian để nhiều vị trí rê gần nhau dùng chung một khung hình. */
const PREVIEW_BUCKET_SECONDS = 10
const PREVIEW_CACHE_LIMIT = 40
const PREVIEW_DEBOUNCE_MS = 180

interface Props {
  currentTime: number
  duration: number
  /** Mốc cuối của vùng đã tải sẵn, đọc từ video.buffered. */
  bufferedEnd?: number
  disabled?: boolean
  /** Hiện trong tooltip khi bị khoá, ví dụ "Host đang điều khiển tiến độ". */
  disabledReason?: string
  /** URL HLS để dựng khung xem trước. Bỏ trống thì tooltip chỉ có thời gian. */
  previewUrl?: string
  onScrubStart?: () => void
  onScrubMove?: (time: number) => void
  onScrubCommit: (time: number) => void
}

export function PlayerSeekBar({
  currentTime,
  duration,
  bufferedEnd = 0,
  disabled = false,
  disabledReason,
  previewUrl,
  onScrubStart,
  onScrubMove,
  onScrubCommit,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [hoverRatio, setHoverRatio] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)

  const playedRatio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0
  const bufferedRatio = duration > 0 ? Math.min(1, Math.max(0, bufferedEnd / duration)) : 0
  const hoverTime = hoverRatio !== null ? hoverRatio * duration : 0

  const ratioFromEvent = useCallback((clientX: number) => {
    const track = trackRef.current
    if (!track) return 0
    const rect = track.getBoundingClientRect()
    if (rect.width === 0) return 0
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  }, [])

  // ---- Khung xem trước -----------------------------------------------------
  // Nguồn HLS không kèm sprite/VTT nên phải tự dựng: một <video> ẩn thứ hai seek
  // tới mốc đang rê rồi vẽ ra canvas. Chỉ bật trên thiết bị có chuột thật và khi
  // người dùng không bật tiết kiệm dữ liệu.
  const previewVideoRef = useRef<HTMLVideoElement | null>(null)
  const previewHlsRef = useRef<Hls | null>(null)
  const previewCacheRef = useRef(new Map<number, string>())
  const previewTimerRef = useRef<number | null>(null)
  const previewBusyRef = useRef(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [previewSupported, setPreviewSupported] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !previewUrl) return
    const finePointer = window.matchMedia('(pointer: fine)').matches
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    setPreviewSupported(finePointer && !connection?.saveData)
  }, [previewUrl])

  const previewReadyRef = useRef<Promise<HTMLVideoElement | null> | null>(null)

  /**
   * Dựng video ẩn ở lần rê đầu tiên, không tải gì trước đó.
   * Trả về promise chỉ resolve khi đã có metadata — seek trước thời điểm đó thì
   * sự kiện `seeked` không bao giờ bắn và mọi lần rê sau sẽ bị kẹt.
   */
  const ensurePreviewVideo = useCallback(() => {
    if (previewReadyRef.current) return previewReadyRef.current
    if (!previewUrl) return null

    previewReadyRef.current = new Promise<HTMLVideoElement | null>((resolve) => {
      const video = document.createElement('video')
      video.muted = true
      video.preload = 'auto'
      video.playsInline = true
      // Phần tử không gắn vào DOM nên kích thước là 0×0. Phải đặt tay, nếu không
      // hls.js không chọn được level nào và đứng im, không tải gì cả.
      video.width = 320
      video.height = 180
      previewVideoRef.current = video

      let settled = false
      const finish = (value: HTMLVideoElement | null) => {
        if (settled) return
        settled = true
        window.clearTimeout(watchdog)
        resolve(value)
      }
      // Nguồn chậm hoặc chặn: bỏ preview thay vì treo mãi.
      const watchdog = window.setTimeout(() => finish(null), 8000)

      video.addEventListener('loadeddata', () => finish(video), { once: true })
      video.addEventListener('error', () => finish(null), { once: true })

      // Ưu tiên hls.js. Một số bản Chromium khai `canPlayType` trả "maybe" cho
      // m3u8 nhưng gán src thẳng thì báo MEDIA_ERR_SRC_NOT_SUPPORTED ngay.
      if (Hls.isSupported()) {
        // Buffer tối thiểu, chất lượng thấp nhất: chỉ cần đủ giải mã một khung hình.
        const hls = new Hls({ maxBufferLength: 6, maxMaxBufferLength: 10, startLevel: 0 })
        hls.on(Hls.Events.ERROR, (_event, data) => { if (data.fatal) finish(null) })
        hls.loadSource(previewUrl)
        hls.attachMedia(video)
        previewHlsRef.current = hls
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = previewUrl
      } else {
        finish(null)
      }
    })

    return previewReadyRef.current
  }, [previewUrl])

  // Đổi tập/đổi nguồn thì bỏ toàn bộ khung hình đã dựng.
  useEffect(() => () => {
    if (previewTimerRef.current) window.clearTimeout(previewTimerRef.current)
    previewHlsRef.current?.destroy()
    previewHlsRef.current = null
    previewVideoRef.current?.removeAttribute('src')
    previewVideoRef.current = null
    previewReadyRef.current = null
    previewBusyRef.current = false
    previewCacheRef.current.clear()
    setPreviewImage(null)
  }, [previewUrl])

  const requestPreview = useCallback((time: number) => {
    if (!previewSupported || !previewUrl || duration <= 0) return
    const bucket = Math.floor(time / PREVIEW_BUCKET_SECONDS) * PREVIEW_BUCKET_SECONDS
    const cached = previewCacheRef.current.get(bucket)
    if (cached) { setPreviewImage(cached); return }

    if (previewTimerRef.current) window.clearTimeout(previewTimerRef.current)
    previewTimerRef.current = window.setTimeout(async () => {
      if (previewBusyRef.current) return
      previewBusyRef.current = true

      const ready = ensurePreviewVideo()
      const video = ready ? await ready : null
      if (!video) { previewBusyRef.current = false; setPreviewSupported(false); return }

      const captured = await new Promise<string | null>((resolve) => {
        let settled = false
        const finish = (value: string | null) => {
          if (settled) return
          settled = true
          window.clearTimeout(watchdog)
          video.removeEventListener('seeked', onSeeked)
          resolve(value)
        }
        // Nếu segment tại mốc này tải lâu thì bỏ qua, lần rê sau thử lại.
        const watchdog = window.setTimeout(() => finish(null), 4000)
        const onSeeked = () => {
          try {
            const canvas = document.createElement('canvas')
            canvas.width = 160
            canvas.height = 90
            const context = canvas.getContext('2d')
            if (!context || video.videoWidth === 0) { finish(null); return }
            context.drawImage(video, 0, 0, canvas.width, canvas.height)
            finish(canvas.toDataURL('image/jpeg', 0.6))
          } catch {
            // canvas bị nhiễm (CDN không trả CORS) — tắt hẳn preview, giữ tooltip thời gian
            setPreviewSupported(false)
            finish(null)
          }
        }
        video.addEventListener('seeked', onSeeked)
        try { video.currentTime = bucket } catch { finish(null) }
      })

      if (captured) {
        const cache = previewCacheRef.current
        if (cache.size >= PREVIEW_CACHE_LIMIT) cache.delete(cache.keys().next().value as number)
        cache.set(bucket, captured)
        setPreviewImage(captured)
      }
      previewBusyRef.current = false
    }, PREVIEW_DEBOUNCE_MS)
  }, [duration, ensurePreviewVideo, previewSupported, previewUrl])

  // ---- Tương tác con trỏ ---------------------------------------------------
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || duration <= 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const ratio = ratioFromEvent(event.clientX)
    setDragging(true)
    setHoverRatio(ratio)
    onScrubStart?.()
    onScrubMove?.(ratio * duration)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return
    const ratio = ratioFromEvent(event.clientX)
    setHoverRatio(ratio)
    requestPreview(ratio * duration)
    // Chỉ báo cho player khi đang kéo — không phát lệnh seek cho cả phòng lúc rê.
    if (dragging && !disabled) onScrubMove?.(ratio * duration)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    event.currentTarget.releasePointerCapture(event.pointerId)
    setDragging(false)
    if (!disabled && duration > 0) onScrubCommit(ratioFromEvent(event.clientX) * duration)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || duration <= 0) return
    const step = event.shiftKey ? 30 : 5
    let next: number | null = null
    if (event.key === 'ArrowLeft') next = currentTime - step
    else if (event.key === 'ArrowRight') next = currentTime + step
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = duration
    else if (event.key === 'PageUp') next = currentTime + 60
    else if (event.key === 'PageDown') next = currentTime - 60
    if (next === null) return
    // Chặn không cho phím lọt lên window — player cũng lắng nghe mũi tên.
    event.preventDefault()
    event.stopPropagation()
    onScrubCommit(Math.min(duration, Math.max(0, next)))
  }

  const showTooltip = hoverRatio !== null && duration > 0
  const thumbVisible = dragging || hoverRatio !== null

  return (
    <div className="group/seek relative w-full select-none">
      {showTooltip && (
        <div
          className="pointer-events-none absolute bottom-full z-50 mb-3 -translate-x-1/2 overflow-hidden rounded-md border border-white/15 bg-black/90 shadow-raised backdrop-blur-sm"
          style={{ left: `clamp(84px, ${hoverRatio! * 100}%, calc(100% - 84px))` }}
        >
          {previewSupported && previewImage && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={previewImage} alt="" width={160} height={90} className="block h-[90px] w-[160px] object-cover" />
          )}
          <div className="px-2 py-1 text-center font-mono text-xs text-fg">{formatClock(hoverTime)}</div>
          {disabled && disabledReason && <div className="px-2 pb-1 text-center text-xs text-fg-muted">{disabledReason}</div>}
        </div>
      )}

      {/* Vùng bấm cao 20px bao quanh vạch mảnh — ngón tay bấm trúng dễ hơn nhiều. */}
      <div
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="Tiến độ phát"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, Math.round(duration))}
        aria-valuenow={Math.round(currentTime)}
        aria-valuetext={`${formatClock(currentTime)} trên ${formatClock(duration)}`}
        aria-disabled={disabled}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setDragging(false)}
        onPointerLeave={() => { if (!dragging) { setHoverRatio(null); setPreviewImage(null) } }}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex w-full touch-none items-center py-2.5 focus-visible:outline-none',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        )}
      >
        <div
          ref={trackRef}
          className={cn(
            'relative w-full overflow-visible rounded-full bg-fg/20 transition-[height] duration-150 motion-reduce:transition-none',
            dragging || hoverRatio !== null ? 'h-[7px]' : 'h-1',
          )}
        >
          <div className="absolute inset-y-0 left-0 rounded-full bg-fg/30" style={{ width: `${bufferedRatio * 100}%` }} />
          <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${playedRatio * 100}%` }} />
          <div
            className={cn(
              'absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-accent transition-transform duration-150 motion-reduce:transition-none',
              thumbVisible && !disabled ? 'scale-100' : 'scale-0',
            )}
            style={{ left: `${playedRatio * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
