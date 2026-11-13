'use client'

import { ArrowRight, Headphones, LogIn, Mic2, Plus } from 'lucide-react'
import { StageButton } from './KaraokePrimitives'
import styles from './KaraokeStage.module.css'

type Props = { signedIn: boolean; loading: boolean; connected: boolean; busy: boolean; name: string; setName: (s: string) => void; joinId: string; setJoinId: (s: string) => void; signIn: () => void; create: () => void; join: () => void }
export function KaraokeLobby({ signedIn, loading, connected, busy, name, setName, joinId, setJoinId, signIn, create, join }: Props) {
  return <div className={styles.lobby}>
    <div className={styles.lobbyIntro}><Mic2 className={styles.lobbyMic} size={36} strokeWidth={1.8} aria-hidden="true" /><h2>Hát cùng bạn bè</h2><p>Tạo phòng hoặc vào bằng link được chia sẻ. Thêm bài YouTube, chọn người hát và chuẩn bị mic để bắt đầu.</p><p className={styles.headphoneNote}><Headphones size={19} aria-hidden="true" />Dùng tai nghe để giọng hát không bị vọng.</p></div>
    {!signedIn ? <section className={styles.lobbyForm}><h2>Vào phòng cùng bạn bè</h2><p>Đăng nhập tài khoản tester để tạo phòng hoặc tham gia bằng link được chia sẻ.</p><StageButton primary disabled={loading || busy} working={busy} onClick={signIn}><LogIn size={18} aria-hidden="true" />Đăng nhập bằng Google</StageButton><small className={styles.fine}>Bản thử riêng · tối đa 4 người · Chrome/Edge.</small></section> : <div className={styles.lobbyForm}>
      <p className={styles.connection} role="status" data-connected={connected}>{connected ? 'Tài khoản đã được phép tham gia pilot.' : 'Đang kiểm tra quyền tham gia…'}</p>
      <form onSubmit={e => { e.preventDefault(); create() }}><h2>Tạo phòng của bạn</h2><label htmlFor="room-name">Tên phòng</label><input id="room-name" value={name} onChange={e => setName(e.target.value)} maxLength={80} required /><StageButton primary type="submit" disabled={!connected || busy} working={busy}><Plus size={18} aria-hidden="true" />Tạo phòng</StageButton></form>
      <form className={styles.joinForm} onSubmit={e => { e.preventDefault(); join() }}><h2>Đã có lời mời?</h2><label htmlFor="room-code">Link hoặc mã phòng</label><input id="room-code" value={joinId} onChange={e => setJoinId(e.target.value)} placeholder="Dán link hoặc nhập mã 10 ký tự" /><StageButton type="submit" disabled={busy}><ArrowRight size={18} aria-hidden="true" />Vào phòng</StageButton></form>
    </div>}
  </div>
}
