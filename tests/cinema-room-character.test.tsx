import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
vi.mock('next/dynamic', () => ({ default: () => (props: any) => <div data-testid="scene" data-character={props.characterPreview?.character} /> }))
vi.mock('@/components/cinema/useCinemaVideo', () => ({ useCinemaVideo: () => ({ video: null, muted: true }) }))
import CinemaRoom from '@/components/cinema/CinemaRoom'
afterEach(() => { cleanup(); localStorage.clear() })
const base = { roomName: 'Test', movieTitle: 'Movie', memberId: 'me', members: [{ memberId: 'me', displayName: 'Me' }], connected: true, onLeave: vi.fn(), onEnter: vi.fn(), onConfirm: vi.fn(async () => ({ ok: true })), snapshot: { revision: 1, capacity: 36, seats: {} } }
it('live room passes characters to Three.js and stays after first seat confirmation', async () => {
  const enter = vi.fn()
  render(<CinemaRoom {...base} onEnter={enter} />)
  expect(screen.getByTestId('scene')).toHaveAttribute('data-character', 'male')
  fireEvent.click(screen.getByRole('button', { name: 'Nữ thường' }))
  expect(screen.getByTestId('scene')).toHaveAttribute('data-character', 'female')
  expect(screen.queryByRole('button', { name: /^VIP$/ })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Ghế D4, còn trống' }))
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận ghế D4' }))
  await waitFor(() => expect(base.onConfirm).toHaveBeenCalledWith('D4'))
  expect(enter).not.toHaveBeenCalled()
})
it('Ultra can choose both VIP models and a stored VIP choice is downgraded without entitlement', () => {
  const { rerender } = render(<CinemaRoom {...base} canUseVip />)
  // Ultra defaults to VIP even before any seat has been selected.
  expect(screen.getByTestId('scene')).toHaveAttribute('data-character', 'male_vip')
  fireEvent.click(screen.getByRole('button', { name: 'Nữ VIP' }))
  expect(screen.getByTestId('scene')).toHaveAttribute('data-character', 'female_vip')
  rerender(<CinemaRoom {...base} canUseVip snapshot={{ revision: 2, capacity: 36, seats: { A1: 'me' } }} />)
  expect(screen.getByTestId('scene')).toHaveAttribute('data-character', 'female_vip')
  rerender(<CinemaRoom {...base} canUseVip={false} />)
  expect(screen.getByTestId('scene')).toHaveAttribute('data-character', 'female')
})
