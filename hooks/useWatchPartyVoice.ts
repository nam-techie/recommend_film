'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LiveKitVoiceProvider } from '@/lib/livekit-voice-provider'
import { VoiceProviderSnapshot } from '@/lib/voice-provider'

interface Props {
  memberId?: string
  voiceEnabled: boolean
  canPublish?: boolean
  authorizeMicrophone?: () => Promise<void>
  getVoiceCredentials: () => Promise<{ serverUrl: string; participantToken: string }>
}

const initialSnapshot: VoiceProviderSnapshot = {
  connectionState: 'idle',
  participants: [],
  micEnabled: false,
  speakerEnabled: true,
  audioPlaybackBlocked: false,
  error: null,
}

export function useWatchPartyVoice({ memberId, voiceEnabled, canPublish = false, authorizeMicrophone, getVoiceCredentials }: Props) {
  const providerRef = useRef<LiveKitVoiceProvider | null>(null)
  const connectAttemptRef = useRef(0)
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [credentialError, setCredentialError] = useState<string | null>(null)

  useEffect(() => {
    const provider = new LiveKitVoiceProvider()
    providerRef.current = provider
    const unsubscribe = provider.subscribe(setSnapshot)
    return () => {
      connectAttemptRef.current += 1
      unsubscribe()
      providerRef.current = null
      void provider.disconnect()
    }
  }, [])

  useEffect(() => {
    const provider = providerRef.current
    if (!provider) return
    const attempt = ++connectAttemptRef.current
    if (!voiceEnabled || !memberId) {
      setCredentialError(null)
      void provider.disconnect()
      return
    }
    setCredentialError(null)
    void getVoiceCredentials()
      .then((credentials) => {
        if (attempt !== connectAttemptRef.current) return
        return provider.connect(credentials)
      })
      .catch((error) => setCredentialError(error instanceof Error ? error.message : 'Không thể lấy quyền truy cập voice.'))
    return () => { connectAttemptRef.current += 1 }
  }, [getVoiceCredentials, memberId, voiceEnabled])

  useEffect(() => {
    if (!canPublish) void providerRef.current?.disableMicrophone().catch(() => undefined)
  }, [canPublish])
  const toggleMic = useCallback(async () => {
    const provider = providerRef.current
    if (!provider || !voiceEnabled) return
    try {
      if (snapshot.micEnabled) await provider.disableMicrophone()
      else {
        if (!canPublish || !authorizeMicrophone) { setCredentialError('Cần Ultra và ghế VIP đã xác nhận để mở mic.'); return }
        await authorizeMicrophone()
        await provider.enableMicrophone()
        setCredentialError(null)
      }
    } catch (error) { setCredentialError(error instanceof Error ? error.message : 'Chưa mở được microphone.') }
  }, [snapshot.micEnabled, voiceEnabled, canPublish, authorizeMicrophone])

  const toggleSpeaker = useCallback(() => {
    const provider = providerRef.current
    if (!provider) return
    if (snapshot.audioPlaybackBlocked || !snapshot.speakerEnabled) void provider.startAudio().catch(() => undefined)
    else provider.setSpeakerEnabled(false)
  }, [snapshot.audioPlaybackBlocked, snapshot.speakerEnabled])

  const startAudio = useCallback(() => providerRef.current?.startAudio().catch(() => undefined), [])
  const speakingMemberIds = useMemo(() => new Set(snapshot.participants.filter((participant) => participant.isSpeaking).map((participant) => participant.memberId)), [snapshot.participants])
  const participantsById = useMemo(() => new Map(snapshot.participants.map((participant) => [participant.memberId, participant])), [snapshot.participants])

  return {
    ...snapshot,
    error: snapshot.error || credentialError,
    voiceJoined: snapshot.connectionState === 'ready' || snapshot.connectionState === 'degraded' || snapshot.connectionState === 'reconnecting',
    speakingMemberIds,
    participantsById,
    toggleMic,
    toggleSpeaker,
    startAudio,
    leaveVoice: () => providerRef.current?.disconnect(),
  }
}
