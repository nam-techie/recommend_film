'use client'

import { useEffect, useMemo, useState } from 'react'
import CinemaRoom from './CinemaRoom'
import CinemaCharacterPicker from './CinemaCharacterPicker'
import type { CinemaSeatSnapshot } from '@/lib/cinema-layout'
import { CINEMA_CHARACTER_DEMO_STORAGE, isCinemaCharacter, type CinemaCharacter, type CharacterStatus } from '@/lib/cinema-character'

const names = ['Minh Anh', 'Hoàng Nam', 'Thu Hà', 'Đức Huy', 'Ngọc Linh', 'Gia Bảo', 'Khánh Vy', 'Tuấn Anh', 'Phương Thảo', 'Quốc Bảo', 'Mai Chi', 'Hải Đăng']
const occupied = ['A1', 'B2', 'B3', 'C1', 'C4', 'D2', 'D3', 'E1', 'E4', 'F2', 'V1', 'V4']
const members = [...names.map((displayName, i) => ({ memberId: `demo-${i}`, displayName, connected: true, characterGender: (i % 2 ? 'female' : 'male') as 'male' | 'female', accountPlan: (i % 3 === 0 ? 'ultra' : 'normal') as 'ultra' | 'normal' })), { memberId: 'you', displayName: 'Bạn', connected: true }]

export default function CinemaDemo() {
  const [snapshot, setSnapshot] = useState<CinemaSeatSnapshot>({ revision: 0, capacity: 36, seats: { ...Object.fromEntries(occupied.map((seat, i) => [seat, `demo-${i}`])), D4: 'you' } })
  const [character, setCharacter] = useState<CinemaCharacter>('male')
  const [status, setStatus] = useState<CharacterStatus>('loading')
  const [replay, setReplay] = useState(0)
  const [saved, setSaved] = useState(true)
  useEffect(() => {
    try { const value = localStorage.getItem(CINEMA_CHARACTER_DEMO_STORAGE); if (isCinemaCharacter(value)) setCharacter(value) }
    catch { setSaved(false) }
  }, [])
  const choose = (value: CinemaCharacter) => {
    setCharacter(value)
    try { localStorage.setItem(CINEMA_CHARACTER_DEMO_STORAGE, value); setSaved(true) } catch { setSaved(false) }
  }
  const preview = useMemo(() => ({ character, replay, onStatus: setStatus }), [character, replay])
  return <CinemaRoom demo canUseVip characterPreview={preview} characterPicker={<CinemaCharacterPicker character={character} choose={choose} status={status} saved={saved} replay={() => setReplay(value => value + 1)} />} roomName="Phòng thử nhân vật" movieTitle="Một buổi tối cùng nhau" memberId="you" members={members} snapshot={snapshot} connected
    onConfirm={async seatId => {
      const owner = snapshot.seats[seatId]
      if (owner && owner !== 'you') return { ok: false, code: 'SEAT_TAKEN' }
      setSnapshot(current => ({ ...current, revision: current.revision + 1, seats: { ...Object.fromEntries(Object.entries(current.seats).filter(([, id]) => id !== 'you')), [seatId]: 'you' } }))
      setReplay(value => value + 1)
      return { ok: true }
    }} onEnter={() => {}} onLeave={() => { window.location.href = '/watch-party' }} />
}
