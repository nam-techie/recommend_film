'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { WatchPartyMember } from '@/lib/watch-party-types'

interface VoiceSignal {
  fromMemberId: string
  description?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
}

interface VoiceBridge {
  setMicState: (enabled: boolean) => Promise<{ ok: boolean; code?: string }>
  sendVoiceSignal: (targetMemberId: string, signal: { description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }) => void
  subscribeVoiceSignal: (listener: (signal: VoiceSignal) => void) => () => void
}

interface Props extends VoiceBridge {
  memberId?: string
  members: Record<string, WatchPartyMember>
  voiceEnabled: boolean
}

const defaultIceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]

function iceServers() {
  const raw = process.env.NEXT_PUBLIC_WATCH_PARTY_ICE_SERVERS_JSON
  if (!raw) return defaultIceServers
  try {
    const parsed = JSON.parse(raw) as RTCIceServer[]
    return Array.isArray(parsed) && parsed.length ? parsed : defaultIceServers
  } catch {
    return defaultIceServers
  }
}

export function useWatchPartyVoice({ memberId, members, voiceEnabled, setMicState, sendVoiceSignal, subscribeVoiceSignal }: Props) {
  const localStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef(new Map<string, RTCPeerConnection>())
  const offeredPeersRef = useRef(new Set<string>())
  const pendingCandidatesRef = useRef(new Map<string, RTCIceCandidateInit[]>())
  const audioElementsRef = useRef(new Map<string, HTMLAudioElement>())
  const monitorTimersRef = useRef(new Map<string, number>())
  const audioContextRef = useRef<AudioContext | null>(null)
  const [voiceJoined, setVoiceJoined] = useState(false)
  const [micEnabled, setMicEnabled] = useState(false)
  const [speakingMemberIds, setSpeakingMemberIds] = useState<Set<string>>(() => new Set())
  const [error, setError] = useState<string | null>(null)

  const markSpeaking = useCallback((id: string, speaking: boolean) => {
    setSpeakingMemberIds((current) => {
      if (current.has(id) === speaking) return current
      const next = new Set(current)
      if (speaking) next.add(id); else next.delete(id)
      return next
    })
  }, [])

  const monitorStream = useCallback((id: string, stream: MediaStream) => {
    if (monitorTimersRef.current.has(id)) return
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const context = audioContextRef.current || new AudioContextClass()
    audioContextRef.current = context
    void context.resume().catch(() => undefined)
    const source = context.createMediaStreamSource(stream)
    const analyser = context.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    const values = new Uint8Array(analyser.fftSize)
    const timer = window.setInterval(() => {
      analyser.getByteTimeDomainData(values)
      let sum = 0
      for (const value of values) { const normalized = (value - 128) / 128; sum += normalized * normalized }
      markSpeaking(id, Math.sqrt(sum / values.length) > 0.045)
    }, 180)
    monitorTimersRef.current.set(id, timer)
  }, [markSpeaking])

  const closePeer = useCallback((remoteMemberId: string) => {
    peersRef.current.get(remoteMemberId)?.close()
    peersRef.current.delete(remoteMemberId)
    offeredPeersRef.current.delete(remoteMemberId)
    pendingCandidatesRef.current.delete(remoteMemberId)
    const audio = audioElementsRef.current.get(remoteMemberId)
    if (audio) { audio.pause(); audio.srcObject = null }
    audioElementsRef.current.delete(remoteMemberId)
    const timer = monitorTimersRef.current.get(remoteMemberId)
    if (timer) window.clearInterval(timer)
    monitorTimersRef.current.delete(remoteMemberId)
    markSpeaking(remoteMemberId, false)
  }, [markSpeaking])

  const cleanupVoice = useCallback(() => {
    peersRef.current.forEach((_peer, id) => closePeer(id))
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    if (memberId) {
      const timer = monitorTimersRef.current.get(memberId)
      if (timer) window.clearInterval(timer)
      monitorTimersRef.current.delete(memberId)
      markSpeaking(memberId, false)
    }
    if (audioContextRef.current) void audioContextRef.current.close().catch(() => undefined)
    audioContextRef.current = null
    setVoiceJoined(false)
    setMicEnabled(false)
  }, [closePeer, markSpeaking, memberId])

  const createPeer = useCallback((remoteMemberId: string) => {
    const existing = peersRef.current.get(remoteMemberId)
    if (existing) return existing
    const peer = new RTCPeerConnection({ iceServers: iceServers() })
    const transceiver = peer.addTransceiver('audio', { direction: 'sendrecv' })
    const localTrack = localStreamRef.current?.getAudioTracks()[0]
    if (localTrack) void transceiver.sender.replaceTrack(localTrack)
    peer.onicecandidate = (event) => { if (event.candidate) sendVoiceSignal(remoteMemberId, { candidate: event.candidate.toJSON() }) }
    peer.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track])
      let audio = audioElementsRef.current.get(remoteMemberId)
      if (!audio) { audio = new Audio(); audio.autoplay = true; audioElementsRef.current.set(remoteMemberId, audio) }
      audio.srcObject = stream
      void audio.play().catch(() => setError('Hãy bấm biểu tượng mic để bật âm thanh phòng.'))
      monitorStream(remoteMemberId, stream)
    }
    peer.onconnectionstatechange = () => { if (peer.connectionState === 'failed' || peer.connectionState === 'closed') closePeer(remoteMemberId) }
    peersRef.current.set(remoteMemberId, peer)
    return peer
  }, [closePeer, monitorStream, sendVoiceSignal])

  const makeOffer = useCallback(async (remoteMemberId: string) => {
    if (offeredPeersRef.current.has(remoteMemberId)) return
    const peer = createPeer(remoteMemberId)
    if (peer.signalingState !== 'stable') return
    offeredPeersRef.current.add(remoteMemberId)
    const offer = await peer.createOffer()
    await peer.setLocalDescription(offer)
    sendVoiceSignal(remoteMemberId, { description: offer })
  }, [createPeer, sendVoiceSignal])

  useEffect(() => {
    if (!voiceEnabled) { cleanupVoice(); return }
    if (!voiceJoined || !memberId) return
    const connectedIds = Object.values(members).filter((member) => member.connected && member.voiceJoined && member.memberId !== memberId).map((member) => member.memberId)
    connectedIds.forEach((remoteMemberId) => {
      createPeer(remoteMemberId)
      if (memberId.localeCompare(remoteMemberId) < 0) void makeOffer(remoteMemberId).catch(() => setError('Không thể kết nối voice với một thành viên.'))
    })
    peersRef.current.forEach((_peer, remoteMemberId) => { if (!connectedIds.includes(remoteMemberId)) closePeer(remoteMemberId) })
  }, [cleanupVoice, closePeer, createPeer, makeOffer, memberId, members, voiceEnabled, voiceJoined])

  useEffect(() => subscribeVoiceSignal((signal) => {
    if (!voiceJoined || !voiceEnabled || !memberId) return
    void (async () => {
      const peer = createPeer(signal.fromMemberId)
      if (signal.description) {
        await peer.setRemoteDescription(signal.description)
        const queued = pendingCandidatesRef.current.get(signal.fromMemberId) || []
        for (const candidate of queued) await peer.addIceCandidate(candidate)
        pendingCandidatesRef.current.delete(signal.fromMemberId)
        if (signal.description.type === 'offer') {
          const answer = await peer.createAnswer()
          await peer.setLocalDescription(answer)
          sendVoiceSignal(signal.fromMemberId, { description: answer })
        }
      }
      if (signal.candidate) {
        if (peer.remoteDescription) await peer.addIceCandidate(signal.candidate)
        else pendingCandidatesRef.current.set(signal.fromMemberId, [...(pendingCandidatesRef.current.get(signal.fromMemberId) || []), signal.candidate])
      }
    })().catch(() => setError('Kết nối voice đang được thử lại.'))
  }), [createPeer, memberId, sendVoiceSignal, subscribeVoiceSignal, voiceEnabled, voiceJoined])

  useEffect(() => () => cleanupVoice(), [cleanupVoice])

  const toggleMic = useCallback(async () => {
    setError(null)
    if (!voiceEnabled) { setError('Host chưa mở voice cho phòng.'); return }
    if (!memberId) return
    let stream = localStreamRef.current
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false })
        localStreamRef.current = stream
        monitorStream(memberId, stream)
        setVoiceJoined(true)
      } catch (nextError) {
        const name = nextError instanceof DOMException ? nextError.name : ''
        setError(name === 'NotAllowedError' ? 'Bạn chưa cấp quyền sử dụng microphone.' : 'Không mở được microphone trên thiết bị này.')
        return
      }
    }
    const next = !micEnabled
    const track = stream.getAudioTracks()[0]
    if (track) track.enabled = next
    for (const peer of peersRef.current.values()) {
      const sender = peer.getTransceivers().find((item) => item.receiver.track.kind === 'audio')?.sender
      if (sender && sender.track !== track) await sender.replaceTrack(track || null)
    }
    const ack = await setMicState(next)
    if (!ack.ok) {
      if (track) track.enabled = false
      setError(ack.code === 'VOICE_DISABLED' ? 'Host vừa tắt voice của phòng.' : 'Không cập nhật được trạng thái mic.')
      setMicEnabled(false)
      return
    }
    setMicEnabled(next)
  }, [memberId, micEnabled, monitorStream, setMicState, voiceEnabled])

  return { voiceJoined, micEnabled, speakingMemberIds, error, toggleMic, leaveVoice: cleanupVoice }
}
