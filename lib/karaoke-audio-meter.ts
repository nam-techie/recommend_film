export type SignalState = 'off' | 'waiting' | 'receiving' | 'silent' | 'unavailable'
export type SignalFrame = { state: SignalState; bands: Float32Array; db: number; level: number }
export const SIGNAL_BANDS = 40
export const SILENCE_DB = -50
export const SILENCE_MS = 3000

/** Analyses an existing LiveKit track. Never captures, plays, clones or stops it. */
export function monitorKaraokeTrack(track: MediaStreamTrack, onFrame: (frame: SignalFrame) => void) {
  let context: AudioContext | undefined, source: MediaStreamAudioSourceNode | undefined, analyser: AnalyserNode | undefined
  let raf = 0, stopped = false, lastFrame = -Infinity, quietSince: number | undefined
  const bands = new Float32Array(SIGNAL_BANDS)
  const rest = (state: SignalState) => { bands.fill(0); onFrame({ state, bands, db: -Infinity, level: 0 }) }
  const disconnect = () => {
    cancelAnimationFrame(raf)
    source?.disconnect(); analyser?.disconnect()
    if (context && context.state !== 'closed') void context.close().catch(() => {})
  }
  const fail = () => { if (!stopped) { stopped = true; disconnect(); rest('unavailable') } }
  let waveform: Float32Array<ArrayBuffer>, spectrum: Uint8Array<ArrayBuffer>
  const tick = (now: number) => {
    if (stopped || document.hidden) return
    raf = requestAnimationFrame(tick)
    if (now - lastFrame < 1000 / 30) return
    lastFrame = now
    try {
      if (track.readyState === 'ended' || track.muted || !track.enabled) { quietSince = undefined; rest('off'); return }
      if (context?.state !== 'running') { quietSince = undefined; rest('waiting'); return }
      analyser!.getFloatTimeDomainData(waveform)
      analyser!.getByteFrequencyData(spectrum)
      let sum = 0
      for (const value of waveform) sum += value * value
      const rms = Math.sqrt(sum / waveform.length), db = rms > 0 ? 20 * Math.log10(rms) : -Infinity
      if (db < SILENCE_DB) quietSince ??= now
      else quietSince = undefined
      // Logarithmic groups cover the useful vocal spectrum without synthetic activity.
      const low = 80, high = Math.min(12000, context.sampleRate / 2)
      for (let i = 0; i < SIGNAL_BANDS; i++) {
        const start = Math.max(1, Math.floor(low * (high / low) ** (i / SIGNAL_BANDS) * analyser!.fftSize / context.sampleRate))
        const end = Math.min(spectrum.length, Math.max(start + 1, Math.ceil(low * (high / low) ** ((i + 1) / SIGNAL_BANDS) * analyser!.fftSize / context.sampleRate)))
        let peak = 0
        for (let bin = start; bin < end; bin++) peak = Math.max(peak, spectrum[bin])
        bands[i] = db < SILENCE_DB ? 0 : peak / 255
      }
      onFrame({ state: quietSince === undefined ? 'receiving' : now - quietSince >= SILENCE_MS ? 'silent' : 'waiting', bands, db, level: Math.max(0, Math.min(1, (db + 60) / 60)) })
    } catch { fail() }
  }
  const resume = () => {
    if (stopped || document.hidden) return
    quietSince = undefined; lastFrame = -Infinity
    cancelAnimationFrame(raf)
    void context?.resume().catch(fail)
    raf = requestAnimationFrame(tick)
  }
  const visibility = () => {
    if (stopped) return
    cancelAnimationFrame(raf); quietSince = undefined
    if (document.hidden) { rest('waiting'); void context?.suspend().catch(fail) }
    else resume()
  }
  const ended = () => { if (!stopped) { stopped = true; disconnect(); rest('off') } }
  const muted = () => { quietSince = undefined; rest('off') }
  try {
    context = new AudioContext()
    analyser = context.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = .65
    waveform = new Float32Array(analyser.fftSize); spectrum = new Uint8Array(analyser.frequencyBinCount)
    source = context.createMediaStreamSource(new MediaStream([track])); source.connect(analyser)
    // No connection to context.destination: the local mic must never feed the speakers.
    document.addEventListener('visibilitychange', visibility)
    track.addEventListener('ended', ended); track.addEventListener('mute', muted); track.addEventListener('unmute', resume)
    rest('waiting')
    if (document.hidden) visibility(); else resume()
  } catch { fail() }
  return () => {
    stopped = true; disconnect()
    document.removeEventListener('visibilitychange', visibility)
    track.removeEventListener('ended', ended); track.removeEventListener('mute', muted); track.removeEventListener('unmute', resume)
    rest('off')
  }
}
