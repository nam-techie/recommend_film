import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { KaraokeRoom } from '@/lib/karaoke-types'
const fixture = vi.hoisted(() => ({ rooms: [] as any[], enable: vi.fn() }))
vi.mock('livekit-client', () => ({
  Track: { Source: { Microphone: 'microphone' }, Kind: { Audio: 'audio' } },
  RoomEvent: { TrackSubscribed: 'sub', TrackUnsubscribed: 'unsub', TrackMuted: 'muted', TrackUnmuted: 'unmuted', LocalTrackUnpublished: 'unpub', ConnectionStateChanged: 'state', Reconnecting: 'reconnecting' },
  Room: class {
    state = 'disconnected'
    handlers: Record<string, (...args: any[]) => void> = {}
    remoteParticipants = new Map()
    publication = { isMuted: true, track: { mediaStreamTrack: { label: 'USB microphone', getSettings: () => ({ sampleRate: 48000 }) } } }
    localParticipant = { permissions: { canPublish: true }, getTrackPublication: () => this.publication, setMicrophoneEnabled: vi.fn(async (on: boolean) => { await fixture.enable(on); this.publication.isMuted = !on }) }
    constructor() { fixture.rooms.push(this) }
    on(event: string, handler: (...args: any[]) => void) { this.handlers[event] = handler; return this }
    async connect() { this.state = 'connecting'; this.handlers.state?.('connecting'); this.state = 'connected'; this.handlers.state?.('connected') }
    startAudio = vi.fn(async () => {})
    disconnect = vi.fn(async () => { this.state = 'disconnected'; this.handlers.state?.('disconnected') })
  },
}))
import { useKaraokeVoice } from '@/hooks/useKaraokeVoice'
function room(): KaraokeRoom { return { id: '123456ABCD', name: 'Test', revision: 1, expiresAt: 9999, members: {}, queue: [], micBlocked: {}, banned: {}, performance: { performanceId: 'p1', singerMemberId: 'me', duetMemberId: null, requests: [], mics: { me: { authorized: true, revocationPending: false } }, state: 'preparing', lastReportAt: 0, song: { id: 'song', label: 'Test', videoId: 'abcdefghijk', addedBy: 'me', requests: [], duetMemberId: null }, playback: { currentTime: 0, isPlaying: false, serverUpdatedAt: 0 } } } }
describe('karaoke microphone and received-track lifecycle', () => {
  const command = vi.fn(async () => ({ serverUrl: 'wss://example.invalid', participantToken: 'test' }))
  beforeEach(() => { fixture.rooms = []; fixture.enable.mockReset(); command.mockClear() })
  const mount = (initialRoom = room(), uid = 'me') => renderHook(({ r, online }) => useKaraokeVoice(r, uid, online, 70, command), { initialProps: { r: initialRoom as KaraokeRoom | null, online: true } })
  it('keeps prepared mic through the authorization snapshot and start, then mutes on pause', async () => {
    const r = room(), { result, rerender } = mount(r)
    await act(() => result.current.prepareMic(false))
    expect(result.current.mic).toBe(true); expect(result.current.track?.label).toBe('USB microphone')
    const authorized = { ...r, performance: { ...r.performance!, mics: { me: { authorized: true, revocationPending: false } } } }
    rerender({ r: authorized, online: true }); expect(result.current.mic).toBe(true)
    rerender({ r: { ...authorized, performance: { ...authorized.performance!, state: 'playing' } }, online: true }); expect(result.current.mic).toBe(true)
    rerender({ r: { ...r, performance: { ...r.performance!, state: 'paused' } }, online: true })
    expect(result.current.mic).toBe(false); expect(result.current.track).toBeNull()
    expect(fixture.enable).toHaveBeenCalledWith(false)
  })
  it('ignores a late permission result after singer change and never automatically reopens the mic', async () => {
    let resolve!: () => void
    fixture.enable.mockImplementation((on: boolean) => on ? new Promise<void>(r => { resolve = r }) : Promise.resolve())
    const r = room(), { result, rerender } = mount(r)
    let preparing!: Promise<unknown>
    await act(async () => { preparing = result.current.prepareMic(false).catch(e => e); await Promise.resolve(); await Promise.resolve(); await Promise.resolve() })
    expect(resolve).toBeTypeOf('function')
    rerender({ r: { ...r, performance: { ...r.performance!, performanceId: 'p2', singerMemberId: 'friend' } }, online: true })
    await act(async () => { resolve(); await preparing })
    expect(result.current.mic).toBe(false); expect(result.current.track).toBeNull()
    expect(fixture.enable.mock.calls.filter(([on]) => on)).toHaveLength(1)
    expect(fixture.enable).toHaveBeenLastCalledWith(false)
  })
  it('shows permission recovery and permits an explicit retry', async () => {
    fixture.enable.mockImplementation(async (on: boolean) => { if (on) throw new DOMException('Denied', 'NotAllowedError') })
    const { result } = mount()
    await act(async () => { await expect(result.current.prepareMic(false)).rejects.toThrow('cài đặt trang') })
    expect(result.current.micError).toContain('Chuẩn bị mic'); expect(result.current.track).toBeNull()
    fixture.enable.mockResolvedValue(undefined)
    await act(() => result.current.prepareMic(true)); expect(result.current.mic).toBe(true); expect(result.current.micError).toBe('')
  })
  it('clears the meter on disconnect and does not auto-enable capture after reconnect', async () => {
    const r = room(), { result, rerender } = mount(r)
    await act(() => result.current.prepareMic(false))
    rerender({ r, online: false }); expect(result.current.track).toBeNull(); expect(result.current.mic).toBe(false)
    rerender({ r, online: true }); expect(fixture.enable.mock.calls.filter(([on]) => on)).toHaveLength(1)
  })
  it('selects only the current singer received track and tears it down on singer change or leave', async () => {
    const r = room(); r.performance = { ...r.performance!, singerMemberId: 'friend', mics: { friend: { authorized: true, revocationPending: false } }, state: 'playing' }
    const { result, rerender } = mount(r)
    await act(() => result.current.connectVoice())
    const v = fixture.rooms[0], el = document.createElement('audio'), media = { label: 'remote' }
    const audio = { kind: 'audio', mediaStreamTrack: media, attach: vi.fn(() => el), detach: vi.fn(() => [el]) }
    const pub = { track: audio, isMuted: false }
    v.remoteParticipants.set('friend', { getTrackPublication: () => pub })
    act(() => v.handlers.sub())
    expect(result.current.track).toBe(media); expect(el.volume).toBe(.7); expect(el.isConnected).toBe(true)
    pub.isMuted = true; act(() => v.handlers.muted()); expect(result.current.track).toBeNull(); expect(el.isConnected).toBe(false)
    pub.isMuted = false; act(() => v.handlers.unmuted()); expect(result.current.track).toBe(media)
    rerender({ r: { ...r, performance: { ...r.performance!, singerMemberId: 'other' } }, online: true })
    expect(result.current.track).toBeNull(); expect(el.isConnected).toBe(false)
    rerender({ r: null, online: true }); expect(v.disconnect).toHaveBeenCalled()
  })
  it('does not publish after an unmount while microphone permission is pending', async () => {
    let resolve!: () => void
    fixture.enable.mockImplementation((on: boolean) => on ? new Promise<void>(r => { resolve = r }) : Promise.resolve())
    const { result, unmount } = mount()
    let preparing!: Promise<unknown>
    await act(async () => { preparing = result.current.prepareMic(false).catch(e => e); await Promise.resolve(); await Promise.resolve(); await Promise.resolve() })
    unmount(); await act(async () => { resolve(); await preparing })
    expect(fixture.enable).toHaveBeenLastCalledWith(false)
  })
  it('receives two selected singers, ignores a third track, and keeps audio attached across reports',async()=>{
    const r=room();r.performance={...r.performance!,singerMemberId:'lead',duetMemberId:'duet',state:'playing',mics:{lead:{authorized:true,revocationPending:false},duet:{authorized:true,revocationPending:false}}}
    const volumes={lead:25,duet:90}
    const {result,rerender}=renderHook(({room})=>useKaraokeVoice(room,'listener',true,70,command,volumes),{initialProps:{room:r}})
    await act(()=>result.current.connectVoice())
    const v=fixture.rooms[0],audio:Record<string,any>={}
    for(const id of ['lead','duet','third']){
      const element=document.createElement('audio')
      audio[id]={kind:'audio',mediaStreamTrack:{label:id},attach:vi.fn(()=>element),detach:vi.fn(()=>[element])}
      v.remoteParticipants.set(id,{getTrackPublication:()=>({track:audio[id],isMuted:false})})
    }
    act(()=>v.handlers.sub())
    expect(Object.keys(result.current.tracks)).toEqual(['lead','duet'])
    expect(audio.lead.attach.mock.results[0].value.volume).toBe(.25);expect(audio.duet.attach.mock.results[0].value.volume).toBe(.9)
    expect(audio.third.attach).not.toHaveBeenCalled()
    rerender({room:{...r,revision:2}})
    expect(audio.lead.attach).toHaveBeenCalledTimes(1);expect(audio.duet.detach).not.toHaveBeenCalled()
    rerender({room:{...r,revision:3,performance:{...r.performance!,duetMemberId:null,mics:{lead:{authorized:true,revocationPending:false},duet:{authorized:false,revocationPending:false}}}}})
    expect(audio.duet.detach).toHaveBeenCalled();expect(result.current.tracks.duet).toBeUndefined()
  })
})
