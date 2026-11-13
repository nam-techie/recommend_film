'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { monitorKaraokeTrack, SIGNAL_BANDS, type SignalState, type SignalFrame } from '@/lib/karaoke-audio-meter'
import styles from './KaraokeStage.module.css'

const labels: Record<SignalState, string> = { off: 'Mic đang tắt', waiting: 'Đang chờ tín hiệu', receiving: 'Đang nhận âm', silent: 'Chưa thấy tín hiệu', unavailable: 'Không có biểu đồ âm thanh' }
export function MicSignalPanel({ track, own, pending, micError, stageRef }: { track: MediaStreamTrack | null; own: boolean; pending: boolean; micError: string; stageRef: RefObject<HTMLDivElement> }) {
  const canvas = useRef<HTMLCanvasElement>(null), meter = useRef<HTMLMeterElement>(null), readout = useRef<HTMLOutputElement>(null)
  const [state, setState] = useState<SignalState>('off')
  useEffect(() => {
    const context = canvas.current?.getContext('2d'), element = canvas.current
    const palette = element ? getComputedStyle(element) : null
    const signalColor = palette?.getPropertyValue('--stage-signal').trim() || 'transparent'
    const idleColor = palette?.getPropertyValue('--stage-raised').trim() || 'transparent'
    const draw = (frame: SignalFrame) => {
      setState(previous => previous === frame.state ? previous : frame.state)
      stageRef.current?.style.setProperty('--signal-level', String(frame.state === 'receiving' ? frame.level : 0))
      if (meter.current) meter.current.value = frame.level
      if (readout.current) readout.current.value = Number.isFinite(frame.db) ? `${Math.round(frame.db)} dBFS` : '−∞ dBFS'
      if (!context || !element) return
      const width = element.width, height = element.height, gap = 5, bar = (width - gap * (SIGNAL_BANDS - 1)) / SIGNAL_BANDS
      context.clearRect(0, 0, width, height)
      for (let i = 0; i < SIGNAL_BANDS; i++) {
        const h = Math.max(2, frame.bands[i] * (height - 4))
        context.fillStyle = frame.state === 'receiving' ? signalColor : idleColor
        context.fillRect(i * (bar + gap), height - h, bar, h)
      }
    }
    const rest: SignalFrame = { state: 'off', bands: new Float32Array(SIGNAL_BANDS), db: -Infinity, level: 0 }
    draw(rest)
    if (!track) return () => draw(rest)
    if (!context) { setState('unavailable'); return () => draw(rest) }
    const stop = monitorKaraokeTrack(track, draw)
    return () => { stop(); draw(rest) }
  }, [track, stageRef])
  const status = micError ? 'Âm thanh chưa sẵn sàng' : pending ? 'Đang chờ quyền mic' : labels[state]
  return <section className={styles.signal} aria-label={own ? 'Mic của bạn' : 'Giọng đang nhận'} data-signal={micError ? 'unavailable' : state}>
    <div className={styles.signalHeader}>
      <span className={styles.signalTitle}>{track ? <Mic size={18} aria-hidden="true" /> : <MicOff size={18} aria-hidden="true" />}{own ? 'Mic của bạn' : 'Giọng đang nhận'}</span>
      <span className={styles.signalStatus} role="status">{status}</span>
    </div>
    <canvas ref={canvas} width={800} height={90} className={styles.equalizer} aria-hidden="true" />
    <div className={styles.meterRow}><meter ref={meter} min={0} max={1} value={0} aria-label="Mức tín hiệu âm thanh" /><output ref={readout}>−∞ dBFS</output></div>
    <details className={styles.signalDetails}><summary>Thiết bị & mức âm</summary><p className={styles.fine}>{micError || (state === 'unavailable' ? 'Hát vẫn hoạt động. Trình duyệt chưa hiển thị được biểu đồ.' : own ? track?.label || 'Chuẩn bị mic để kiểm tra thiết bị thu.' : 'Tín hiệu từ microphone của người hát được truyền đến máy này.')}</p>
    {own && track && <p className={styles.fine}>Tín hiệu tại máy bạn; cần bạn bè xác nhận đã nghe được giọng.</p>}
    </details>
    {micError && <p role="alert" className={styles.fine}>{micError}</p>}
  </section>
}
