'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { CreateRoomPayload, PlaybackIntent, WatchPartyEpisode, WatchPartyMessage, WatchPartyReaction, WatchPartyRoom, WatchPartyRoomPreview, WatchPartySession } from '@/lib/watch-party-types'
import { estimateClockOffset, makeEpisodeKey } from '@/lib/watch-sync'

const DEV_URL = 'http://localhost:4001'
const normalizeServiceUrl = (value: string) => {
  const normalized = value.trim().replace(/^hhttps:\/\//i, 'https://').replace(/\/$/, '')
  try {
    const url = new URL(normalized)
    return url.protocol === 'http:' || url.protocol === 'https:' ? normalized : ''
  } catch {
    return ''
  }
}
const apiUrl = () => normalizeServiceUrl(process.env.NEXT_PUBLIC_WATCH_PARTY_API_URL || (process.env.NODE_ENV === 'development' ? DEV_URL : ''))
const socketUrl = () => normalizeServiceUrl(process.env.NEXT_PUBLIC_WATCH_PARTY_SOCKET_URL || apiUrl())
const sessionKey = (roomId: string) => `watch_party_session:${roomId.toUpperCase()}`

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiUrl(); if (!base) throw new Error('Dịch vụ Xem Chung chưa được cấu hình.')
  let response: Response
  try { response = await fetch(`${base}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } }) }
  catch { throw new Error('Không kết nối được máy chủ Xem Chung. Hãy kiểm tra socket server.') }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Không thể kết nối dịch vụ Xem Chung.')
  return data
}

export function buildWatchPartyEpisodes(episodes: Array<{ server_name: string; server_data: Array<{ name: string; slug: string; link_m3u8?: string; link_embed?: string }> }> = []): WatchPartyEpisode[] {
  return episodes.flatMap((server, serverIndex) => (server.server_data || []).map((episode, episodeIndex) => ({
    id: `${serverIndex}-${episodeIndex}-${episode.slug || episode.name}`, name: episode.name || `Tập ${episodeIndex + 1}`,
    slug: episode.slug || `tap-${episodeIndex + 1}`, serverName: server.server_name || `Server ${serverIndex + 1}`,
    serverIndex, episodeIndex, linkM3u8: episode.link_m3u8 || undefined, linkEmbed: episode.link_embed || undefined,
    capability: episode.link_m3u8 ? 'full' : episode.link_embed ? 'limited' : 'unavailable',
    episodeKey: makeEpisodeKey(server.server_name || `server-${serverIndex + 1}`, episode.slug || episode.name),
    sourceId: `${serverIndex}:${episodeIndex}:${episode.link_m3u8 || episode.link_embed || ''}`
  })))
}

export function loadWatchPartySession(roomId: string): WatchPartySession | null { if (typeof window === 'undefined') return null; try { const value = sessionStorage.getItem(sessionKey(roomId)); if (!value) return null; const session = JSON.parse(value) as WatchPartySession; if (session.expiresAt <= Date.now()) { sessionStorage.removeItem(sessionKey(roomId)); return null } return session } catch { return null } }
export function saveWatchPartySession(session: WatchPartySession) { sessionStorage.setItem(sessionKey(session.roomId), JSON.stringify(session)) }
export function clearWatchPartySession(roomId: string) { sessionStorage.removeItem(sessionKey(roomId)) }

export async function createWatchParty(payload: CreateRoomPayload, firebaseIdToken: string) {
  const response = await request<{ roomId: string; roomToken: string; member: WatchPartySession['member']; room: WatchPartyRoomPreview; expiresAt: number }>('/api/rooms', { method: 'POST', headers: { Authorization: `Bearer ${firebaseIdToken}` }, body: JSON.stringify(payload) })
  const session = { roomId: response.roomId, roomToken: response.roomToken, member: response.member, expiresAt: response.expiresAt }; saveWatchPartySession(session); return { ...response, session }
}
export async function joinWatchParty(roomId: string, displayName: string, password: string | undefined, firebaseIdToken: string, anonymous = false) {
  const response = await request<{ roomToken: string; member: WatchPartySession['member']; room: WatchPartyRoomPreview; expiresAt: number }>(`/api/rooms/${roomId}/join`, { method: 'POST', body: JSON.stringify({ displayName, password, firebaseIdToken, anonymous }) })
  const session = { roomId: roomId.toUpperCase(), roomToken: response.roomToken, member: response.member, expiresAt: response.expiresAt }; saveWatchPartySession(session); return { ...response, session }
}
export const getWatchPartyPreview = (roomId: string) => request<WatchPartyRoomPreview>(`/api/rooms/${roomId}/preview`)
export const listWatchParties = (search = '') => request<{ rooms: WatchPartyRoomPreview[] }>(`/api/rooms?limit=24&search=${encodeURIComponent(search)}`)
export const probeWatchPartyMedia = (source: Pick<WatchPartyEpisode, 'linkM3u8' | 'linkEmbed'>) => request<{ hlsReachable: boolean; contentType?: string; fallbackAvailable: boolean; capability: WatchPartyEpisode['capability'] }>('/api/media/probe', { method: 'POST', body: JSON.stringify(source) })

export function useWatchParty(roomId: string, session: WatchPartySession | null) {
  const socketRef = useRef<Socket | null>(null)
  const [room, setRoom] = useState<WatchPartyRoom | null>(null); const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null); const [clockOffset, setClockOffset] = useState(0)
  const [commandError, setCommandError] = useState<string | null>(null)
  const [reactions, setReactions] = useState<WatchPartyReaction[]>([])

  useEffect(() => {
    if (!roomId || !session?.roomToken || !socketUrl()) return undefined
    const socket = io(socketUrl(), { auth: { roomToken: session.roomToken }, transports: ['websocket', 'polling'] }); socketRef.current = socket
    let active = true; const reactionTimers = new Set<number>()
    const applyRoom = (next: WatchPartyRoom) => { if (active) setRoom((current) => !current || next.playback.revision >= current.playback.revision ? next : current) }
    const syncClock = async () => {
      const samples: Array<{ offset: number; roundTrip: number }> = []
      for (let index = 0; index < 5 && active && socket.connected; index += 1) {
        const sent = Date.now()
        const response = await new Promise<{ serverTime: number } | null>((resolve) => socket.timeout(2000).emit('sync:request', { clientSentAt: sent }, (error: Error | null, value: { serverTime: number }) => resolve(error ? null : value)))
        const received = Date.now()
        if (response) samples.push({ roundTrip: received - sent, offset: response.serverTime - (sent + received) / 2 })
      }
      if (active && samples.length) setClockOffset(estimateClockOffset(samples))
    }
    const onConnect = () => { if (active) { setIsConnected(true); setError(null); socket.emit('room:resume'); syncClock() } }
    const onDisconnect = () => { if (active) setIsConnected(false) }
    const onConnectError = (next: Error) => { if (active) setError(next.message === 'UNAUTHORIZED' ? 'Phiên phòng đã hết hạn. Vui lòng tham gia lại.' : 'Không thể kết nối phòng.') }
    const onPlayback = (playback: WatchPartyRoom['playback']) => { if (active) setRoom((current) => current && playback.revision > current.playback.revision ? { ...current, playback } : current) }
    const onEpisode = ({ room: next }: { room: WatchPartyRoom }) => applyRoom(next)
    const onHostWaiting = () => { if (active) setRoom((current) => current ? { ...current, status: 'host_reconnecting' } : current) }
    const onHostChanged = ({ room: next }: { room: WatchPartyRoom }) => applyRoom(next)
    const onJoined = (member: WatchPartyRoom['members'][string]) => { if (active) setRoom((current) => current ? { ...current, members: { ...current.members, [member.memberId]: member } } : current) }
    const onLeft = ({ memberId }: { memberId: string }) => { if (active) setRoom((current) => current?.members[memberId] ? { ...current, members: { ...current.members, [memberId]: { ...current.members[memberId], connected: false } } } : current) }
    const onChat = (message: WatchPartyMessage) => { if (active) setRoom((current) => current ? { ...current, messages: [...current.messages.filter((item) => item.id !== message.id).slice(-99), message] } : current) }
    const onReaction = (reaction: WatchPartyReaction) => { if (!active) return; setReactions((current) => [...current.slice(-11), reaction]); const timer = window.setTimeout(() => { reactionTimers.delete(timer); if (active) setReactions((current) => current.filter((item) => item.id !== reaction.id)) }, 3000); reactionTimers.add(timer) }
    const onVoicePermission = ({ enabled }: { enabled: boolean }) => { if (active) setRoom((current) => current ? { ...current, voiceEnabled: enabled } : current) }
    const onClosed = () => { if (active) setError('Phòng đã đóng.') }
    socket.on('connect', onConnect); socket.on('disconnect', onDisconnect); socket.on('connect_error', onConnectError); socket.on('room:snapshot', applyRoom)
    socket.on('playback:sync', onPlayback); socket.on('episode:sync', onEpisode); socket.on('host:reconnecting', onHostWaiting); socket.on('host:changed', onHostChanged)
    socket.on('room:member_joined', onJoined); socket.on('room:member_left', onLeft); socket.on('chat:new', onChat); socket.on('reaction:new', onReaction); socket.on('room:closed', onClosed)
    socket.on('voice:permission_changed', onVoicePermission)
    const heartbeat = window.setInterval(() => { socket.emit('heartbeat:user'); syncClock() }, 30_000)
    const onVisibilityChange = () => { if (document.visibilityState === 'visible') { socket.emit('room:resume'); syncClock() } }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      active = false; document.removeEventListener('visibilitychange', onVisibilityChange); window.clearInterval(heartbeat); reactionTimers.forEach((timer) => window.clearTimeout(timer))
      socket.removeAllListeners(); if (socket.connected) socket.disconnect(); if (socketRef.current === socket) socketRef.current = null
    }
  }, [roomId, session?.roomToken])

  const sendPlaybackUpdate = useCallback((payload: Omit<PlaybackIntent, 'clientEventId'>) => {
    const socket = socketRef.current
    if (!socket?.connected) { setCommandError('DISCONNECTED'); return }
    const clientEventId = crypto.randomUUID()
    socket.timeout(4000).emit('playback:update', { ...payload, clientEventId }, (timeoutError: Error | null, ack: { ok: boolean; code?: string; revision?: number }) => {
      const code = timeoutError ? 'TIMEOUT' : ack?.ok ? null : ack?.code || 'REJECTED'
      setCommandError(code)
      console.info(JSON.stringify({ event: 'watch_party_playback_ack', clientEventId, action: payload.action, ok: !code, code, revision: ack?.revision }))
    })
  }, [])
  const changeEpisode = useCallback((episode: WatchPartyEpisode) => {
    const socket = socketRef.current
    if (!socket?.connected) { setCommandError('DISCONNECTED'); return }
    socket.timeout(4000).emit('episode:change', { episodeId: episode.id }, (timeoutError: Error | null, ack: { ok: boolean; code?: string }) => setCommandError(timeoutError ? 'TIMEOUT' : ack?.ok ? null : ack?.code || 'REJECTED'))
  }, [])
  const sendMessage = useCallback((text: string) => new Promise<{ ok: boolean; code?: string }>((resolve) => { const socket = socketRef.current; if (!socket?.connected) { resolve({ ok: false, code: 'DISCONNECTED' }); return } socket.timeout(5000).emit('chat:send', { text }, (timeoutError: Error | null, ack: { ok: boolean; code?: string }) => resolve(timeoutError ? { ok: false, code: 'TIMEOUT' } : ack)) }), [])
  const sendReaction = useCallback((emoji: string) => new Promise<{ ok: boolean; code?: string }>((resolve) => {
    const socket = socketRef.current
    if (!socket?.connected) { resolve({ ok: false, code: 'DISCONNECTED' }); return }
    socket.timeout(4000).emit('reaction:send', { emoji }, (timeoutError: Error | null, ack: { ok: boolean; code?: string }) => {
      resolve(timeoutError ? { ok: false, code: 'TIMEOUT' } : ack)
    })
  }), [])
  const setVoicePermission = useCallback((enabled: boolean) => new Promise<{ ok: boolean; code?: string }>((resolve) => {
    const socket = socketRef.current
    if (!socket?.connected) { resolve({ ok: false, code: 'DISCONNECTED' }); return }
    socket.timeout(4000).emit('voice:permission', { enabled }, (timeoutError: Error | null, ack: { ok: boolean; code?: string }) => resolve(timeoutError ? { ok: false, code: 'TIMEOUT' } : ack))
  }), [])
  const getVoiceCredentials = useCallback(() => {
    if (!session?.roomToken) return Promise.reject(new Error('Phiên phòng đã hết hạn.'))
    return request<{ serverUrl: string; participantToken: string }>(`/api/rooms/${roomId}/voice-token`, { method: 'POST', headers: { Authorization: `Bearer ${session.roomToken}` } })
  }, [roomId, session?.roomToken])
  const leaveRoom = useCallback(() => { socketRef.current?.emit('room:leave'); clearWatchPartySession(roomId) }, [roomId])
  const memberId = session?.member.memberId
  return useMemo(() => ({ room, isConnected, error, commandError, clockOffset, reactions, sendPlaybackUpdate, changeEpisode, sendMessage, sendReaction, setVoicePermission, getVoiceCredentials, leaveRoom, isHost: Boolean(room && memberId === room.hostMemberId), userCount: room ? Object.values(room.members).filter((member) => member.connected).length : 0 }), [room, isConnected, error, commandError, clockOffset, reactions, sendPlaybackUpdate, changeEpisode, sendMessage, sendReaction, setVoicePermission, getVoiceCredentials, leaveRoom, memberId])
}
