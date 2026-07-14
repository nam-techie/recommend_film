'use client'

import {
  ConnectionQuality,
  DisconnectReason,
  RemoteAudioTrack,
  RemoteParticipant,
  Room,
  RoomEvent,
  Track,
} from 'livekit-client'
import { VoiceConnectionQuality, VoiceParticipant } from '@/lib/watch-party-types'
import { VoiceCredentials, VoiceProvider, VoiceProviderListener, VoiceProviderSnapshot } from '@/lib/voice-provider'

const initialSnapshot = (): VoiceProviderSnapshot => ({
  connectionState: 'idle',
  participants: [],
  micEnabled: false,
  speakerEnabled: true,
  audioPlaybackBlocked: false,
  error: null,
})

function mapQuality(quality: ConnectionQuality): VoiceConnectionQuality {
  if (quality === ConnectionQuality.Excellent) return 'excellent'
  if (quality === ConnectionQuality.Good) return 'good'
  if (quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost) return 'poor'
  return 'unknown'
}

function remoteVoiceParticipant(participant: RemoteParticipant): VoiceParticipant {
  const microphone = [...participant.audioTrackPublications.values()].find((publication) => publication.source === Track.Source.Microphone)
  return {
    memberId: participant.identity,
    connected: true,
    micEnabled: Boolean(microphone && !microphone.isMuted),
    audioSubscribed: Boolean(microphone?.isSubscribed),
    isSpeaking: participant.isSpeaking,
    connectionQuality: mapQuality(participant.connectionQuality),
  }
}

export class LiveKitVoiceProvider implements VoiceProvider {
  private room: Room | null = null
  private listeners = new Set<VoiceProviderListener>()
  private audioElements = new Map<string, HTMLAudioElement>()
  private snapshot = initialSnapshot()
  private intentionalDisconnect = false

  getSnapshot() { return { ...this.snapshot, participants: [...this.snapshot.participants] } }

  subscribe(listener: VoiceProviderListener) {
    this.listeners.add(listener)
    listener(this.getSnapshot())
    return () => this.listeners.delete(listener)
  }

  private update(patch: Partial<VoiceProviderSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch }
    const next = this.getSnapshot()
    this.listeners.forEach((listener) => listener(next))
  }

  private syncParticipants() {
    if (!this.room) return
    const local = this.room.localParticipant
    const participants: VoiceParticipant[] = [{
      memberId: local.identity,
      connected: true,
      micEnabled: local.isMicrophoneEnabled,
      audioSubscribed: true,
      isSpeaking: local.isSpeaking,
      connectionQuality: mapQuality(local.connectionQuality),
    }, ...[...this.room.remoteParticipants.values()].map(remoteVoiceParticipant)]
    this.update({ participants, micEnabled: local.isMicrophoneEnabled })
  }

  private attachTrack(track: RemoteAudioTrack) {
    const trackSid = track.sid
    if (!trackSid || this.audioElements.has(trackSid)) return
    const element = track.attach()
    element.autoplay = true
    element.muted = !this.snapshot.speakerEnabled
    element.dataset.watchPartyVoice = trackSid
    element.style.display = 'none'
    document.body.appendChild(element)
    this.audioElements.set(trackSid, element)
  }

  private detachTrack(track: RemoteAudioTrack) {
    const trackSid = track.sid
    if (!trackSid) return
    const element = this.audioElements.get(trackSid)
    if (!element) return
    track.detach(element)
    element.remove()
    this.audioElements.delete(trackSid)
  }

  private bindRoom(room: Room) {
    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Audio && track.source === Track.Source.Microphone) this.attachTrack(track as RemoteAudioTrack)
      this.syncParticipants()
    })
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      if (track.kind === Track.Kind.Audio) this.detachTrack(track as RemoteAudioTrack)
      this.syncParticipants()
    })
    room.on(RoomEvent.TrackPublished, () => this.syncParticipants())
    room.on(RoomEvent.TrackUnpublished, () => this.syncParticipants())
    room.on(RoomEvent.TrackMuted, () => this.syncParticipants())
    room.on(RoomEvent.TrackUnmuted, () => this.syncParticipants())
    room.on(RoomEvent.LocalTrackPublished, () => this.syncParticipants())
    room.on(RoomEvent.LocalTrackUnpublished, () => this.syncParticipants())
    room.on(RoomEvent.ParticipantConnected, () => this.syncParticipants())
    room.on(RoomEvent.ParticipantDisconnected, () => this.syncParticipants())
    room.on(RoomEvent.ActiveSpeakersChanged, () => this.syncParticipants())
    room.on(RoomEvent.ConnectionQualityChanged, () => this.syncParticipants())
    room.on(RoomEvent.Reconnecting, () => this.update({ connectionState: 'reconnecting', error: null }))
    room.on(RoomEvent.Reconnected, () => { this.syncParticipants(); this.update({ connectionState: 'ready', error: null }) })
    room.on(RoomEvent.TrackSubscriptionFailed, () => this.update({ connectionState: 'degraded', error: 'Không nhận được một luồng âm thanh trong phòng.' }))
    room.on(RoomEvent.MediaDevicesError, () => this.update({ error: 'Microphone không khả dụng. Hãy kiểm tra quyền và thiết bị đầu vào.' }))
    room.on(RoomEvent.AudioPlaybackStatusChanged, () => this.update({ audioPlaybackBlocked: !room.canPlaybackAudio }))
    room.on(RoomEvent.Disconnected, (reason) => {
      if (this.intentionalDisconnect) return
      const message = reason === DisconnectReason.ROOM_DELETED ? 'Host đã tắt voice của phòng.' : 'Kết nối voice đã bị ngắt.'
      this.update({ connectionState: 'failed', micEnabled: false, error: message })
    })
  }

  async connect(credentials: VoiceCredentials) {
    await this.disconnect()
    this.intentionalDisconnect = false
    this.snapshot = { ...initialSnapshot(), connectionState: 'joining' }
    this.update({})
    const room = new Room({
      audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      publishDefaults: { audioPreset: { maxBitrate: 24_000 }, dtx: true, red: true, stopMicTrackOnMute: false },
    })
    this.room = room
    this.bindRoom(room)
    try {
      await room.connect(credentials.serverUrl, credentials.participantToken, { autoSubscribe: true })
      for (const participant of room.remoteParticipants.values()) {
        for (const publication of participant.audioTrackPublications.values()) {
          if (publication.source === Track.Source.Microphone && publication.track?.kind === Track.Kind.Audio) this.attachTrack(publication.track as RemoteAudioTrack)
        }
      }
      this.syncParticipants()
      this.update({ connectionState: 'ready', audioPlaybackBlocked: !room.canPlaybackAudio, error: null })
    } catch (error) {
      await this.disconnect()
      this.update({ connectionState: 'failed', error: error instanceof Error ? error.message : 'Không thể kết nối voice.' })
      throw error
    }
  }

  async disconnect() {
    this.intentionalDisconnect = true
    const room = this.room
    this.room = null
    this.audioElements.forEach((element) => element.remove())
    this.audioElements.clear()
    if (room) await room.disconnect()
    this.snapshot = { ...initialSnapshot(), speakerEnabled: this.snapshot.speakerEnabled }
    this.update({})
  }

  async enableMicrophone() {
    if (!this.room) throw new Error('Voice chưa kết nối.')
    try {
      await this.room.localParticipant.setMicrophoneEnabled(true, { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }, { audioPreset: { maxBitrate: 24_000 }, dtx: true, red: true })
      this.syncParticipants()
      this.update({ error: null })
    } catch (error) {
      this.update({ error: 'Không mở được microphone. Hãy kiểm tra quyền và thiết bị đầu vào.' })
      throw error
    }
  }

  async disableMicrophone() {
    if (!this.room) return
    await this.room.localParticipant.setMicrophoneEnabled(false)
    this.syncParticipants()
  }

  setSpeakerEnabled(enabled: boolean) {
    this.audioElements.forEach((element) => { element.muted = !enabled })
    this.update({ speakerEnabled: enabled })
  }

  async startAudio() {
    if (!this.room) return
    await this.room.startAudio()
    this.update({ audioPlaybackBlocked: !this.room.canPlaybackAudio, speakerEnabled: true, error: null })
    this.audioElements.forEach((element) => { element.muted = false })
  }
}
