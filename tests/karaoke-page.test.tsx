import { render, screen, fireEvent, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const fixture = vi.hoisted(() => ({ user: null as null | { uid: string }, handlers: {} as Record<string, (...a: any[]) => void> }))
vi.mock('@/components/auth/AuthProvider', () => ({ useAuth: () => ({ user: fixture.user, loading:false, getIdToken:async()=> 'token', signInWithGoogle:async()=>{} }) }))
vi.mock('socket.io-client', () => ({ io: () => ({ on:(event:string, fn:(...a:any[])=>void)=>{fixture.handlers[event]=fn}, disconnect:()=>{}, connected:false }) }))
vi.mock('livekit-client', () => ({ Room:vi.fn(), RoomEvent:{}, Track:{} }))
vi.mock('@/hooks/useKaraokeLibrary', () => ({ useKaraokeLibrary: () => ({library:{revision:0,songs:{},playlists:{}},loading:false,loadError:'',reload:vi.fn(),mutate:vi.fn(),favorite:vi.fn(),exportSongs:vi.fn()}) }))
import KaraokePilotPage from '@/components/karaoke/KaraokePilotPage'
describe('karaoke pilot access and error states', () => {
  beforeEach(()=>{fixture.user=null;fixture.handlers={};vi.stubEnv('NEXT_PUBLIC_WATCH_PARTY_SOCKET_URL','http://localhost:4001')})
  it('requires sign-in before room actions',()=>{render(<KaraokePilotPage/>);expect(screen.getByRole('button',{name:'Đăng nhập bằng Google'})).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Tạo phòng'})).toBeNull()})
  it('shows allowlist/service errors and disables creation before connection',()=>{
    fixture.user={uid:'tester'};render(<KaraokePilotPage/>);
    expect(screen.getByRole('button',{name:'Tạo phòng'})).toBeDisabled()
    act(()=>fixture.handlers.connect_error(new Error('Pilot chưa mở cho tài khoản này.')))
    expect(screen.getByRole('alert')).toHaveTextContent('Pilot chưa mở')
  })
  it('validates room codes before navigation',()=>{
    fixture.user={uid:'tester'};render(<KaraokePilotPage/>);
    fireEvent.click(screen.getByRole('button',{name:'Vào phòng'}));expect(screen.getByRole('alert')).toHaveTextContent('10 ký tự')
  })
})
