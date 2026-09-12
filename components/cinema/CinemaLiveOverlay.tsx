'use client'

import { useEffect, useRef, useState } from 'react'
import { AudioLines } from 'lucide-react'
import type { WatchPartyMember, WatchPartyMessage } from '@/lib/watch-party-types'
import styles from './CinemaRoom.module.css'

export default function CinemaLiveOverlay({ messages, speakers }: { messages: WatchPartyMessage[]; speakers: WatchPartyMember[] }) {
  const seen = useRef(new Set(messages.map(message => message.id)))
  const [floating, setFloating] = useState<WatchPartyMessage[]>([])
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())
  useEffect(() => {
    const additions = messages.filter(message => !seen.current.has(message.id) && message.type === 'user')
    messages.forEach(message => seen.current.add(message.id))
    if (seen.current.size > 300) seen.current = new Set(messages.map(message => message.id))
    if (!additions.length) return
    setFloating(current => [...current, ...additions].slice(-3))
    additions.forEach(message => {
      const timer = setTimeout(() => { timers.current.delete(timer); setFloating(current => current.filter(item => item.id !== message.id)) }, 3000)
      timers.current.add(timer)
    })
  }, [messages])
  useEffect(() => () => { timers.current.forEach(clearTimeout); timers.current.clear() }, [])
  return <div className={styles.liveOverlay} aria-live="polite" aria-atomic="false">
    <div className={styles.speakers}>{speakers.slice(0, 4).map(member => <div className={styles.speaker} key={member.memberId}>
      <span className={styles.speakerAvatar}>{member.avatar ? <img src={member.avatar} alt="" referrerPolicy="no-referrer" onError={event => { event.currentTarget.style.display = 'none' }} /> : member.displayName.slice(0, 1)}</span>
      <span>{member.displayName}</span><AudioLines size={16} aria-label="Đang nói" />
    </div>)}</div>
    <div className={styles.floatingMessages}>{floating.map(message => <div className={styles.floatingMessage} key={message.id}><strong>{message.displayName || 'Khách'}</strong><span>{message.text}</span></div>)}</div>
  </div>
}
