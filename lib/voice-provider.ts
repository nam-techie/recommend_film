import { VoiceConnectionState, VoiceParticipant } from '@/lib/watch-party-types'

export interface VoiceCredentials {
  serverUrl: string
  participantToken: string
}

export interface VoiceProviderSnapshot {
  connectionState: VoiceConnectionState
  participants: VoiceParticipant[]
  micEnabled: boolean
  speakerEnabled: boolean
  audioPlaybackBlocked: boolean
  error: string | null
}

export type VoiceProviderListener = (snapshot: VoiceProviderSnapshot) => void

export interface VoiceProvider {
  connect(credentials: VoiceCredentials): Promise<void>
  disconnect(): Promise<void>
  enableMicrophone(): Promise<void>
  disableMicrophone(): Promise<void>
  setSpeakerEnabled(enabled: boolean): void
  startAudio(): Promise<void>
  getSnapshot(): VoiceProviderSnapshot
  subscribe(listener: VoiceProviderListener): () => void
}
