'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { CinemaToolButton } from './CinemaPartyTools'
import { ArrowLeft, Armchair, Check, Expand, RotateCcw, Move3d, MonitorPlay, Play, Pause, Volume2, VolumeX, RotateCw, RefreshCw, Maximize, Minimize, Crown, LockKeyhole, PanelRightClose, PanelRightOpen, Keyboard, X } from 'lucide-react'
import { cinemaLayout, CINEMA_CAPACITY, isVipSeat, CinemaPerson, CinemaSeatSnapshot } from '@/lib/cinema-layout'
import styles from './CinemaRoom.module.css'
import { useCinemaVideo, CinemaPlayback } from './useCinemaVideo'
import type { CinemaView } from './cinema-camera'
import type { CinemaCharacterPreview } from '@/lib/cinema-character'
import type { ChangeCharacter } from '@/lib/cinema-character-sync'
import { useRoomCharacter } from './useRoomCharacter'
import CinemaCharacterPicker from './CinemaCharacterPicker'

const CinemaScene = dynamic(() => import('./CinemaScene'), { ssr: false })
interface Props {
  onCharacterChange?: ChangeCharacter
  characterPreview?: CinemaCharacterPreview; characterPicker?: ReactNode
  onNextEpisode?: () => void; onPreviousEpisode?: () => void; onShowSeats?: () => void; canUseVip?: boolean; overlays?: ReactNode; liveOverlay?: ReactNode; seatSyncError?: string | null; onRetrySeats?: () => void; headerTools?: ReactNode; sidePanel?: ReactNode; notices?: ReactNode; sceneOverlay?: ReactNode
  media?: CinemaPlayback; roomName: string; movieTitle: string; poster?: string; memberId: string; members: CinemaPerson[]
  snapshot: CinemaSeatSnapshot | null; connected: boolean; demo?: boolean; preview?: boolean; canReturn?: boolean
  onConfirm: (seatId: string) => Promise<{ ok: boolean; code?: string }>
  onEnter: () => void; onLeave: () => void
}
const messages: Record<string, string> = {
  ULTRA_REQUIRED: 'Ghế VIP chỉ dành cho tài khoản CinePass Ultra.',
  SEAT_TAKEN: 'Ghế này vừa có người chọn. Bạn chọn một ghế khác nhé.',
  DISCONNECTED: 'Mất kết nối phòng. Hãy đợi kết nối lại rồi xác nhận.',
  TIMEOUT: 'Chưa nhận được xác nhận. Kiểm tra chỗ của bạn trên sơ đồ rồi thử lại.',
  RATE_LIMITED: 'Bạn đổi ghế hơi nhanh. Chờ một chút rồi thử lại.',
  SEAT_SERVICE_UNAVAILABLE: 'Máy chủ chưa xử lý được ghế. Hãy tải lại sơ đồ rồi thử lại.',
  ROOM_NOT_FOUND: 'Phòng không còn khả dụng. Hãy tham gia lại phòng.',
  SCREEN_ONLY: 'Hãy chọn ghế trên thiết bị đang xem phim.',
}
export default function CinemaRoom(props: Props) {

  const ownSeat = Object.entries(props.snapshot?.seats || {}).find(([, id]) => id === props.memberId)?.[0] || null
  const character = useRoomCharacter(Boolean(props.canUseVip), { memberId: props.memberId, gender: props.members.find(member => member.memberId === props.memberId)?.characterGender, connected: props.connected, change: props.onCharacterChange })
  const characterPreview = props.demo ? props.characterPreview : character.preview
  const [selected, setSelected] = useState<string | null>(ownSeat)
  const [view, setView] = useState<CinemaView>('overview')
  const [resetKey, setResetKey] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [showSeats, setShowSeats] = useState(true)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [shortcutFeedback, setShortcutFeedback] = useState('')
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seatPanelId = useId()
  const seatPanelVisible = showSeats && !props.sidePanel
  const [controlsVisible, setControlsVisible] = useState(true)
  const hideControls = useRef<ReturnType<typeof setTimeout> | null>(null)
  const screenFullscreen = expanded && view === 'screen'
  const revealControls = useCallback(() => {
    setControlsVisible(true)
    if (hideControls.current) clearTimeout(hideControls.current)
    hideControls.current = setTimeout(() => setControlsVisible(false), 3000)
  }, [])
  const enterFullscreen = async () => {
    setExpanded(true); setShowSeats(false); revealControls()
    try { if (!document.fullscreenElement) await root.current?.requestFullscreen?.() } catch { /* CSS fullscreen fallback. */ }
  }
  const exitFullscreen = async () => {
    setExpanded(false); revealControls()
    if (document.fullscreenElement === root.current) await document.exitFullscreen().catch(() => undefined)
  }
  useEffect(() => {
    const changed = () => { if (!document.fullscreenElement) setExpanded(false) }
    document.addEventListener('fullscreenchange', changed)
    return () => { document.removeEventListener('fullscreenchange', changed); if (hideControls.current) clearTimeout(hideControls.current) }
  }, [])
  useEffect(() => {
    if (!expanded) return
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = overflow }
  }, [expanded])
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false)
  useEffect(() => {
    revealControls()
    return () => { if (hideControls.current) clearTimeout(hideControls.current) }
  }, [revealControls, view, expanded, ready])
  const projection = useCinemaVideo(failed ? undefined : props.media)
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const capacity = CINEMA_CAPACITY, seats = props.snapshot?.seats || {}
  const picked = selected || ownSeat
  const occupant = picked ? seats[picked] : undefined
  const person = props.members.find(m => m.memberId === occupant)
  const available = Boolean(picked && (!isVipSeat(picked) || props.canUseVip) && (!occupant || occupant === props.memberId))
  const select = (id: string) => { if (!busy) { setSelected(id); setError('') } }
  useEffect(() => () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current) }, [])
  useEffect(() => {
    const feedback = (text: string) => {
      setShortcutFeedback(text)
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
      feedbackTimer.current = setTimeout(() => setShortcutFeedback(''), 1500)
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target instanceof HTMLElement ? event.target : null
      if (target?.isContentEditable || target?.closest('input, textarea, select, [role="textbox"], [role="slider"], [role="menu"], [role="dialog"], [contenteditable="true"]')) return
      if (target && target !== document.body && !root.current?.contains(target)) return
      const key = event.key.toLowerCase()
      if (event.shiftKey && key.startsWith('arrow')) return
      if (key === 'escape') {
        if (showShortcuts) { event.preventDefault(); setShowShortcuts(false) }
        else if (expanded) { event.preventDefault(); void exitFullscreen() }
        return
      }
      if (!['f', 'm', ' ', 'k', 'j', 'l', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'n', 'p', '?'].includes(key) && !/^[0-9]$/.test(key)) return
      // Space still activates a focused button instead of also controlling playback.
      if (key === ' ' && target?.closest('button, a, [role="button"]')) return
      event.preventDefault()
      if (event.repeat && !key.startsWith('arrow')) return
      revealControls()
      if (key === 'f') { void (expanded ? exitFullscreen() : enterFullscreen()); return }
      if (key === '?') { setShowShortcuts(value => !value); return }
      if (showShortcuts) return
      if (!projection.available || failed) { feedback('Nguồn phim chưa sẵn sàng'); return }
      if (key === 'm') { void projection.toggleSound(); feedback(projection.muted ? 'Bật tiếng phim' : 'Tắt tiếng phim'); return }
      if (key === 'arrowup' || key === 'arrowdown') {
        const volume = projection.adjustVolume(key === 'arrowup' ? 0.05 : -0.05)
        if (volume !== null) feedback(`Âm lượng ${volume}%`)
        return
      }
      if (!props.media?.isHost) { feedback('Chủ phòng đang điều khiển phim'); return }
      if (!props.media.connected) { feedback('Đang chờ kết nối lại phòng'); return }
      if (key === ' ' || key === 'k') { projection.toggleRoomPlayback(); feedback(props.media.playback.isPlaying ? 'Tạm dừng phim' : 'Phát phim') }
      else if (key === 'j' || key === 'arrowleft') { const step = key === 'j' ? 10 : 5; projection.seekBy(-step); feedback(`Lùi ${step} giây`) }
      else if (key === 'l' || key === 'arrowright') { const step = key === 'l' ? 10 : 5; projection.seekBy(step); feedback(`Tua ${step} giây`) }
      else if (key === 'n') { props.onNextEpisode?.(); feedback(props.onNextEpisode ? 'Chuyển tập tiếp theo' : 'Không có tập tiếp theo') }
      else if (key === 'p') { props.onPreviousEpisode?.(); feedback(props.onPreviousEpisode ? 'Chuyển tập trước' : 'Không có tập trước') }
      else if (/^[0-9]$/.test(key)) { projection.seekToRatio(Number(key) / 10); feedback(`Tua đến ${Number(key) * 10}%`) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })
  const confirm = async () => {
    if (!picked || !available || busy || !props.snapshot || !props.connected) return
    setBusy(true); setError('')
    try {
      const result = await props.onConfirm(picked)
      if (result.ok) {
        if (props.demo || props.preview || failed || ownSeat === picked) props.onEnter()
        else setView('overview')
      }
      else setError(messages[result.code || ''] || 'Chưa giữ được ghế. Hãy thử lại.')
    } catch { setError('Không thể xác nhận ghế. Hãy thử lại khi có kết nối.') }
    finally { setBusy(false) }
  }
  return <div ref={root} className={`${styles.room} ${expanded ? styles.expandedRoom : ''} ${screenFullscreen ? styles.screenFullscreen : ''}`} data-character-preview={Boolean(characterPreview)} data-controls-visible={controlsVisible} data-wide-scene={!seatPanelVisible && !props.sidePanel} onPointerMoveCapture={revealControls} onPointerDownCapture={revealControls} onPointerUpCapture={revealControls} onWheelCapture={revealControls} onKeyDownCapture={revealControls} onFocusCapture={revealControls}>
    <header className={styles.header}>
      <button className={styles.back} onClick={props.onLeave} aria-label="Rời phòng 3D"><ArrowLeft size={20} /></button>
      <div className={styles.identity}><span className={styles.brand}>CineMind<span> / </span>Room 3D</span><span className={styles.roomName}>{props.roomName}</span></div>
      <div className={styles.headerTools} aria-label="Điều khiển phim và phòng">
        {props.media && projection.available && !failed && <div className={styles.mediaTools}>
          {props.media.isHost && <>
            <CinemaToolButton label="Lùi phim 10 giây cho cả phòng" disabled={!props.media.connected || projection.status === 'loading' || projection.status === 'error'} onClick={() => projection.seekBy(-10)}><RotateCcw size={17} /><span className={styles.srOnly}>10 giây</span></CinemaToolButton>
            <CinemaToolButton label={props.media.playback.isPlaying ? 'Tạm dừng phim cả phòng' : 'Phát phim cho phòng'} disabled={!props.media.connected || projection.status === 'loading' || projection.status === 'error'} onClick={projection.toggleRoomPlayback}>{props.media.playback.isPlaying ? <Pause size={17} /> : <Play size={17} />}</CinemaToolButton>
            <CinemaToolButton label="Tua phim 10 giây cho cả phòng" disabled={!props.media.connected || projection.status === 'loading' || projection.status === 'error'} onClick={() => projection.seekBy(10)}><RotateCw size={17} /></CinemaToolButton>
          </>}
          <CinemaToolButton label={projection.muted ? 'Bật âm thanh phim' : 'Tắt âm thanh phim'} aria-pressed={!projection.muted} onClick={() => void projection.toggleSound()} disabled={projection.status === 'error'}>{projection.muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</CinemaToolButton>
          <CinemaToolButton label={projection.status === 'error' ? 'Tải lại phim' : 'Đồng bộ lại phim với phòng'} onClick={projection.status === 'error' ? projection.retry : projection.resync}><RefreshCw size={17} /></CinemaToolButton>
        </div>}
        {props.headerTools}
        <CinemaToolButton label="Phím tắt (?)" aria-expanded={showShortcuts} onClick={() => { setShowShortcuts(value => !value); revealControls() }}><Keyboard size={17} /></CinemaToolButton>
        <CinemaToolButton label={seatPanelVisible ? 'Ẩn chỗ ngồi' : 'Hiện chỗ ngồi'} aria-expanded={Boolean(seatPanelVisible)} aria-controls={seatPanelVisible ? seatPanelId : undefined} onClick={() => { setShowSeats(!seatPanelVisible); if (!seatPanelVisible) props.onShowSeats?.(); revealControls() }}>{seatPanelVisible ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}</CinemaToolButton>
        <CinemaToolButton label={expanded ? 'Thoát toàn màn hình (F)' : 'Toàn màn hình (F)'} aria-pressed={expanded} onClick={() => void (expanded ? exitFullscreen() : enterFullscreen())}>{expanded ? <Minimize size={17} /> : <Maximize size={17} />}</CinemaToolButton>
      </div>
      <span className={styles.connection}><i data-connected={props.connected && Boolean(props.snapshot)} />{props.demo || props.preview ? 'Bản xem trước' : !props.connected ? 'Đang kết nối' : props.seatSyncError ? 'Chưa đồng bộ ghế' : props.snapshot ? 'Ghế đã đồng bộ' : 'Đang tải ghế'}</span>
    </header>
    <div className={styles.content}>
      <section className={styles.stage} aria-label="Không gian rạp phim">
        <div className={styles.sceneTitle} data-compact={view !== 'overview'}><h1>{view === 'overview' ? 'Chọn ghế của bạn' : view === 'seat' ? `Góc nhìn từ ghế ${picked || ''}` : view === 'character' ? `Nhân vật tại ghế ${picked || ''}` : props.movieTitle}</h1>{view !== 'screen' && <p>{props.movieTitle}</p>}</div>
        {!failed && <CinemaScene characterPreview={characterPreview} video={projection.video} screenFullscreen={screenFullscreen} capacity={capacity} seats={seats} members={props.members} selected={picked} currentMemberId={props.memberId} poster={props.poster} title={props.movieTitle} view={view} resetKey={resetKey} onSelect={select} onReady={() => setReady(true)} onError={() => setFailed(true)} />}
        {!ready && !failed && <div className={styles.loading} role="status"><Armchair size={28} /><span>Đang mở cửa rạp…</span></div>}
        {failed && <div className={styles.loading} role="status"><Armchair size={36} /><h2>Chọn ghế bằng sơ đồ</h2><p>Thiết bị chưa mở được 3D. Bạn vẫn có thể chọn chỗ và vào xem phim.</p><button onClick={() => { setFailed(false); setReady(false) }}>Thử mở lại 3D</button></div>}
        <div className={styles.sceneNotices}>
          {props.notices}
          {props.media && !failed && <>
            {!projection.available && <p role="status">Nguồn tập này chưa hỗ trợ chiếu trong 3D. Bạn vẫn có thể vào trình phát chính.</p>}
            {projection.status === 'loading' && <p role="status">Đang tải phim…</p>}
            {projection.status === 'blocked' && <button type="button" onClick={() => void projection.resume()}><Play size={16} />Chạm để xem phim</button>}
            {projection.error && <p role="status">{projection.error}</p>}
          </>}
        </div>
        {props.sceneOverlay}
        {props.liveOverlay}
        {shortcutFeedback && <div className={styles.shortcutFeedback} role="status">{shortcutFeedback}</div>}
        {showShortcuts && <section className={styles.shortcuts} aria-label="Phím tắt Room 3D">
          <div className={styles.popoverHeading}><strong>Phím tắt</strong><CinemaToolButton label="Đóng phím tắt" onClick={() => setShowShortcuts(false)}><X size={16} /></CinemaToolButton></div>
          <dl>{[['F', 'Bật / tắt toàn màn hình'], ['M', 'Bật / tắt tiếng phim'], ['↑ / ↓', 'Tăng / giảm âm lượng 5%'], ['Space / K', 'Phát / tạm dừng'], ['J / L', 'Lùi / tua 10 giây'], ['← / →', 'Lùi / tua 5 giây'], ['0–9', 'Tua đến 0–90% phim'], ['N / P', 'Tập tiếp / tập trước'], ['Shift + mũi tên', 'Nhìn quanh từ ghế khi chọn vùng 3D'], ['?', 'Ẩn / hiện bảng phím tắt'], ['Esc', 'Đóng bảng / thoát toàn màn hình']].map(([key, text]) => <div key={key}><dt><kbd>{key}</kbd></dt><dd>{text}</dd></div>)}</dl>
          <p>Phát, tua và đổi tập dành cho chủ phòng. Phím tắt không chạy khi đang nhập chat.</p>
        </section>}
        <div className={styles.cameraBar} aria-label="Góc nhìn rạp">
          <button aria-pressed={view === 'overview'} onClick={() => setView('overview')}><Move3d size={17} /><span>Toàn cảnh</span></button>
          <button aria-pressed={view === 'screen'} onClick={() => { setView('screen'); void enterFullscreen() }}><MonitorPlay size={17} /><span>Màn chiếu</span></button>
          <button disabled={!picked} aria-pressed={view === 'seat'} onClick={() => { setView('seat'); setResetKey(k => k + 1) }}><Armchair size={17} /><span>Từ ghế</span></button>
          {characterPreview && <button disabled={!picked} aria-pressed={view === 'character'} onClick={() => setView('character')}><span>Nhân vật</span></button>}
          <button aria-label="Đặt lại góc nhìn hiện tại" onClick={() => setResetKey(k => k + 1)}><RotateCcw size={17} /></button>
        </div>
        <p className={styles.hint}><Expand size={13} />{view === 'overview' || view === 'character' ? 'Kéo để xoay quanh rạp · Cuộn hoặc chụm để zoom' : view === 'screen' ? 'Cuộn hoặc chụm để zoom màn chiếu · Góc nhìn cố định' : 'Kéo để nhìn quanh từ ghế · Cuộn hoặc chụm để đổi độ rộng'}</p>
      </section>
      {props.sidePanel ? <aside className={styles.chatPanel} aria-label="Trò chuyện trong rạp">{props.sidePanel}</aside> : showSeats && <aside id={seatPanelId} className={styles.panel} aria-label="Chọn và xác nhận ghế">
        {props.demo ? props.characterPicker : <CinemaCharacterPicker character={character.preview.character} choose={character.choose} status={character.status} saved={character.saved} replay={character.replay} allowVip={Boolean(props.canUseVip)} localOnly synchronized={Boolean(props.onCharacterChange)} pending={character.pending} syncError={character.syncError} hasSeat={Boolean(ownSeat)} />}
        <div className={styles.panelHeading}><h2>Chỗ ngồi</h2><span>{props.snapshot ? Object.keys(seats).length : '—'}/{capacity} đã xác nhận</span></div>
        {!props.demo && <p className={styles.occupancySummary}>{props.members.filter(member => member.connected).length} người online · {props.snapshot ? `${Object.keys(seats).length} ghế đã giữ` : 'Đang tải ghế chung'}</p>}
        <div className={styles.legend}><span><i />Trống</span><span><i className={styles.occupiedDot} />Có người</span><span><i className={styles.selectedDot} />Bạn chọn</span></div>
        <div className={styles.map}>
          <div className={styles.screenLine}>MÀN CHIẾU</div>
          <div className={styles.rows} role="group" aria-label="Sơ đồ ghế, hàng A gần màn chiếu nhất">
            {Array.from({ length: Math.ceil(capacity / 4) }, (_, row) => <div className={styles.row} data-vip={row === 8} key={row}>
              <span className={styles.rowLabel}>{row === 8 ? 'VIP' : String.fromCharCode(65 + row)}</span>
              {cinemaLayout(capacity).filter(s => s.row === row).map(seat => {
                const owner = seats[seat.id], member = props.members.find(m => m.memberId === owner)
                const mine = owner === props.memberId
                return <button key={seat.id} data-vip={seat.vip} data-locked={seat.vip && !props.canUseVip} data-aisle={seat.column === 2} data-occupied={Boolean(owner && !mine)} data-selected={picked === seat.id || mine} disabled={busy || !props.snapshot || !props.connected || (seat.vip && !props.canUseVip)} aria-pressed={picked === seat.id} aria-label={`Ghế ${seat.id}${owner ? `, ${mine ? 'của bạn' : member?.displayName || 'đã có người'}` : ', còn trống'}`} title={owner ? `${seat.id} · ${member?.displayName || 'Đã có người'}` : seat.id} onClick={() => select(seat.id)}>{seat.vip ? !props.canUseVip ? <LockKeyhole size={18} /> : <Crown size={20} /> : <Armchair size={22} />}{mine && <Check className={styles.check} size={11} />}</button>
              })}
            </div>)}
          </div>
          <p className={styles.aisleLabel}>32 ghế thường · 4 ghế VIP / Ultra</p>
        </div>
        <div className={styles.selection} aria-live="polite">
          <Armchair size={26} />
          <div><strong>{picked ? `Ghế ${picked}` : 'Bạn muốn ngồi đâu?'}</strong><p>{occupant && occupant !== props.memberId ? `${person?.displayName || 'Thành viên'} đã chọn chỗ này` : picked ? ownSeat === picked ? 'Chỗ của bạn trong phòng' : isVipSeat(picked) ? 'Hàng VIP phía sau · CinePass Ultra' : `Hàng ${picked[0]} · Ghế ${picked[1]}` : 'Chọn trong rạp hoặc trên sơ đồ'}</p></div>
        </div>
        {isVipSeat(picked) && !props.canUseVip && <p className={styles.error}>Ghế VIP cần gói CinePass Ultra.</p>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        {!props.demo && (props.seatSyncError ? <div className={styles.error} role="status"><p>{props.seatSyncError}</p><button className={styles.returnButton} type="button" disabled={!props.connected} onClick={props.onRetrySeats}>Kết nối lại sơ đồ ghế</button></div> : !props.snapshot && <p className={styles.error} role="status">Đang tải sơ đồ ghế chung từ máy chủ…</p>)}
        <button className={styles.confirm} disabled={!available || busy || !props.connected || !props.snapshot} onClick={() => void confirm()}>{busy ? 'Đang xác nhận…' : props.demo && props.characterPreview && picked && available ? `Ngồi thử ghế ${picked}` : ownSeat === picked && ownSeat ? 'Vào xem phim' : picked && available ? `Xác nhận ghế ${picked}` : 'Chọn một ghế để tiếp tục'}<MonitorPlay size={18} /></button>
        {props.canReturn && ownSeat && <button className={styles.returnButton} onClick={props.onEnter}>Quay lại phim · Giữ ghế {ownSeat}</button>}
        <p className={styles.note}>{props.demo ? 'Khán giả minh họa. Bản thử mở cả ghế thường và VIP; chưa đồng bộ với phòng thật.' : props.preview ? 'Chọn ghế xem trước: chỗ của bạn chỉ lưu trên thiết bị này, chưa đồng bộ với người khác.' : 'Mỗi người xác nhận một ghế, kể cả chủ phòng. Người đang online chưa chắc đã chọn ghế.'}</p>
      </aside>}
    </div>
    {props.overlays}
  </div>
}
