'use client'

import { RotateCcw, Check } from 'lucide-react'
import type { CinemaCharacter, CharacterStatus } from '@/lib/cinema-character'
import styles from './CinemaCharacters.module.css'

const statuses: Record<CharacterStatus, string> = { loading: 'Đang chuẩn bị nhân vật…', walking: 'Bạn đang đi đến ghế…', seated: 'Đã ngồi vào ghế. Chọn “Nhân vật” để xem gần.', error: 'Chưa tải được nhân vật. Bấm thử lại để tải lại.' }

export default function CinemaCharacterPicker({ character, choose, status, replay, saved, allowVip = true, localOnly = false, hasSeat = true, synchronized = false, pending = false, syncError = '' }: { character: CinemaCharacter; choose: (value: CinemaCharacter) => void; status: CharacterStatus; replay: () => void; saved: boolean; allowVip?: boolean; localOnly?: boolean; hasSeat?: boolean; synchronized?: boolean; pending?: boolean; syncError?: string }) {
  const vip = character.endsWith('_vip'), female = character.startsWith('female')
  return <section className={styles.picker} aria-label="Chọn nhân vật thử nghiệm">
    <div className={styles.heading}><h2>Nhân vật của bạn</h2><span>Bản thử</span></div>
    {localOnly ? <p className={styles.caption}>{vip ? 'CinePass Ultra · Nhân vật VIP ở mọi ghế' : 'Nhân vật thường · Chọn nam hoặc nữ'}</p> : <div className={styles.costumes} role="group" aria-label="Trang phục nhân vật">
      <button type="button" aria-pressed={!vip} onClick={() => choose(female ? 'female' : 'male')}>Thường</button>
      <button type="button" aria-pressed={vip} disabled={!allowVip} title={!allowVip ? 'Dành cho CinePass Ultra' : undefined} onClick={() => choose(female ? 'female_vip' : 'male_vip')}>VIP</button>
    </div>}
    <div className={styles.choices} role="group" aria-label="Chọn nhân vật nam hoặc nữ">
      {(['male', 'female'] as const).map(gender => {
        const value: CinemaCharacter = `${gender}${vip ? '_vip' : ''}`
        const selected = character === value, label = gender === 'male' ? 'Nam' : 'Nữ'
        return <button key={gender} type="button" disabled={pending} aria-label={`${label}${vip ? ' VIP' : ' thường'}`} aria-pressed={selected} onClick={() => choose(value)}>
          <img src={`/3d/character-cards/${value}.webp`} width={175} height={205} alt="" />
          <span>{label}{selected && <Check size={14} />}</span>
        </button>
      })}
    </div>
    {pending && <p role="status" className={styles.caption}>Đang đồng bộ nhân vật với phòng…</p>}
    {syncError && <p role="alert" className={styles.caption}>{syncError}</p>}
    <p className={styles.status} role="status">{hasSeat ? statuses[status] : 'Xác nhận ghế để nhân vật đi vào rạp.'}</p>
    {status === 'error' && <button className={styles.replay} type="button" onClick={replay}><RotateCcw size={15} />Thử tải lại nhân vật</button>}
    <p className={styles.caption}>{synchronized ? 'Lựa chọn nam/nữ được đồng bộ với mọi người trong phòng.' : `${saved ? 'Lựa chọn được nhớ trên thiết bị này.' : 'Lựa chọn chỉ được giữ trong lần xem này.'} Chuyển động đang ở bản thử.`}</p>
  </section>
}
