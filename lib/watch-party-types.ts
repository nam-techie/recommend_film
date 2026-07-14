export type WatchPartySyncCapability = 'full' | 'limited'
export type WatchPartyRoomStatus = 'active' | 'host_reconnecting' | 'closed'
export type WatchPartyAccessMode = 'public' | 'link_only' | 'password'

export interface WatchPartyEpisode {
  id: string; name: string; slug: string; serverName: string
  serverIndex: number; episodeIndex: number; linkM3u8?: string; linkEmbed?: string
  capability: 'full' | 'limited' | 'unavailable'
  episodeKey?: string; sourceId?: string
}
export interface WatchPartyMember {
  memberId: string; displayName: string; role: 'host' | 'viewer'
  avatar?: string; isAnonymous?: boolean
  joinedAt: number; lastSeenAt: number; connected: boolean; socketIds?: string[]
}

export type VoiceConnectionState = 'idle' | 'joining' | 'ready' | 'reconnecting' | 'degraded' | 'failed'
export type VoiceConnectionQuality = 'excellent' | 'good' | 'poor' | 'unknown'

export interface VoiceParticipant {
  memberId: string
  connected: boolean
  micEnabled: boolean
  audioSubscribed: boolean
  isSpeaking: boolean
  connectionQuality: VoiceConnectionQuality
}
export interface WatchPartyPlayback {
  episodeId: string; currentTime: number; isPlaying: boolean; revision: number
  serverUpdatedAt: number; updatedBy: string
  action: 'play' | 'pause' | 'seek' | 'heartbeat' | 'episode_change'
}
export interface WatchPartyMessage {
  id: string; type: 'user' | 'system'; memberId?: string; displayName?: string
  text: string; timestamp: number; videoTime?: number
}
export interface WatchPartyReaction {
  id: string; memberId: string; displayName: string; emoji: string; timestamp: number
}
export interface WatchPartyRoom {
  id: string; roomName: string; accessMode: WatchPartyAccessMode; syncCapability: WatchPartySyncCapability
  ownerUid: string; ownerDisplayName: string; ownerAvatar?: string
  movie: { slug: string; title: string; originalTitle?: string; poster?: string; episodes: WatchPartyEpisode[] }
  playback: WatchPartyPlayback; members: Record<string, WatchPartyMember>; messages: WatchPartyMessage[]
  hostMemberId: string; controlMode: 'host_only'; createdAt: number; expiresAt: number
  status: WatchPartyRoomStatus; emptySince?: number | null; voiceEnabled: boolean
}
export interface WatchPartyRoomPreview {
  id: string; roomName: string; accessMode: WatchPartyAccessMode; requiresPassword: boolean; syncCapability: WatchPartySyncCapability
  movie: { slug: string; title: string; poster?: string }; episode?: WatchPartyEpisode
  playback: { currentTime: number; isPlaying: boolean }; hostName: string; userCount: number
  createdAt: number; expiresAt: number; status: WatchPartyRoomStatus
}
export interface WatchPartySession {
  roomToken: string; member: WatchPartyMember; roomId: string; expiresAt: number
}
export interface CreateRoomPayload {
  roomName?: string; accessMode: WatchPartyAccessMode; password?: string
  movie: WatchPartyRoom['movie']; initialEpisodeId?: string
}
export interface PlaybackIntent {
  episodeId: string; currentTime: number; isPlaying: boolean
  action: 'play' | 'pause' | 'seek' | 'heartbeat'; clientEventId: string
}
export const WATCH_PARTY_DRIFT_SOFT_SECONDS = 0.3
export const WATCH_PARTY_DRIFT_HARD_SECONDS = 1.5

export interface WatchProgress {
  movieSlug: string; movieTitle: string; poster?: string; episodeId: string; episodeName: string
  serverName: string; currentTime: number; duration: number; percentage: number; completed: boolean
  source: 'solo' | 'watch_party'; roomId?: string; updatedAt: number
  episodeKey?: string; sourceId?: string; secondsWatched?: number; version?: 2
}

export interface WatchProgressMovieV2 {
  resume: WatchProgress
  episodes: Record<string, WatchProgress>
}
