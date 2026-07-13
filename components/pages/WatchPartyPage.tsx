'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Copy, Film, LockKeyhole, LogOut, MessageCircle, Send, Users } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SyncedHlsPlayer } from '@/components/ui/SyncedHlsPlayer'
import { clearWatchPartySession, getWatchPartyPreview, joinWatchParty, listWatchParties, loadWatchPartySession, useWatchParty } from '@/hooks/useWatchParty'
import { useWatchProgress } from '@/hooks/useWatchProgress'
import { WatchPartyEpisode, WatchPartyRoomPreview, WatchPartySession, WatchProgress } from '@/lib/watch-party-types'

const reactions = ['❤️', '😂', '🔥', '😮', '👏', '😢']
const normalizeRoom = (value: string) => { const trimmed = value.trim(); try { return (new URL(trimmed).pathname.split('/').filter(Boolean).at(-1) || '').toUpperCase() } catch { return (trimmed.split('/').filter(Boolean).at(-1) || '').toUpperCase() } }
const formatTime = (value = 0) => `${Math.floor(value / 60)}:${Math.floor(value % 60).toString().padStart(2, '0')}`

export default function WatchPartyPage({ roomId }: { movieSlug?: string; roomId?: string }) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { saveProgress } = useWatchProgress()
  const endRef = useRef<HTMLDivElement>(null)
  const chatListRef = useRef<HTMLDivElement>(null)
  const lastSavedAtRef = useRef(0)
  const latestProgressRef = useRef<WatchProgress | null>(null)
  const normalizedRoomId = roomId?.toUpperCase() || ''
  const [joinInput, setJoinInput] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [session, setSession] = useState<WatchPartySession | null>(null)
  const [preview, setPreview] = useState<WatchPartyRoomPreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [message, setMessage] = useState('')
  const [messageError, setMessageError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [showChat, setShowChat] = useState(true)
  const [copied, setCopied] = useState(false)
  const [nearChatEnd, setNearChatEnd] = useState(true)
  const [publicRooms, setPublicRooms] = useState<WatchPartyRoomPreview[]>([])
  const [roomsLoading, setRoomsLoading] = useState(!roomId)

  useEffect(() => {
    if (authLoading || user) return
    const returnUrl = roomId ? `/watch-party/${encodeURIComponent(normalizedRoomId)}` : '/watch-party'
    router.replace(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
  }, [authLoading, normalizedRoomId, roomId, router, user])

  useEffect(() => {
    if (!normalizedRoomId || authLoading || !user) return undefined
    let active = true
    setSession(loadWatchPartySession(normalizedRoomId))
    void getWatchPartyPreview(normalizedRoomId).then((value) => { if (active) setPreview(value) }).catch((error) => { if (active) setPreviewError(error instanceof Error ? error.message : 'Không thể tải phòng.') })
    return () => { active = false }
  }, [authLoading, normalizedRoomId, user])

  useEffect(() => {
    if (roomId || authLoading || !user) return undefined
    let active = true
    void listWatchParties().then((result) => { if (active) setPublicRooms(result.rooms) }).catch(() => { if (active) setPublicRooms([]) }).finally(() => { if (active) setRoomsLoading(false) })
    return () => { active = false }
  }, [authLoading, roomId, user])

  const party = useWatchParty(normalizedRoomId, user ? session : null)
  const activeEpisode = useMemo(() => party.room?.movie.episodes.find((item) => item.id === party.room?.playback.episodeId) || party.room?.movie.episodes[0], [party.room])
  const episodeGroups = useMemo(() => Object.entries((party.room?.movie.episodes || []).reduce<Record<string, WatchPartyEpisode[]>>((groups, episode) => {
    groups[episode.serverName] = [...(groups[episode.serverName] || []), episode]
    return groups
  }, {})), [party.room?.movie.episodes])

  useEffect(() => {
    if (!nearChatEnd) return undefined
    endRef.current?.scrollIntoView({ block: 'end' })
    return undefined
  }, [nearChatEnd, party.room?.messages.length])

  useEffect(() => {
    const persistLatest = () => { if (latestProgressRef.current) void saveProgress({ ...latestProgressRef.current, updatedAt: Date.now() }) }
    const onVisibility = () => { if (document.visibilityState === 'hidden') persistLatest() }
    window.addEventListener('pagehide', persistLatest)
    document.addEventListener('visibilitychange', onVisibility)
    return () => { window.removeEventListener('pagehide', persistLatest); document.removeEventListener('visibilitychange', onVisibility) }
  }, [saveProgress])

  const join = async () => {
    const name = displayName.trim() || user?.displayName || ''
    if (!name) return
    setJoining(true); setPreviewError(null)
    try {
      if (!user) throw new Error('Bạn cần đăng nhập để tham gia xem chung.')
      const firebaseIdToken = await user.getIdToken()
      const result = await joinWatchParty(normalizedRoomId, name, password || undefined, firebaseIdToken)
      setSession(result.session)
    } catch (error) { setPreviewError(error instanceof Error ? error.message : 'Không thể tham gia phòng.') }
    finally { setJoining(false) }
  }

  const submitMessage = async (event?: FormEvent) => {
    event?.preventDefault()
    const text = message.trim()
    if (!text || sending) return
    setSending(true); setMessageError(null)
    const ack = await party.sendMessage(text)
    if (ack.ok) setMessage('')
    else setMessageError(ack.code === 'RATE_LIMITED' ? 'Bạn gửi quá nhanh, hãy thử lại sau.' : 'Gửi thất bại. Bấm gửi để thử lại.')
    setSending(false)
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/watch-party/${normalizedRoomId}`); setCopied(true); window.setTimeout(() => setCopied(false), 1800) }
    catch { setCopied(false) }
  }

  if (authLoading || !user) return <div className="flex min-h-[70vh] items-center justify-center text-white"><div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" /></div>

  if (!roomId) return <div className="container mx-auto px-4 py-8"><SectionHeader title="Xem chung" subtitle="Phát đồng bộ, trò chuyện và tương tác cùng bạn bè" icon={Users} showViewAll={false} /><div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-2"><Card className="border-white/10 bg-black/40"><CardContent className="space-y-5 p-6"><h2 className="text-2xl font-bold text-white">Tham gia bằng link hoặc mã phòng</h2><div className="flex gap-2"><Input value={joinInput} onChange={(event) => setJoinInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && router.push(`/watch-party/${normalizeRoom(joinInput)}`)} placeholder="Ví dụ: ABC123" /><Button disabled={!joinInput.trim()} onClick={() => router.push(`/watch-party/${normalizeRoom(joinInput)}`)}>Vào phòng</Button></div></CardContent></Card><Card className="border-white/10 bg-black/40"><CardContent className="space-y-4 p-6"><Film className="h-9 w-9 text-purple-400" /><h2 className="text-xl font-bold text-white">Tạo phòng mới</h2><p className="text-sm text-gray-400">Mở trang phim, chọn đúng tập rồi bấm “Xem chung”. Host cần đăng nhập Google.</p><Button asChild variant="outline"><Link href="/">Khám phá phim</Link></Button></CardContent></Card></div><section className="mx-auto mt-12 max-w-5xl"><h2 className="mb-4 text-xl font-bold text-white">Phòng công khai đang hoạt động</h2>{roomsLoading ? <p className="text-gray-400">Đang tải danh sách phòng…</p> : publicRooms.length === 0 ? <p className="rounded-lg border border-white/10 bg-black/30 p-6 text-center text-gray-400">Chưa có phòng công khai nào.</p> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{publicRooms.map((item) => <Link key={item.id} href={`/watch-party/${item.id}`} className="rounded-xl border border-white/10 bg-black/40 p-4 transition hover:border-purple-500/60"><div className="mb-3 flex gap-3">{item.movie.poster && <img src={item.movie.poster} alt="" className="h-20 w-14 rounded object-cover" />}<div><Badge className={item.syncCapability === 'full' ? 'bg-emerald-700' : 'bg-amber-700'}>{item.syncCapability === 'full' ? 'Sync' : 'Iframe'}</Badge><h3 className="mt-2 font-semibold text-white">{item.roomName}</h3><p className="line-clamp-1 text-sm text-gray-400">{item.movie.title} · {item.episode?.name}</p></div></div><p className="text-xs text-gray-500">Host {item.hostName} · {item.userCount} người · {item.playback.isPlaying ? 'Đang phát' : 'Tạm dừng'}</p></Link>)}</div>}</section></div>

  if (!session) return <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4"><Card className="w-full max-w-lg border-white/10 bg-gray-950"><CardContent className="space-y-5 p-6">{preview ? <><div className="flex gap-4">{preview.movie.poster && <img src={preview.movie.poster} alt="" className="h-32 w-20 rounded-lg object-cover" />}<div><div className="flex flex-wrap gap-2"><Badge>{preview.syncCapability === 'full' ? 'Đồng bộ đầy đủ' : 'Đồng bộ giới hạn'}</Badge>{preview.requiresPassword && <Badge variant="outline"><LockKeyhole className="mr-1 h-3 w-3" />Có mật khẩu</Badge>}</div><h1 className="mt-3 text-xl font-bold text-white">{preview.roomName}</h1><p className="text-sm text-gray-400">{preview.movie.title} · {preview.episode?.name}</p><p className="mt-1 text-xs text-gray-500">Host {preview.hostName} · {preview.userCount} người đang xem</p></div></div><Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={30} placeholder={user?.displayName || 'Tên hiển thị'} />{preview.requiresPassword && <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Mật khẩu phòng" />}<Button className="w-full" disabled={!(displayName.trim() || user?.displayName) || joining || (preview.requiresPassword && !password)} onClick={() => void join()}>{joining ? 'Đang tham gia…' : 'Vào phòng'}</Button>{previewError && <p className="text-sm text-red-300">{previewError}</p>}</> : !previewError ? <p className="text-center text-white">Đang tải thông tin phòng…</p> : <><h1 className="text-xl font-bold text-white">Không thể mở phòng</h1><p className="text-red-300">{previewError}</p><Button asChild><Link href="/watch-party">Quay lại</Link></Button></>}</CardContent></Card></div>
  if (!party.room) return <div className="container mx-auto py-20 text-center text-white"><div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" /><p>{party.error || 'Đang kết nối phòng…'}</p>{party.error && <Button className="mt-4" onClick={() => { clearWatchPartySession(normalizedRoomId); setSession(null) }}>Tham gia lại</Button>}</div>

  const room = party.room
  const privacyLabel = room.accessMode === 'public' ? 'Công khai' : room.accessMode === 'password' ? 'Có mật khẩu' : 'Chỉ người có link'
  return <div className="flex min-h-screen flex-col bg-[#060812] text-white">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0b0e1a] px-4 py-3"><div className="flex items-center gap-3"><Button variant="outline" size="sm" onClick={() => { party.leaveRoom(); router.push('/watch-party') }}><LogOut className="mr-2 h-4 w-4" />Thoát</Button><div><div className="flex flex-wrap items-center gap-2"><h1 className="font-semibold">{room.movie.title} · {activeEpisode?.name}</h1>{party.isHost && <Badge className="bg-purple-500">HOST</Badge>}<Badge variant="outline">{privacyLabel}</Badge></div><p className="text-xs text-gray-400">{room.roomName} · {activeEpisode?.serverName} · {party.userCount} người · Mã {room.id}</p></div></div><div className="flex gap-2"><Badge className={party.isConnected ? 'bg-emerald-700' : 'bg-red-700'}>{party.isConnected ? 'Realtime' : 'Mất kết nối'}</Badge><Button variant="outline" size="sm" onClick={() => void copy()}><Copy className="mr-2 h-4 w-4" />{copied ? 'Đã sao chép' : 'Mời'}</Button><Button variant="outline" size="sm" onClick={() => setShowChat((value) => !value)}><MessageCircle className="mr-2 h-4 w-4" />Chat</Button></div></header>
    {room.status === 'host_reconnecting' && <div className="bg-amber-500/20 px-4 py-2 text-center text-sm text-amber-100">Đang chờ host kết nối lại. Phòng sẽ tự chuyển host sau 30 giây.</div>}
    <main className="mx-auto grid w-full max-w-[1800px] flex-1 grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(320px,1fr)]">
      <section className="min-w-0"><SyncedHlsPlayer episode={activeEpisode} playback={room.playback} isHost={party.isHost} isConnected={party.isConnected} clockOffset={party.clockOffset} reactions={party.reactions} roomStatus={room.status} onPlaybackUpdate={party.sendPlaybackUpdate} onProgress={(time, duration, reason) => { if (!activeEpisode || !Number.isFinite(duration) || duration <= 0) return; const now = Date.now(); const progress: WatchProgress = { movieSlug: room.movie.slug, movieTitle: room.movie.title, poster: room.movie.poster, episodeId: activeEpisode.id, episodeName: activeEpisode.name, serverName: activeEpisode.serverName, currentTime: time, duration, percentage: Math.min(100, time / duration * 100), completed: time / duration >= 0.9 || duration - time < 120, source: 'watch_party', roomId: room.id, updatedAt: now }; latestProgressRef.current = progress; if (reason === 'timeupdate' && now - lastSavedAtRef.current < 10_000) return; lastSavedAtRef.current = now; void saveProgress(progress) }} />
        <div className="border-t border-white/10 bg-[#0b0e1a] p-4"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Server và danh sách tập</h2><p className="text-xs text-gray-400">{party.isHost ? 'Bạn đang điều khiển tập cho cả phòng.' : 'Host đang điều khiển tập.'}</p></div><div className="flex gap-1">{reactions.map((emoji) => <Button key={emoji} size="sm" variant="outline" disabled={!party.isConnected} onClick={() => party.sendReaction(emoji)}>{emoji}</Button>)}</div></div><div className="max-h-64 space-y-4 overflow-y-auto pr-2">{episodeGroups.map(([serverName, episodes]) => <div key={serverName}><div className="mb-2 text-sm font-medium text-purple-300">{serverName}</div><div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 xl:grid-cols-10">{episodes?.map((episode) => <Button key={episode.id} size="sm" variant={episode.id === activeEpisode?.id ? 'default' : 'outline'} disabled={!party.isHost || !party.isConnected || episode.capability === 'unavailable'} onClick={() => party.changeEpisode(episode)} className="min-w-0"><span className="truncate">{episode.name}</span><span className="ml-1 text-[10px] opacity-70">{episode.capability === 'full' ? 'Sync' : episode.capability === 'limited' ? 'Iframe' : 'Lỗi'}</span></Button>)}</div></div>)}</div><div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3">{Object.values(room.members).map((member) => <Badge key={member.memberId} variant="outline" className={!member.connected ? 'opacity-50' : ''}>{member.displayName}{member.memberId === room.hostMemberId ? ' · Host' : ''}</Badge>)}</div></div>
      </section>
      {showChat && <aside className="flex h-[70vh] min-h-[520px] flex-col border-t border-white/10 bg-[#101524] lg:h-auto lg:max-h-[calc(100vh-65px)] lg:border-l lg:border-t-0"><div className="border-b border-white/10 p-4"><h2 className="font-semibold">Chat phòng</h2><p className="text-xs text-gray-400">{party.userCount} đang online</p></div><div ref={chatListRef} onScroll={(event) => { const element = event.currentTarget; setNearChatEnd(element.scrollHeight - element.scrollTop - element.clientHeight < 80) }} className="flex-1 space-y-3 overflow-y-auto p-4">{room.messages.length === 0 && <p className="py-12 text-center text-sm text-gray-500">Chưa có tin nhắn. Bắt đầu trò chuyện nhé!</p>}{room.messages.map((item) => <div key={item.id} className={`rounded-xl p-3 text-sm ${item.memberId === session.member.memberId ? 'ml-auto max-w-[86%] bg-purple-600' : item.type === 'system' ? 'mx-auto bg-transparent text-center text-xs text-gray-500' : 'mr-auto max-w-[86%] bg-gray-800'}`}><p className="text-xs text-gray-300">{item.displayName || 'Hệ thống'}{item.videoTime !== undefined ? ` · ${formatTime(item.videoTime)}` : ''}</p><p className="break-words">{item.text}</p></div>)}<div ref={endRef} /></div>{!nearChatEnd && <Button size="sm" className="mx-auto mb-2" onClick={() => { setNearChatEnd(true); endRef.current?.scrollIntoView({ block: 'end' }) }}>Tin nhắn mới</Button>}<form onSubmit={(event) => void submitMessage(event)} className="border-t border-white/10 p-3"><div className="flex gap-2"><Input value={message} onChange={(event) => setMessage(event.target.value)} maxLength={200} disabled={!party.isConnected || sending} placeholder="Nhắn gì đó…" /><Button size="icon" type="submit" disabled={!message.trim() || !party.isConnected || sending}><Send className="h-4 w-4" /></Button></div>{messageError && <p className="mt-2 text-xs text-red-300">{messageError}</p>}</form></aside>}
    </main>
  </div>
}
