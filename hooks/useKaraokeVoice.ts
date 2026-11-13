'use client'

import { useEffect, useRef, useState } from 'react'
import { Room, RoomEvent, Track } from 'livekit-client'
import type { KaraokeRoom } from '@/lib/karaoke-types'
import { karaokeVoiceError } from '@/lib/karaoke-voice-error'

type Command = (event: string, data?: object) => Promise<any>
const defaultParticipantVolumes: Record<string, number> = {}
export function useKaraokeVoice(room: KaraokeRoom | null, uid: string | undefined, connected: boolean, volume: number, command: Command, participantVolumes: Record<string, number> = defaultParticipantVolumes) {
  const voice = useRef<Room>(), generation = useRef(0), micOn = useRef(false), connecting = useRef<Promise<void>>(), alive = useRef(true)
  const elements = useRef(new Map<Track, HTMLMediaElement[]>())
  const [mic, setMic] = useState(false), [pending, setPending] = useState(false), [micError, setMicError] = useState('')
  const [track, setTrack] = useState<MediaStreamTrack | null>(null), [voiceState, setVoiceState] = useState('Chưa kết nối giọng hát')
  const [tracks, setTracks] = useState<Record<string, MediaStreamTrack>>({})
  const [settings, setSettings] = useState<object>({})
  const current = useRef({ room, uid, connected, volume, command, participantVolumes }); current.current = { room, uid, connected, volume, command, participantVolumes }
  const clearElements = () => { elements.current.forEach((els, t) => { t.detach(); els.forEach(el => el.remove()) }); elements.current.clear() }
  const mute = () => {
    generation.current++; micOn.current = false; setMic(false); setTrack(null); setPending(false)
    setTracks(old => { const next={...old}; if (current.current.uid) delete next[current.current.uid]; return next })
    void voice.current?.localParticipant.setMicrophoneEnabled(false).catch(() => {})
  }
  const syncTracks = () => {
    const v = voice.current, { room: r, uid: user, connected: online, volume: gain } = current.current
    const p = r?.performance
    if (!v || v.state !== 'connected' || !online || !p || p.state === 'ended') { clearElements(); setTrack(null); setTracks({}); return }
    const received: Record<string, MediaStreamTrack> = {}
    const wanted = new Set<Track>()
    for (const id of [p.singerMemberId,p.duetMemberId]) {
      if (!id) continue
      if (id === user && p.mics[id]?.authorized && !p.mics[id]?.revocationPending) {
        const publication=v.localParticipant.getTrackPublication(Track.Source.Microphone)
        if (micOn.current && publication && !publication.isMuted && publication.track) received[id]=publication.track.mediaStreamTrack
        continue
      }
      if (p.state !== 'playing' || !p.mics[id]?.authorized || p.mics[id]?.revocationPending) continue
      const publication=v.remoteParticipants.get(id)?.getTrackPublication(Track.Source.Microphone), audio=publication?.track
      if (!audio || publication?.isMuted || audio.kind !== Track.Kind.Audio) continue
      wanted.add(audio)
      let attached = elements.current.get(audio)
      if (!attached) { const el=audio.attach() as HTMLMediaElement; document.body.appendChild(el); attached=[el]; elements.current.set(audio,attached) }
      attached.forEach(el => { el.volume=(current.current.participantVolumes[id] ?? gain)/100 })
      received[id]=audio.mediaStreamTrack
    }
    elements.current.forEach((els, audio) => { if (!wanted.has(audio)) { audio.detach(); els.forEach(el=>el.remove()); elements.current.delete(audio) } })
    setTracks(received); setTrack(received[user || ''] || received[p.singerMemberId] || null)
  }

  useEffect(() => { syncTracks() }, [volume, participantVolumes]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    mute(); setMicError(''); syncTracks()
  // Changing a performance invalidates in-flight permission requests.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, room?.performance?.performanceId, room?.performance?.singerMemberId, uid, connected])
  useEffect(() => {
    if (room?.performance?.state !== 'playing') mute()
    syncTracks()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.performance?.state])
  useEffect(() => {
    if (!uid || !room?.performance?.mics[uid]?.authorized || room.performance.mics[uid]?.revocationPending) mute()
    syncTracks()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.revision, uid])
  useEffect(() => {
    if (!room || !connected) { clearElements(); void voice.current?.disconnect() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, connected])
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false; mute(); clearElements(); void voice.current?.disconnect(); voice.current = undefined }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { mute(); clearElements(); void voice.current?.disconnect(); voice.current = undefined }, [room?.id, uid]) // eslint-disable-line react-hooks/exhaustive-deps

  const connectVoice = async () => {
    if (voice.current?.state === 'connected') { await voice.current.startAudio(); syncTracks(); return }
    if (connecting.current) return connecting.current
    const task = (async () => {
      const expectedRoom = current.current.room?.id, expectedUid = current.current.uid
      await voice.current?.disconnect(); clearElements()
      const c = await current.current.command('voice:credentials')
      if (!alive.current || !current.current.connected || current.current.room?.id !== expectedRoom || current.current.uid !== expectedUid) throw Error('Phòng đã thay đổi. Hãy kết nối lại âm thanh.')
      const v = new Room(); voice.current = v
      const sync = () => { if (voice.current === v) syncTracks() }
      v.on(RoomEvent.TrackSubscribed, sync).on(RoomEvent.TrackUnsubscribed, sync).on(RoomEvent.TrackMuted, sync).on(RoomEvent.TrackUnmuted, sync)
      v.on(RoomEvent.LocalTrackUnpublished, () => { if (voice.current === v) { mute(); sync() } })
      v.on(RoomEvent.ConnectionStateChanged, state => {
        if (voice.current !== v) return
        setVoiceState(state === 'connected' ? 'Đã kết nối giọng hát' : state === 'connecting' ? 'Đang kết nối giọng hát…' : state === 'reconnecting' ? 'Đang kết nối lại giọng hát…' : 'Chưa kết nối giọng hát')
        if (state !== 'connected') { mute(); clearElements() }
        else sync()
      })
      v.on(RoomEvent.Reconnecting, () => { mute(); void current.current.command('voice:release', { performanceId: current.current.room?.performance?.performanceId }).catch(() => {}) })
      await v.connect(c.serverUrl, c.participantToken)
      if (!alive.current || !current.current.connected || current.current.room?.id !== expectedRoom || current.current.uid !== expectedUid || voice.current !== v) { await v.disconnect(); throw Error('Phòng đã thay đổi. Hãy kết nối lại âm thanh.') }
      await v.startAudio(); sync()
    })()
    connecting.current = task
    try { await task }
    catch {
      mute(); clearElements()
      const failed = voice.current
      voice.current = undefined
      void failed?.disconnect().catch(() => {})
      throw Error(karaokeVoiceError(null, 'connection'))
    } finally { if (connecting.current === task) connecting.current = undefined }
  }
  const prepareMic = async (filtered: boolean) => {
    // Connection-state events may invalidate the generation while connecting.
    setMicError(''); setPending(true)
    const performanceId = current.current.room?.performance?.performanceId
    let phase: 'connection' | 'microphone' = 'connection'
    try {
      await connectVoice()
      phase = 'microphone'
      const ticket = ++generation.current, v = voice.current!
      const valid = () => alive.current && generation.current === ticket && current.current.connected && !!performanceId && current.current.room?.performance?.performanceId === performanceId && [current.current.room?.performance?.singerMemberId,current.current.room?.performance?.duetMemberId].includes(current.current.uid || '') && voice.current === v && v?.state === 'connected'
      if (!valid()) throw Error('Lượt hát đã thay đổi. Hãy chuẩn bị mic lại.')
      setPending(true)
      await current.current.command('voice:authorize', { performanceId })
      for (let i = 0; i < 20 && !v.localParticipant.permissions?.canPublish && valid(); i++) await new Promise(r => setTimeout(r, 100))
      if (!valid()) throw Error('Lượt hát đã thay đổi. Hãy chuẩn bị mic lại.')
      await v.localParticipant.setMicrophoneEnabled(true, { echoCancellation: filtered, noiseSuppression: filtered, autoGainControl: filtered, channelCount: 1 }, { audioPreset: { maxBitrate: 64000 }, dtx: false, red: true })
      if (!valid()) { await v.localParticipant.setMicrophoneEnabled(false); throw Error('Lượt hát đã thay đổi. Mic đã tắt.') }
      const media = v.localParticipant.getTrackPublication(Track.Source.Microphone)?.track?.mediaStreamTrack
      const s = media?.getSettings()
      setSettings({ echoCancellation: s?.echoCancellation, noiseSuppression: s?.noiseSuppression, autoGainControl: s?.autoGainControl, channelCount: s?.channelCount, sampleRate: s?.sampleRate })
      micOn.current = true; setMic(true); syncTracks()
    } catch (e) {
      mute()
      void current.current.command('voice:release', { performanceId }).catch(() => {})
      const message = karaokeVoiceError(e, phase)
      setMicError(message); throw Error(message)
    } finally { setPending(false) }
  }
  return { mic, pending, micError, track, tracks, voiceState, settings, connectVoice, prepareMic, mute }
}
