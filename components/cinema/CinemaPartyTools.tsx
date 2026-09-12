'use client'

import { useEffect, useRef, useState, type ReactNode, type ButtonHTMLAttributes } from 'react'
import { Armchair, Copy, Film, Headphones, MessageCircle, Mic, MicOff, MoreHorizontal, Radio, Users, VolumeX, X } from 'lucide-react'
import styles from './CinemaRoom.module.css'

export function CinemaToolButton({ label, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button type="button" className={styles.toolButton} title={label} aria-label={label} {...props}>{children}</button>
}

interface Props {
  chatOpen: boolean; unread: number; userCount: number; onChat: () => void
  isHost: boolean; connected: boolean; canVoice: boolean; micAllowed: boolean; voiceEnabled: boolean; micEnabled: boolean; speakerEnabled: boolean
  onMic: () => void; onSpeaker: () => void; onVoicePermission: () => void; onCopy: () => void; copied: boolean
  members: ReactNode; episodes: ReactNode; more: ReactNode
}

export default function CinemaPartyTools(props: Props) {
  const [panel, setPanel] = useState<'members' | 'episodes' | 'more' | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    if (!panel) return
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setPanel(null) }
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { setPanel(null); trigger.current?.focus() } }
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', key)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', key) }
  }, [panel])
  const toggle = (next: typeof panel, button: HTMLButtonElement) => { trigger.current = button; setPanel(value => value === next ? null : next) }
  const voiceReason = !props.canVoice ? 'Cần CinePass Ultra' : !props.micAllowed ? 'Cần xác nhận ghế VIP để mở mic' : !props.voiceEnabled ? 'Chủ phòng chưa mở voice' : ''
  return <div className={styles.partyTools} ref={root}>
    <CinemaToolButton label={props.chatOpen ? 'Đóng chat · Trở lại sơ đồ ghế' : 'Mở chat'} aria-pressed={props.chatOpen} onClick={() => { setPanel(null); props.onChat() }}>
      {props.chatOpen ? <Armchair size={17} /> : <MessageCircle size={17} />}
      {props.unread > 0 && <span className={styles.unread}>{Math.min(props.unread, 99)}</span>}
    </CinemaToolButton>
    <CinemaToolButton label={voiceReason || (props.micEnabled ? 'Tắt microphone' : 'Bật microphone')} aria-pressed={props.micEnabled} disabled={Boolean(voiceReason) || !props.connected} onClick={props.onMic}>{props.micEnabled ? <Mic size={17} /> : <MicOff size={17} />}</CinemaToolButton>
    <CinemaToolButton label={props.speakerEnabled ? 'Tắt tiếng trò chuyện voice' : 'Nghe trò chuyện voice'} aria-pressed={props.speakerEnabled && props.voiceEnabled} disabled={!props.voiceEnabled} onClick={props.onSpeaker}>{props.speakerEnabled ? <Headphones size={17} /> : <VolumeX size={17} />}</CinemaToolButton>
    {props.isHost && <CinemaToolButton label={!props.canVoice ? 'Voice cần CinePass Ultra' : props.voiceEnabled ? 'Tắt mic cả phòng' : 'Cho phép Ultra ở ghế VIP mở mic'} disabled={!props.canVoice || !props.connected} aria-pressed={props.voiceEnabled} onClick={props.onVoicePermission}><Radio size={17} /></CinemaToolButton>}
    <CinemaToolButton label={`Người trong phòng: ${props.userCount}`} aria-expanded={panel === 'members'} onClick={event => toggle('members', event.currentTarget)}><Users size={17} /><span className={styles.toolCount}>{props.userCount}</span></CinemaToolButton>
    <CinemaToolButton label={props.copied ? 'Đã sao chép link phòng' : 'Sao chép link mời vào phòng'} onClick={props.onCopy}><Copy size={17} /></CinemaToolButton>
    <CinemaToolButton label="Chọn tập phim" aria-expanded={panel === 'episodes'} onClick={event => toggle('episodes', event.currentTarget)}><Film size={17} /></CinemaToolButton>
    <CinemaToolButton label="Thêm điều khiển phòng" aria-expanded={panel === 'more'} onClick={event => toggle('more', event.currentTarget)}><MoreHorizontal size={17} /></CinemaToolButton>
    {props.copied && <span className={styles.srOnly} role="status">Đã sao chép link phòng</span>}
    {panel && <section className={styles.toolPopover} aria-label={panel === 'members' ? 'Người trong phòng' : panel === 'episodes' ? 'Tập phim' : 'Điều khiển phòng'}>
      <div className={styles.popoverHeading}><strong>{panel === 'members' ? 'Người trong phòng' : panel === 'episodes' ? 'Tập phim' : 'Điều khiển phòng'}</strong><CinemaToolButton label="Đóng bảng điều khiển" onClick={() => { setPanel(null); trigger.current?.focus() }}><X size={16} /></CinemaToolButton></div>
      <div className={styles.popoverBody}>{panel === 'members' ? props.members : panel === 'episodes' ? props.episodes : props.more}</div>
    </section>}
  </div>
}
