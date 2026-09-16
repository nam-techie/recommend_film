import { act, renderHook, waitFor, cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useRoomCharacter } from '@/components/cinema/useRoomCharacter'
import { applyCharacterUpdate, preserveCharacterUpdates } from '@/lib/cinema-character-sync'
import type { WatchPartyRoom } from '@/lib/watch-party-types'

afterEach(() => { cleanup(); localStorage.clear() })
it('room gender wins over a stale local preference and updates from other tabs', async () => {
  localStorage.setItem('cinemind:room-character:v1', 'female_vip')
  const change = vi.fn(async () => ({ ok: true }))
  const { result, rerender } = renderHook(({ gender }: { gender: 'male' | 'female' }) => useRoomCharacter(true, { memberId: 'me', gender, connected: true, change }), { initialProps: { gender: 'male' as 'male' | 'female' } })
  expect(result.current.preview.character).toBe('male_vip')
  expect(change).not.toHaveBeenCalled()
  rerender({ gender: 'female' })
  expect(result.current.preview.character).toBe('female_vip')
})
it('initializes once with the old choice, and waits for server data before changing the visible model', async () => {
  localStorage.setItem('cinemind:room-character:v1', 'female')
  const change = vi.fn(async () => ({ ok: true, characterGender: 'female' as const }))
  const { result, rerender } = renderHook(({ gender }: { gender?: 'male' | 'female' }) => useRoomCharacter(false, { memberId: 'me', gender, connected: true, change }), { initialProps: {} })
  await waitFor(() => expect(change).toHaveBeenCalledWith('female', true))
  expect(change).toHaveBeenCalledTimes(1)
  expect(result.current.preview.character).toBe('male')
  rerender({ gender: 'female' })
  expect(result.current.preview.character).toBe('female')
})
it('failed saves keep the confirmed choice and expose a retryable error', async () => {
  const change = vi.fn(async () => ({ ok: false, code: 'TIMEOUT' }))
  const { result } = renderHook(() => useRoomCharacter(true, { memberId: 'me', gender: 'male', connected: true, change }))
  act(() => result.current.choose('female_vip'))
  await waitFor(() => expect(result.current.syncError).not.toBe(''))
  expect(result.current.preview.character).toBe('male_vip')
  expect(result.current.pending).toBe(false)
})
it('ignores stale member updates and preserves newer appearance across room snapshots', () => {
  const room = { members: { a: { memberId: 'a', characterGender: 'male', characterRevision: 2 } } } as unknown as WatchPartyRoom
  const newer = applyCharacterUpdate(room, { memberId: 'a', characterGender: 'female', characterRevision: 3 })!
  expect(newer.members.a.characterGender).toBe('female')
  expect(applyCharacterUpdate(newer, { memberId: 'a', characterGender: 'male', characterRevision: 2 })).toBe(newer)
  expect(preserveCharacterUpdates(room, newer).members.a.characterGender).toBe('female')
  expect(applyCharacterUpdate(newer, { memberId: 'unknown', characterGender: 'male', characterRevision: 4 })).toBe(newer)
})
