'use client'
import { Flame, Hand, Heart } from 'lucide-react'
import type { KaraokeReaction } from '@/lib/karaoke-types'
import { StageButton } from './KaraokePrimitives'
import styles from './KaraokeStage.module.css'

const choices = [
  { kind: 'heart', label: 'Yêu thích', Icon: Heart },
  { kind: 'clap', label: 'Vỗ tay', Icon: Hand },
  { kind: 'fire', label: 'Bùng cháy', Icon: Flame },
] as const
export function KaraokeReactions({ events, disabled, send }: { events: KaraokeReaction[]; disabled: boolean; send: (kind: KaraokeReaction['kind']) => void }) {
  const latest = events[events.length - 1]
  return <section className={styles.reactions} aria-label="Cảm xúc trong phòng">
    <div className={styles.reactionControls} role="group" aria-label="Cổ vũ người hát">
      <span>Cổ vũ</span>{choices.map(({ kind, label, Icon }) => <StageButton key={kind} quiet disabled={disabled} aria-label={'Thả cảm xúc ' + label} onClick={() => send(kind)}><Icon size={18} aria-hidden="true" /><span>{label}</span></StageButton>)}
    </div>
    <p className={styles.reactionStatus} role="status">{latest ? latest.displayName + ' vừa cổ vũ: ' + choices.find(c => c.kind === latest.kind)?.label : 'Gửi một lời cổ vũ đến sân khấu.'}</p>
    <div className={styles.reactionStream} aria-hidden="true">{events.map((event, index) => {
      const Icon = choices.find(c => c.kind === event.kind)?.Icon || Heart
      return <span key={event.id} className={styles.reactionFloat} style={{ left: (8 + index % 5 * 18) + '%' }}><Icon size={24} /><small>{event.displayName}</small></span>
    })}</div>
  </section>
}
