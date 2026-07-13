'use client'

import { FormEvent, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  Copy,
  Dices,
  Film,
  Headphones,
  LockKeyhole,
  LogOut,
  Mic,
  MicOff,
  MessageCircle,
  Play,
  Radio,
  Send,
  UserRound,
  Users,
  VolumeX,
  WifiOff,
  X,
} from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SyncedHlsPlayer } from '@/components/ui/SyncedHlsPlayer'
import {
  clearWatchPartySession,
  getWatchPartyPreview,
  joinWatchParty,
  listWatchParties,
  loadWatchPartySession,
  useWatchParty,
} from '@/hooks/useWatchParty'
import { useWatchProgress } from '@/hooks/useWatchProgress'
import { useWatchPartyVoice } from '@/hooks/useWatchPartyVoice'
import { createAnonymousName } from '@/lib/anonymous-name'
import {
  WatchPartyEpisode,
  WatchPartyMember,
  WatchPartyMessage,
  WatchPartyRoomPreview,
  WatchPartySession,
  WatchProgress,
} from '@/lib/watch-party-types'
import { cn } from '@/lib/utils'

const reactions = ['❤️', '😂', '🔥', '😮', '👏', '😢']
const normalizeRoom = (value: string) => {
  const trimmed = value.trim()
  try { return (new URL(trimmed).pathname.split('/').filter(Boolean).at(-1) || '').toUpperCase() }
  catch { return (trimmed.split('/').filter(Boolean).at(-1) || '').toUpperCase() }
}
const formatTime = (value = 0) => `${Math.floor(value / 60)}:${Math.floor(value % 60).toString().padStart(2, '0')}`
const formatMessageTime = (timestamp: number) => new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(timestamp)
const initials = (name = '?') => name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase() || '?'

function MemberAvatar({ member, size = 'md' }: { member: Pick<WatchPartyMember, 'displayName' | 'avatar' | 'connected'>; size?: 'sm' | 'md' }) {
  const [imageFailed, setImageFailed] = useState(false)
  useEffect(() => setImageFailed(false), [member.avatar])
  const dimensions = size === 'sm' ? 'h-8 w-8 text-[10px]' : 'h-10 w-10 text-xs'
  return <span className={cn('relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-purple-500/20 font-semibold text-purple-100 ring-1 ring-white/10', dimensions)}>
    {member.avatar && !imageFailed ? <img src={member.avatar} alt="" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} className="h-full w-full object-cover" /> : initials(member.displayName)}
    <span className={cn('absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#111522]', member.connected ? 'bg-emerald-400' : 'bg-slate-500')} />
  </span>
}

const ChatMessageRow = memo(function ChatMessageRow({ item, own }: { item: WatchPartyMessage; own: boolean }) {
  if (item.type === 'system') return <div className="px-4 py-1 text-center text-xs text-slate-500">{item.text}</div>
  const member = { displayName: item.displayName || 'Khách', connected: true }
  return <div className={cn('flex items-start gap-2.5', own && 'flex-row-reverse')}>
    <MemberAvatar member={member} size="sm" />
    <div className={cn('min-w-0 max-w-[82%]', own && 'text-right')}>
      <div className={cn('mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500', own && 'justify-end')}>
        <span className="font-medium text-slate-300">{own ? 'Bạn' : item.displayName || 'Khách'}</span>
        <span>{formatMessageTime(item.timestamp)}</span>
        {item.videoTime !== undefined && <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-purple-300">{formatTime(item.videoTime)}</span>}
      </div>
      <div className={cn('inline-block rounded-2xl px-3 py-2 text-left text-sm leading-relaxed text-slate-100', own ? 'rounded-tr-md bg-purple-600/45' : 'rounded-tl-md bg-white/[0.07]')}>
        <p className="break-words">{item.text}</p>
      </div>
    </div>
  </div>
})

interface ChatPanelProps {
  messages: WatchPartyMessage[]
  currentMemberId: string
  userCount: number
  isConnected: boolean
  sending: boolean
  message: string
  messageError: string | null
  nearChatEnd: boolean
  chatListRef: React.RefObject<HTMLDivElement>
  endRef: React.RefObject<HTMLDivElement>
  onClose: () => void
  onMessageChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
  onNearEndChange: (value: boolean) => void
}

const ChatPanel = memo(function ChatPanel({
  messages,
  currentMemberId,
  userCount,
  isConnected,
  sending,
  message,
  messageError,
  nearChatEnd,
  chatListRef,
  endRef,
  onClose,
  onMessageChange,
  onSubmit,
  onNearEndChange,
}: ChatPanelProps) {
  return <div className="relative flex h-full min-h-0 flex-col bg-[#101522] text-white">
    <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
      <div>
        <h2 className="font-semibold">Trò chuyện</h2>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{userCount} người đang xem</p>
      </div>
      <Button size="icon" variant="ghost" aria-label="Ẩn chat" title="Ẩn chat" onClick={onClose} className="h-10 w-10 rounded-full text-slate-300 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></Button>
    </div>
    <div ref={chatListRef} onScroll={(event) => { const element = event.currentTarget; onNearEndChange(element.scrollHeight - element.scrollTop - element.clientHeight < 80) }} className="messages-scroll-area flex-1 space-y-4 overflow-y-auto px-4 py-4">
      {messages.length === 0 && <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center"><MessageCircle className="mb-3 h-9 w-9 text-slate-600" /><p className="text-sm font-medium text-slate-300">Chưa có tin nhắn</p><p className="mt-1 text-xs text-slate-500">Bắt đầu trò chuyện cùng mọi người nhé.</p></div>}
      {messages.map((item) => <ChatMessageRow key={item.id} item={item} own={item.memberId === currentMemberId} />)}
      <div ref={endRef} />
    </div>
    {!nearChatEnd && <Button size="sm" onClick={() => { onNearEndChange(true); endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }) }} className="absolute bottom-20 left-1/2 z-10 h-8 -translate-x-1/2 rounded-full bg-purple-600 px-3 text-xs shadow-lg hover:bg-purple-500">Tin nhắn mới</Button>}
    <form onSubmit={onSubmit} className="shrink-0 border-t border-white/10 bg-[#0d111d] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#080c15] p-1.5 focus-within:border-purple-500/70">
        <Input value={message} onChange={(event) => onMessageChange(event.target.value)} maxLength={200} disabled={!isConnected || sending} placeholder="Nhắn gì đó…" aria-label="Tin nhắn" className="h-10 border-0 bg-transparent shadow-none focus-visible:ring-0" />
        <Button size="icon" type="submit" aria-label="Gửi tin nhắn" title="Gửi tin nhắn" disabled={!message.trim() || !isConnected || sending} className="h-10 w-10 shrink-0 rounded-lg bg-purple-600 hover:bg-purple-500"><Send className="h-4 w-4" /></Button>
      </div>
      {messageError && <p className="mt-2 text-xs text-red-300">{messageError}</p>}
    </form>
  </div>
})

export default function WatchPartyPage({ roomId }: { movieSlug?: string; roomId?: string }) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { saveProgress } = useWatchProgress()
  const endRef = useRef<HTMLDivElement>(null)
  const chatListRef = useRef<HTMLDivElement>(null)
  const theaterRef = useRef<HTMLDivElement>(null)
  const episodePanelRef = useRef<HTMLDivElement>(null)
  const lastSavedAtRef = useRef(0)
  const latestProgressRef = useRef<WatchProgress | null>(null)
  const lastMessageIdRef = useRef<string | undefined>(undefined)
  const reactionErrorTimerRef = useRef<number | null>(null)
  const normalizedRoomId = roomId?.toUpperCase() || ''
  const [joinInput, setJoinInput] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [joinAnonymous, setJoinAnonymous] = useState(false)
  const [anonymousName, setAnonymousName] = useState(() => createAnonymousName())
  const [password, setPassword] = useState('')
  const [session, setSession] = useState<WatchPartySession | null>(null)
  const [preview, setPreview] = useState<WatchPartyRoomPreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [message, setMessage] = useState('')
  const [messageError, setMessageError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [showChat, setShowChat] = useState(true)
  const [showMembers, setShowMembers] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [reactionError, setReactionError] = useState<string | null>(null)
  const [voiceControlError, setVoiceControlError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [nearChatEnd, setNearChatEnd] = useState(true)
  const [expandedServer, setExpandedServer] = useState('')
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
  const voice = useWatchPartyVoice({ memberId: session?.member.memberId, members: party.room?.members || {}, voiceEnabled: Boolean(party.room?.voiceEnabled), setMicState: party.setMicState, sendVoiceSignal: party.sendVoiceSignal, subscribeVoiceSignal: party.subscribeVoiceSignal })
  const activeEpisode = useMemo(() => party.room?.movie.episodes.find((item) => item.id === party.room?.playback.episodeId) || party.room?.movie.episodes[0], [party.room])
  const episodeGroups = useMemo(() => Object.entries((party.room?.movie.episodes || []).reduce<Record<string, WatchPartyEpisode[]>>((groups, episode) => {
    groups[episode.serverName] = [...(groups[episode.serverName] || []), episode]
    return groups
  }, {})), [party.room?.movie.episodes])
  const members = useMemo(() => Object.values(party.room?.members || {}).sort((a, b) => Number(b.connected) - Number(a.connected) || Number(a.memberId !== party.room?.hostMemberId) - Number(b.memberId !== party.room?.hostMemberId) || a.displayName.localeCompare(b.displayName, 'vi')), [party.room?.hostMemberId, party.room?.members])
  const speakingMembers = useMemo(() => members.filter((member) => voice.speakingMemberIds.has(member.memberId)), [members, voice.speakingMemberIds])

  useEffect(() => {
    if (!nearChatEnd || !showChat) return
    endRef.current?.scrollIntoView({ block: 'end' })
    setUnreadCount(0)
  }, [nearChatEnd, party.room?.messages.length, showChat])

  useEffect(() => {
    const latest = party.room?.messages.at(-1)
    if (!latest) return
    if (lastMessageIdRef.current === undefined) { lastMessageIdRef.current = latest.id; return }
    if (latest.id === lastMessageIdRef.current) return
    lastMessageIdRef.current = latest.id
    if (showChat && nearChatEnd) setUnreadCount(0)
    else if (latest.memberId !== session?.member.memberId && latest.type !== 'system') setUnreadCount((value) => value + 1)
  }, [nearChatEnd, party.room?.messages, session?.member.memberId, showChat])

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement === theaterRef.current)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    if (!activeEpisode) return
    setExpandedServer(activeEpisode.serverName)
    window.requestAnimationFrame(() => episodePanelRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }))
  }, [activeEpisode?.id, activeEpisode?.serverName])

  useEffect(() => () => {
    if (reactionErrorTimerRef.current) window.clearTimeout(reactionErrorTimerRef.current)
  }, [])

  useEffect(() => {
    const persistLatest = () => { if (latestProgressRef.current) void saveProgress({ ...latestProgressRef.current, updatedAt: Date.now() }) }
    const onVisibility = () => { if (document.visibilityState === 'hidden') persistLatest() }
    window.addEventListener('pagehide', persistLatest)
    document.addEventListener('visibilitychange', onVisibility)
    return () => { window.removeEventListener('pagehide', persistLatest); document.removeEventListener('visibilitychange', onVisibility) }
  }, [saveProgress])

  const join = async () => {
    const name = joinAnonymous ? anonymousName : displayName.trim() || user?.displayName || ''
    if (!name) return
    setJoining(true); setPreviewError(null)
    try {
      if (!user) throw new Error('Bạn cần đăng nhập để tham gia xem chung.')
      const firebaseIdToken = await user.getIdToken()
      const result = await joinWatchParty(normalizedRoomId, name, password || undefined, firebaseIdToken, joinAnonymous)
      setSession(result.session)
    } catch (error) { setPreviewError(error instanceof Error ? error.message : 'Không thể tham gia phòng.') }
    finally { setJoining(false) }
  }

  const submitMessage = useCallback(async (event?: FormEvent) => {
    event?.preventDefault()
    const text = message.trim()
    if (!text || sending) return
    setSending(true); setMessageError(null)
    const ack = await party.sendMessage(text)
    if (ack.ok) setMessage('')
    else setMessageError(ack.code === 'RATE_LIMITED' ? 'Bạn gửi hơi nhanh. Hãy chờ một chút nhé.' : 'Chưa gửi được tin nhắn. Hãy thử lại.')
    setSending(false)
  }, [message, party, sending])

  const copy = async () => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/watch-party/${normalizedRoomId}`); setCopied(true); window.setTimeout(() => setCopied(false), 1800) }
    catch { setCopied(false) }
  }

  const toggleChat = useCallback(() => {
    setShowChat((value) => {
      const next = !value
      if (next) { setUnreadCount(0); setNearChatEnd(true) }
      return next
    })
  }, [])

  const toggleFullscreen = useCallback(() => {
    const theater = theaterRef.current
    if (!theater) return
    if (document.fullscreenElement === theater) void document.exitFullscreen()
    else void theater.requestFullscreen?.()
  }, [])

  const sendReaction = useCallback(async (emoji: string) => {
    setReactionError(null)
    const ack = await party.sendReaction(emoji)
    if (ack.ok) return
    setReactionError(ack.code === 'RATE_LIMITED' ? 'Chậm một nhịp nhé' : 'Chưa gửi được')
    if (reactionErrorTimerRef.current) window.clearTimeout(reactionErrorTimerRef.current)
    reactionErrorTimerRef.current = window.setTimeout(() => setReactionError(null), 1800)
  }, [party])

  const toggleVoicePermission = useCallback(async () => {
    const next = !party.room?.voiceEnabled
    setVoiceControlError(null)
    const ack = await party.setVoicePermission(next)
    if (!ack.ok) setVoiceControlError(ack.code === 'HOST_ONLY' ? 'Chỉ host được thay đổi quyền voice.' : 'Không cập nhật được voice của phòng.')
  }, [party])

  if (authLoading || !user) return <div className="flex min-h-[70vh] items-center justify-center text-white"><div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" /></div>

  if (!roomId) return <div className="container mx-auto px-4 py-8">
    <SectionHeader title="Xem chung" subtitle="Phát đồng bộ, trò chuyện và tương tác cùng bạn bè" icon={Users} showViewAll={false} />
    <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-2">
      <Card className="border-white/10 bg-black/40"><CardContent className="space-y-5 p-6"><h2 className="text-2xl font-bold text-white">Tham gia bằng link hoặc mã phòng</h2><div className="flex gap-2"><Input value={joinInput} onChange={(event) => setJoinInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && router.push(`/watch-party/${normalizeRoom(joinInput)}`)} placeholder="Ví dụ: ABC123" /><Button disabled={!joinInput.trim()} onClick={() => router.push(`/watch-party/${normalizeRoom(joinInput)}`)}>Vào phòng</Button></div></CardContent></Card>
      <Card className="border-white/10 bg-black/40"><CardContent className="space-y-4 p-6"><Film className="h-9 w-9 text-purple-400" /><h2 className="text-xl font-bold text-white">Tạo phòng mới</h2><p className="text-sm text-gray-400">Mở trang phim, chọn đúng tập rồi bấm “Xem chung”. Host cần đăng nhập Google.</p><Button asChild variant="outline"><Link href="/">Khám phá phim</Link></Button></CardContent></Card>
    </div>
    <section className="mx-auto mt-12 max-w-5xl"><h2 className="mb-4 text-xl font-bold text-white">Phòng công khai đang hoạt động</h2>{roomsLoading ? <p className="text-gray-400">Đang tải danh sách phòng…</p> : publicRooms.length === 0 ? <p className="rounded-lg border border-white/10 bg-black/30 p-6 text-center text-gray-400">Chưa có phòng công khai nào.</p> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{publicRooms.map((item) => <Link key={item.id} href={`/watch-party/${item.id}`} className="rounded-xl border border-white/10 bg-black/40 p-4 transition hover:border-purple-500/60"><div className="mb-3 flex gap-3">{item.movie.poster && <img src={item.movie.poster} alt="" className="h-20 w-14 rounded object-cover" />}<div><h3 className="font-semibold text-white">{item.roomName}</h3><p className="mt-1 line-clamp-1 text-sm text-gray-400">{item.movie.title} · {item.episode?.name}</p></div></div><p className="text-xs text-gray-500">Host {item.hostName} · {item.userCount} người · {item.playback.isPlaying ? 'Đang phát' : 'Tạm dừng'}</p></Link>)}</div>}</section>
  </div>

  if (!session) return <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-10">
    <Card className="w-full max-w-xl border-white/10 bg-gray-950"><CardContent className="space-y-5 p-5 sm:p-6">
      {preview ? <>
        <div className="flex gap-4">{preview.movie.poster && <img src={preview.movie.poster} alt="" className="h-32 w-20 rounded-lg object-cover" />}<div className="min-w-0"><div className="flex flex-wrap gap-2"><Badge>Phòng xem chung</Badge>{preview.requiresPassword && <Badge variant="outline"><LockKeyhole className="mr-1 h-3 w-3" />Có mật khẩu</Badge>}</div><h1 className="mt-3 truncate text-xl font-bold text-white">{preview.roomName}</h1><p className="truncate text-sm text-gray-400">{preview.movie.title} · {preview.episode?.name}</p><p className="mt-1 text-xs text-gray-500">Host {preview.hostName} · {preview.userCount} người đang xem</p></div></div>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-200">Bạn muốn xuất hiện thế nào?</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setJoinAnonymous(false)} className={cn('rounded-xl border p-3 text-left transition', !joinAnonymous ? 'border-purple-400 bg-purple-500/15' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]')}><UserRound className="mb-2 h-5 w-5 text-purple-300" /><span className="block text-sm font-medium text-white">Tài khoản Google</span><span className="mt-1 block truncate text-xs text-slate-400">{user?.displayName || user?.email}</span></button>
            <button type="button" onClick={() => setJoinAnonymous(true)} className={cn('rounded-xl border p-3 text-left transition', joinAnonymous ? 'border-purple-400 bg-purple-500/15' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]')}><LockKeyhole className="mb-2 h-5 w-5 text-purple-300" /><span className="block text-sm font-medium text-white">Ẩn danh</span><span className="mt-1 block truncate text-xs text-slate-400">Không hiện ảnh và tên thật</span></button>
          </div>
        </div>
        {joinAnonymous ? <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-100">{initials(anonymousName)}</span><div className="min-w-0 flex-1"><p className="text-xs text-slate-500">Tên ẩn danh của bạn</p><p className="truncate text-sm font-medium text-white">{anonymousName}</p></div><Button type="button" size="icon" variant="ghost" aria-label="Tạo tên ẩn danh khác" title="Tạo tên khác" onClick={() => setAnonymousName(createAnonymousName())} className="h-10 w-10 rounded-full"><Dices className="h-5 w-5" /></Button></div> : <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={30} placeholder={user?.displayName || 'Tên hiển thị'} />}
        {preview.requiresPassword && <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Mật khẩu phòng" />}
        <Button className="h-12 w-full" disabled={(!joinAnonymous && !(displayName.trim() || user?.displayName)) || joining || (preview.requiresPassword && !password)} onClick={() => void join()}>{joining ? 'Đang tham gia…' : `Vào phòng với tên ${joinAnonymous ? anonymousName : displayName.trim() || user?.displayName || ''}`}</Button>
        {previewError && <p className="text-sm text-red-300">{previewError}</p>}
      </> : !previewError ? <p className="text-center text-white">Đang tải thông tin phòng…</p> : <><h1 className="text-xl font-bold text-white">Không thể mở phòng</h1><p className="text-red-300">{previewError}</p><Button asChild><Link href="/watch-party">Quay lại</Link></Button></>}
    </CardContent></Card>
  </div>
  if (!party.room) return <div className="container mx-auto py-20 text-center text-white"><div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" /><p>{party.error || 'Đang kết nối phòng…'}</p>{party.error && <Button className="mt-4" onClick={() => { clearWatchPartySession(normalizedRoomId); setSession(null) }}>Tham gia lại</Button>}</div>

  const room = party.room
  const privacyLabel = room.accessMode === 'public' ? 'Công khai' : room.accessMode === 'password' ? 'Có mật khẩu' : 'Chỉ người có link'
  const chatPanelClass = isFullscreen
    ? 'absolute inset-y-0 right-0 z-50 w-full border-l border-white/10 sm:w-[380px]'
    : 'fixed inset-x-0 bottom-0 top-16 z-50 border-t border-white/10 md:absolute md:inset-y-0 md:left-auto md:right-0 md:top-0 md:w-[380px] md:border-l md:border-t-0 xl:static xl:z-auto xl:w-auto'

  return <div className="min-h-screen bg-[#070912] text-white">
    <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between gap-3 border-b border-white/10 bg-[#0b0e18]/95 px-3 py-2 backdrop-blur-md sm:px-4">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="icon" aria-label="Thoát phòng" title="Thoát phòng" onClick={() => { party.leaveRoom(); router.push('/watch-party') }} className="h-11 w-11 shrink-0 rounded-full text-slate-300 hover:bg-white/10 hover:text-white"><LogOut className="h-5 w-5" /></Button>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2"><h1 className="truncate text-sm font-semibold sm:text-base">{room.movie.title}</h1>{party.isHost && <span className="hidden rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-purple-200 sm:inline">HOST</span>}</div>
          <p className="truncate text-xs text-slate-400">{activeEpisode?.name} <span className="hidden sm:inline">· {room.roomName}</span></p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <div className="hidden items-center gap-2 rounded-full bg-white/[0.05] px-3 py-2 text-xs text-slate-300 lg:flex"><span className={cn('h-2 w-2 rounded-full', party.isConnected ? 'bg-emerald-400' : 'bg-red-400')} />{party.isConnected ? 'Đã kết nối' : 'Mất kết nối'}</div>
        {party.isHost && <Button variant="ghost" size="sm" aria-label={room.voiceEnabled ? 'Tắt mic tất cả' : 'Cho phép mọi người mở mic'} title={room.voiceEnabled ? 'Tắt mic tất cả và khóa quyền mở mic' : 'Cho phép từng thành viên tự mở mic'} onClick={() => void toggleVoicePermission()} className={cn('h-11 rounded-full px-3 text-slate-200 hover:bg-white/10', room.voiceEnabled && 'bg-emerald-500/10 text-emerald-200')}><Radio className="h-4 w-4" /><span className="hidden xl:inline">{room.voiceEnabled ? 'Tắt mic tất cả' : 'Cho phép mic'}</span></Button>}
        <Button variant="ghost" size="icon" aria-label={voice.micEnabled ? 'Tắt microphone' : 'Bật microphone'} title={!room.voiceEnabled ? 'Host chưa mở voice' : voice.micEnabled ? 'Tắt microphone' : 'Bật microphone'} disabled={!room.voiceEnabled} onClick={() => void voice.toggleMic()} className={cn('h-11 w-11 rounded-full text-slate-200 hover:bg-white/10', voice.micEnabled && 'bg-emerald-500/15 text-emerald-200')}>{voice.micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}</Button>
        <Button variant="ghost" size="icon" aria-label={voice.speakerEnabled ? 'Tắt âm thanh phòng' : 'Bật âm thanh phòng'} title={voice.speakerEnabled ? 'Không nghe giọng nói trong phòng' : 'Nghe lại giọng nói trong phòng'} disabled={!room.voiceEnabled} onClick={voice.toggleSpeaker} className={cn('h-11 w-11 rounded-full text-slate-200 hover:bg-white/10', voice.speakerEnabled && room.voiceEnabled && 'bg-sky-500/15 text-sky-100')}>{voice.speakerEnabled ? <Headphones className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}</Button>
        <div className="relative">
          <Button variant="ghost" size="sm" aria-label="Người tham gia" aria-expanded={showMembers} onClick={() => setShowMembers((value) => !value)} className="h-11 rounded-full px-3 text-slate-200 hover:bg-white/10"><Users className="h-4 w-4" /><span>{party.userCount}</span></Button>
          {showMembers && <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#111522] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><div><h2 className="text-sm font-semibold">Người trong phòng</h2><p className="text-xs text-slate-400">{party.userCount} đang online</p></div><Button size="icon" variant="ghost" aria-label="Đóng danh sách" onClick={() => setShowMembers(false)} className="h-9 w-9 rounded-full"><X className="h-4 w-4" /></Button></div>
            <div className="max-h-80 space-y-1 overflow-y-auto p-2">{members.map((member) => <div key={member.memberId} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.04]"><MemberAvatar member={member} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{member.displayName}{member.isAnonymous ? ' · Ẩn danh' : ''}</p><p className="text-xs text-slate-500">{member.connected ? 'Đang online' : 'Đã rời phòng'}</p></div>{member.micEnabled ? <Mic className="h-4 w-4 text-emerald-400" /> : <MicOff className="h-4 w-4 text-slate-600" />}{member.memberId === room.hostMemberId && <span className="rounded-full bg-purple-500/15 px-2 py-1 text-[10px] font-semibold text-purple-200">Host</span>}</div>)}</div>
          </div>}
        </div>
        <Button variant="ghost" size="sm" onClick={() => void copy()} className="hidden h-11 rounded-full px-3 text-slate-200 hover:bg-white/10 sm:inline-flex"><Copy className="h-4 w-4" />{copied ? 'Đã sao chép' : 'Mời'}</Button>
        <Button variant="ghost" size="sm" aria-label={showChat ? 'Ẩn chat' : 'Hiện chat'} aria-expanded={showChat} onClick={toggleChat} className={cn('relative h-11 rounded-full px-3 text-slate-200 hover:bg-white/10', showChat && 'bg-white/[0.08]')}><MessageCircle className="h-4 w-4" /><span className="hidden sm:inline">Chat</span>{unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-purple-500 px-1 text-[10px] font-bold">{Math.min(unreadCount, 99)}</span>}</Button>
      </div>
    </header>

    {(voice.error || voiceControlError) && <div className="bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-100" role="status">{voice.error || voiceControlError}</div>}

    {room.status === 'host_reconnecting' && <div className="flex items-center justify-center gap-2 bg-amber-500/15 px-4 py-2 text-center text-sm text-amber-100"><WifiOff className="h-4 w-4" />Đang chờ host kết nối lại. Phòng sẽ tự chuyển host sau 30 giây.</div>}

    <main className="mx-auto w-full max-w-[1920px]">
      <div ref={theaterRef} className={cn('relative grid min-w-0 overflow-hidden bg-black', isFullscreen ? 'h-screen grid-cols-1' : showChat ? 'xl:grid-cols-[minmax(0,1fr)_380px]' : 'grid-cols-1')}>
        <section className={cn('relative min-w-0 bg-black', isFullscreen && 'h-screen')}>
          <SyncedHlsPlayer episode={activeEpisode} playback={room.playback} isHost={party.isHost} isConnected={party.isConnected} clockOffset={party.clockOffset} reactions={party.reactions} roomStatus={room.status} onPlaybackUpdate={party.sendPlaybackUpdate} isFullscreen={isFullscreen} chatOpen={showChat} unreadCount={unreadCount} fillContainer={isFullscreen} onToggleChat={toggleChat} onToggleFullscreen={toggleFullscreen} voiceEnabled={room.voiceEnabled} micEnabled={voice.micEnabled} speakerEnabled={voice.speakerEnabled} voiceJoined={voice.voiceJoined} speakingMembers={speakingMembers} reactionOptions={reactions} reactionError={reactionError} onToggleMic={() => void voice.toggleMic()} onToggleSpeaker={voice.toggleSpeaker} onToggleVoicePermission={party.isHost ? () => void toggleVoicePermission() : undefined} onSendReaction={(emoji) => void sendReaction(emoji)} onProgress={(time, duration, reason) => {
            if (!activeEpisode || !Number.isFinite(duration) || duration <= 0) return
            const now = Date.now()
            const progress: WatchProgress = { movieSlug: room.movie.slug, movieTitle: room.movie.title, poster: room.movie.poster, episodeId: activeEpisode.id, episodeName: activeEpisode.name, serverName: activeEpisode.serverName, currentTime: time, duration, percentage: Math.min(100, time / duration * 100), completed: time / duration >= 0.9 || duration - time < 120, source: 'watch_party', roomId: room.id, updatedAt: now }
            latestProgressRef.current = progress
            if (reason === 'timeupdate' && now - lastSavedAtRef.current < 10_000) return
            lastSavedAtRef.current = now
            void saveProgress(progress)
          }} />
        </section>
        {showChat && <aside className={chatPanelClass}>
          <ChatPanel messages={room.messages} currentMemberId={session.member.memberId} userCount={party.userCount} isConnected={party.isConnected} sending={sending} message={message} messageError={messageError} nearChatEnd={nearChatEnd} chatListRef={chatListRef} endRef={endRef} onClose={toggleChat} onMessageChange={setMessage} onSubmit={(event) => void submitMessage(event)} onNearEndChange={(value) => { setNearChatEnd(value); if (value) setUnreadCount(0) }} />
        </aside>}
      </div>

      <section ref={episodePanelRef} className="border-t border-white/10 bg-[#0b0e18] px-3 py-5 sm:px-5 sm:py-6">
        <div className="mx-auto max-w-[1500px]">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="text-lg font-semibold">Tập phim</h2><p className="mt-1 text-xs text-slate-400">{party.isHost ? 'Bạn đang chọn tập cho cả phòng.' : 'Host đang chọn tập cho cả phòng.'}</p></div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400"><span>Mã {room.id}</span><span>·</span><span>{privacyLabel}</span><span>·</span><span>{activeEpisode?.serverName}</span></div>
          </div>
          <div className="space-y-2">{episodeGroups.map(([serverName, episodes]) => {
            const expanded = expandedServer === serverName
            return <div key={serverName} className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.025]">
              <button type="button" aria-expanded={expanded} onClick={() => setExpandedServer(expanded ? '' : serverName)} className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-400"><span className="text-sm font-medium text-slate-200">{serverName}</span><span className="flex items-center gap-2 text-xs text-slate-500">{episodes.length} tập<ChevronDown className={cn('h-4 w-4 transition-transform duration-200', expanded && 'rotate-180')} /></span></button>
              {expanded && <div className="grid grid-cols-3 gap-2 border-t border-white/[0.06] p-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 xl:grid-cols-12">{episodes.map((episode) => {
                const active = episode.id === activeEpisode?.id
                const unavailable = episode.capability === 'unavailable' || !episode.linkM3u8
                return <button key={episode.id} type="button" data-active={active} disabled={!party.isHost || !party.isConnected || unavailable} title={unavailable ? 'Nguồn tập này hiện không khả dụng' : !party.isHost ? 'Host đang chọn tập' : episode.name} onClick={() => party.changeEpisode(episode)} className={cn('flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 disabled:cursor-not-allowed disabled:opacity-40', active ? 'border-purple-400 bg-purple-500/25 text-purple-100' : 'border-white/10 bg-black/20 text-slate-300 hover:border-white/25 hover:bg-white/[0.05]')}>
                  {active && <Play className="h-3.5 w-3.5 shrink-0 fill-current" />}<span className="truncate">{episode.name}</span>
                </button>
              })}</div>}
            </div>
          })}</div>
        </div>
      </section>
    </main>
  </div>
}
