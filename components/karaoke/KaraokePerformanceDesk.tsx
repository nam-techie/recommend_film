'use client'

import type { RefObject } from 'react'
import { AudioLines, Headphones, Mic2, MicOff, Pause, Play, SkipForward } from 'lucide-react'
import type { KaraokeRoom } from '@/lib/karaoke-types'
import { StageButton, VolumeSlider } from './KaraokePrimitives'
import { MicSignalPanel } from './MicSignalPanel'
import styles from './KaraokeStage.module.css'

type Props = {
  uid?: string; tracks: Record<string, MediaStreamTrack>; participantVolumes: Record<string, number>; setParticipantVolume: (id: string, value: number) => void
  room: KaraokeRoom; own: boolean; host: boolean; disabled: boolean; mic: boolean; pending: boolean; micError: string; track: MediaStreamTrack | null
  mount: RefObject<HTMLDivElement>; stageRef: RefObject<HTMLDivElement>; filtered: boolean; setFiltered: (v: boolean) => void
  volume: number; setVolume: (v: number) => void; voiceVolume: number; setVoiceVolume: (v: number) => void; voiceState: string
  draftOffset: number; setDraftOffset: (v: number) => void; applyOffset: () => void
  listen: () => void; prepare: () => void; start: () => void; pause: () => void; end: () => void; mute: () => void
}
const stateLabels = { preparing: 'Chuẩn bị lên sân khấu', playing: 'Đang hát', paused: 'Đang tạm dừng', ended: 'Đã kết thúc lượt' }
export function KaraokePerformanceDesk(props: Props) {
  const { room, own, host, disabled, mic, pending, micError, track, mount, stageRef, filtered, setFiltered, volume, setVolume, voiceVolume, setVoiceVolume, voiceState, draftOffset, setDraftOffset, applyOffset, listen, prepare, start, pause, end, mute } = props
  const p = room.performance, singer = p && room.members[p.singerMemberId]
  const participating = own || (!!props.uid && p?.duetMemberId===props.uid)
  return <section className={styles.desk} ref={stageRef} data-playing={p?.state === 'playing'}>
    <div className={styles.videoFrame}>
      <div ref={mount} className={styles.player} aria-label="Video karaoke YouTube" />
      {!p && <div className={styles.playerEmpty}><Play size={40} strokeWidth={1.3} aria-hidden="true" /><strong>Sân khấu đang chờ bạn</strong><span>Thêm bài vào hàng chờ để đăng ký lượt của bạn.</span></div>}
    </div>
    <div className={styles.songHeading}><div><h2 title={p?.song.label}>{p?.song.label || 'Chọn bài đầu tiên'}</h2><p>{p ? stateLabels[p.state] : 'Một bài hát hay bắt đầu một buổi vui.'}</p></div>{p?.state === 'playing' && <span className={styles.liveBadge}>Đang hát</span>}</div>
    <details className={styles.singerLine}><summary>Thông tin người hát</summary><div className={styles.row}><span className={styles.singerAvatar} aria-hidden="true">{singer?.displayName.trim().slice(0, 1).toUpperCase() || <Mic2 size={24} />}</span><div><strong>{singer?.displayName || 'Chưa chọn người hát'}{own ? ' (bạn)' : ''}</strong><small>{p ? own ? 'Sân khấu là của bạn. Chuẩn bị mic trước khi hát.' : 'Bật âm thanh để nghe giọng của bạn bè.' : 'Chủ lượt đầu hàng tự chuẩn bị microphone.'}</small></div></div></details>
    {p ? [p.singerMemberId,p.duetMemberId].filter((id): id is string=>!!id).map(id=><div key={id} className={styles.voiceParticipant}><p className={styles.participantName}>{room.members[id]?.displayName} · {id===p.singerMemberId ? 'Chủ lượt' : 'Song ca'} · {p.mics[id]?.revocationPending ? 'Đang thu hồi mic' : p.mics[id]?.authorized ? 'Đã cấp quyền mic' : 'Mic chưa sẵn sàng'}</p><MicSignalPanel track={props.tracks[id] || null} own={id===props.uid} pending={id===props.uid && pending} micError={id===props.uid ? micError : ''} stageRef={stageRef}/>{id!==props.uid && <details className={styles.participantVolume}><summary>Âm lượng giọng</summary><VolumeSlider label={'Âm lượng '+room.members[id]?.displayName} value={props.participantVolumes[id] ?? voiceVolume} onChange={value=>props.setParticipantVolume(id,value)}/></details>}</div>) : <MicSignalPanel track={null} own={false} pending={false} micError="" stageRef={stageRef}/>}
    <div className={styles.controls}><div className={styles.transport}>
      {participating && p?.state !== 'ended' && <div className={styles.singingActions}>
        {!mic && <StageButton disabled={disabled} working={pending} onClick={prepare}><Mic2 size={18} aria-hidden="true" />Chuẩn bị mic</StageButton>}
        {own && p?.state !== 'playing' && <StageButton primary className={styles.micButton} disabled={disabled || !mic} onClick={start}><Play size={18} fill="currentColor" aria-hidden="true" />{p?.state==='paused' ? 'Tiếp tục' : 'Bắt đầu hát'}</StageButton>}
        {mic && <StageButton quiet onClick={mute}><MicOff size={18} aria-hidden="true" />Tắt mic</StageButton>}
      </div>}
      <div className={styles.row}><StageButton disabled={disabled} onClick={listen}><Headphones size={18} aria-hidden="true" />Bật âm thanh</StageButton>
        {(host || own) && p && <>{own && <StageButton disabled={disabled || p.state !== 'playing'} onClick={pause}><Pause size={18} aria-hidden="true" />Tạm dừng</StageButton>}<StageButton quiet disabled={disabled || p.state === 'ended'} onClick={end}><SkipForward size={18} aria-hidden="true" />Bài tiếp</StageButton></>}
      </div>
      </div><details className={styles.audioSettings}><summary>Âm lượng & cài đặt mic</summary><p className={styles.fine} role="status">{voiceState}</p>
      <div className={styles.volumes}><VolumeSlider label="Âm lượng nhạc" value={volume} onChange={setVolume} /><VolumeSlider label="Âm lượng giọng" value={voiceVolume} onChange={setVoiceVolume} icon={<AudioLines size={18} aria-hidden="true" />} /></div>
      {participating && <label className={styles.checkbox}><input type="checkbox" checked={filtered} disabled={p?.state === 'playing' || mic || pending} onChange={e => setFiltered(e.target.checked)} />Lọc tiếng nền <small>(đổi trước khi chuẩn bị mic)</small></label>}
      {!own && <details className={styles.offset}><summary>Căn nhạc với giọng</summary><label>Thử phát nhạc trễ: {draftOffset} ms<input type="range" min="0" max="1000" step="100" value={draftOffset} onChange={e => setDraftOffset(+e.target.value)} onPointerUp={applyOffset} onKeyUp={applyOffset} /></label><p className={styles.fine}>Điều chỉnh thử vị trí playback tại máy này; không phải độ trễ audio đo được.</p></details>}
    </details></div>
  </section>
}
