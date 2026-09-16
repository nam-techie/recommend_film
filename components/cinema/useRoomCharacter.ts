'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { characterForPlan, isCinemaCharacter, type CharacterStatus, type CinemaCharacter } from '@/lib/cinema-character'
import type { ChangeCharacter, CharacterGender } from '@/lib/cinema-character-sync'

const storageKey = 'cinemind:room-character:v1'

export function useRoomCharacter(canUseVip: boolean, sync?: { memberId: string; gender?: CharacterGender; connected: boolean; change?: ChangeCharacter }) {
  const [choice, setChoice] = useState<CinemaCharacter>('male')
  const [status, setStatus] = useState<CharacterStatus>('loading')
  const [revision, setRevision] = useState(0)
  const [saved, setSaved] = useState(true)
  const [ready, setReady] = useState(false)
  const [pending, setPending] = useState(false)
  const [syncError, setSyncError] = useState('')
  const busy = useRef(false), seeded = useRef(false)
  const key = sync?.change ? `${storageKey}:${sync.memberId}` : storageKey
  useEffect(() => {
    try {
      const value = localStorage.getItem(key) || localStorage.getItem(storageKey)
      if (isCinemaCharacter(value)) setChoice(value)
    } catch { setSaved(false) }
    setReady(true)
  }, [key])
  const save = (value: CinemaCharacter) => {
    setChoice(value)
    try { localStorage.setItem(key, value); setSaved(true) } catch { setSaved(false) }
  }
  const submit = async (value: CinemaCharacter, initialize = false) => {
    if (busy.current) return
    if (!sync?.change) { save(value); return }
    busy.current = true; setPending(true); setSyncError('')
    try {
      const result = await sync.change(value.startsWith('female') ? 'female' : 'male', initialize)
      if (!result.ok) throw new Error(result.code)
      if (result.characterGender) save(result.characterGender)
    } catch {
      setSyncError('Chưa đồng bộ được nhân vật. Kiểm tra kết nối rồi chọn lại Nam hoặc Nữ.')
    } finally { busy.current = false; setPending(false) }
  }
  useEffect(() => {
    if (!sync?.connected) { seeded.current = false; return }
    if (!sync.change || sync.gender || !ready || seeded.current) return
    seeded.current = true
    void submit(choice, true)
  }, [sync?.connected, sync?.change, sync?.gender, ready])
  // Live rendering waits for authoritative room data, including choices made in another tab.
  const character = characterForPlan(sync?.change ? sync.gender || 'male' : choice, canUseVip ? 'ultra' : 'normal')
  const choose = (value: CinemaCharacter) => {
    if (!isCinemaCharacter(value) || (!canUseVip && value.endsWith('_vip'))) return
    void submit(value)
  }
  const preview = useMemo(() => ({ character, replay: revision, onStatus: setStatus }), [character, revision])
  return { preview, choose, status, saved, pending, syncError, replay: () => setRevision(value => value + 1) }
}
