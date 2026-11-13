import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { monitorKaraokeTrack, type SignalFrame } from '@/lib/karaoke-audio-meter'

describe('real-track karaoke analyser', () => {
  let frames: SignalFrame[], callbacks: Map<number, FrameRequestCallback>, next: number, hidden: boolean, amplitude: number
  let track: MediaStreamTrack, analyser: any, source: any, context: any, stop: (() => void) | undefined
  const step = (time: number) => { const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach(fn => fn(time)) }
  beforeEach(() => {
    frames = []; callbacks = new Map(); next = 0; hidden = false; amplitude = 0
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden)
    vi.stubGlobal('requestAnimationFrame', vi.fn((fn: FrameRequestCallback) => { callbacks.set(++next, fn); return next }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => callbacks.delete(id)))
    track = Object.assign(new EventTarget(), { readyState: 'live', muted: false, enabled: true, stop: vi.fn() }) as unknown as MediaStreamTrack
    analyser = { fftSize: 2048, frequencyBinCount: 1024, getFloatTimeDomainData: vi.fn((data: Float32Array) => data.fill(amplitude)), getByteFrequencyData: vi.fn((data: Uint8Array) => data.fill(amplitude ? 128 : 0)), disconnect: vi.fn() }
    source = { connect: vi.fn(), disconnect: vi.fn() }
    context = { state: 'running', sampleRate: 48000, createAnalyser: vi.fn(() => analyser), createMediaStreamSource: vi.fn(() => source), resume: vi.fn(async () => { context.state = 'running' }), suspend: vi.fn(async () => { context.state = 'suspended' }), close: vi.fn(async () => { context.state = 'closed' }) }
    vi.stubGlobal('AudioContext', function () { return context })
    vi.stubGlobal('MediaStream', function (tracks: MediaStreamTrack[]) { return { getTracks: () => tracks } })
  })
  afterEach(() => { stop?.(); stop = undefined; vi.unstubAllGlobals() })
  const start = () => { stop = monitorKaraokeTrack(track, f => frames.push({ ...f, bands: f.bands.slice() })) }
  it('uses the supplied track, emits 40 measured bands and never routes to speakers or stops the mic', () => {
    amplitude = .1; start(); step(0)
    expect(frames.at(-1)).toMatchObject({ state: 'receiving', db: expect.closeTo(-20), level: expect.any(Number) })
    expect(frames.at(-1)!.bands).toHaveLength(40)
    expect([...frames.at(-1)!.bands].every(n => n > 0)).toBe(true)
    expect(context.createMediaStreamSource.mock.calls[0][0].getTracks()).toEqual([track])
    expect(source.connect).toHaveBeenCalledExactlyOnceWith(analyser)
    stop!(); expect(track.stop).not.toHaveBeenCalled(); expect(context.close).toHaveBeenCalledOnce()
    expect(frames.at(-1)).toMatchObject({ state: 'off', level: 0 })
    expect(callbacks.size).toBe(0)
  })
  it('waits three continuous seconds below -50 dBFS, then recovers on signal', () => {
    amplitude = .001; start(); step(0); step(2960)
    expect(frames.at(-1)!.state).toBe('waiting')
    step(3040); expect(frames.at(-1)!.state).toBe('silent')
    expect([...frames.at(-1)!.bands].every(n => n === 0)).toBe(true)
    amplitude = .01; step(3080); expect(frames.at(-1)!.state).toBe('receiving')
    amplitude = 0; step(3120); expect(frames.at(-1)!.state).toBe('waiting')
  })
  it('caps drawing at 30 fps and suspends while hidden, resetting the silence clock on return', () => {
    start(); step(0); step(10); step(20); step(34)
    expect(analyser.getFloatTimeDomainData).toHaveBeenCalledTimes(2)
    hidden = true; document.dispatchEvent(new Event('visibilitychange'))
    expect(context.suspend).toHaveBeenCalledOnce(); expect(callbacks.size).toBe(0)
    expect(frames.at(-1)!.level).toBe(0)
    hidden = false; document.dispatchEvent(new Event('visibilitychange')); step(10000)
    expect(frames.at(-1)!.state).toBe('waiting')
  })
  it('clears real activity on mute/end and removes listeners on teardown', () => {
    amplitude = .2; start(); step(0)
    Object.assign(track, { muted: true }); track.dispatchEvent(new Event('mute')); step(40)
    expect(frames.at(-1)).toMatchObject({ state: 'off', level: 0 })
    Object.assign(track, { muted: false }); track.dispatchEvent(new Event('unmute')); step(80)
    expect(frames.at(-1)!.state).toBe('receiving')
    Object.assign(track, { readyState: 'ended' }); track.dispatchEvent(new Event('ended'))
    expect(callbacks.size).toBe(0); expect(frames.at(-1)!.state).toBe('off')
    stop!(); const count = frames.length
    document.dispatchEvent(new Event('visibilitychange')); track.dispatchEvent(new Event('unmute'))
    expect(frames).toHaveLength(count)
  })
  it('contains analyser failures without touching the LiveKit capture track', () => {
    start(); analyser.getFloatTimeDomainData.mockImplementation(() => { throw Error('unavailable') }); step(0)
    expect(frames.at(-1)!.state).toBe('unavailable'); expect(callbacks.size).toBe(0)
    expect(track.stop).not.toHaveBeenCalled(); expect(context.close).toHaveBeenCalledOnce()
  })
  it('degrades when Web Audio is unsupported', () => {
    vi.stubGlobal('AudioContext', undefined); start()
    expect(frames.at(-1)!.state).toBe('unavailable'); expect(track.stop).not.toHaveBeenCalled()
  })
})
