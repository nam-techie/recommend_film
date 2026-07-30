'use client'

import { ReactNode, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Clock3, Link2, Loader, LockKeyhole, Radio, Users } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { AuthDialog } from '@/components/auth/AuthDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createWatchParty, getActiveWatchParty, probeWatchPartyMedia, WatchPartyApiError } from '@/hooks/useWatchParty'
import { WatchPartyAccessMode, WatchPartyEpisode, WatchPartyRoomPreview } from '@/lib/watch-party-types'

interface Props {
  children: ReactNode
  movieSlug: string
  movieTitle: string
  movieOriginalTitle?: string
  moviePoster?: string
  movieYear?: number
  movieDuration?: string
  movieType?: 'single' | 'series' | 'hoathinh'
  movieGenres?: string[]
  movieQuality?: string
  movieLanguage?: string
  movieRating?: number
  movieVideoUrl?: string
  episodes?: WatchPartyEpisode[]
  initialEpisodeId?: string
}

export function CreateWatchPartyDialog({ children, movieSlug, movieTitle, movieOriginalTitle, moviePoster, movieYear, movieDuration, movieType, movieGenres, movieQuality, movieLanguage, movieRating, movieVideoUrl, episodes = [], initialEpisodeId }: Props) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [open, setOpen] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [accessMode, setAccessMode] = useState<WatchPartyAccessMode>('link_only')
  const [password, setPassword] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [probeCapability, setProbeCapability] = useState<WatchPartyEpisode['capability'] | null>(null)
  const [activeRoom, setActiveRoom] = useState<WatchPartyRoomPreview | null>(null)
  const availableEpisodes = useMemo<WatchPartyEpisode[]>(() => episodes.length ? episodes : movieVideoUrl ? [{ id: 'fallback-0', name: 'Tập hiện tại', slug: 'tap-hien-tai', serverName: 'Nguồn mặc định', serverIndex: 0, episodeIndex: 0, ...(movieVideoUrl.includes('.m3u8') ? { linkM3u8: movieVideoUrl, capability: 'full' as const } : { linkEmbed: movieVideoUrl, capability: 'limited' as const }) }] : [], [episodes, movieVideoUrl])
  const selected = availableEpisodes.find((item) => item.id === initialEpisodeId && item.linkM3u8) || availableEpisodes.find((item) => item.linkM3u8)
  const limited = selected?.capability === 'limited'

  useEffect(() => {
    if (!open || !selected) return undefined
    let active = true
    setProbeCapability(null)
    void probeWatchPartyMedia(selected).then((result) => { if (active) setProbeCapability(result.capability) }).catch(() => undefined)
    return () => { active = false }
  }, [open, selected])

  useEffect(() => {
    if (!open || !user) return
    let active = true
    void user.getIdToken().then(getActiveWatchParty).then((result) => { if (active) setActiveRoom(result.room) }).catch(() => undefined)
    return () => { active = false }
  }, [open, user])

  const create = async (replaceActiveRoom = false) => {
    if (!selected) return
    if (!user) { setError('Bạn cần đăng nhập hoặc tạo tài khoản trước khi tạo phòng.'); return }
    if (accessMode === 'password' && (password.length < 6 || password.length > 64)) { setError('Mật khẩu phải từ 6 đến 64 ký tự.'); return }
    setIsCreating(true); setError(null)
    try {
      const firebaseIdToken = await user.getIdToken()
      const result = await createWatchParty({ roomName: roomName.trim() || undefined, accessMode, password: accessMode === 'password' ? password : undefined, movie: { slug: movieSlug, title: movieTitle, originalTitle: movieOriginalTitle, poster: moviePoster, year: movieYear, duration: movieDuration, type: movieType, genres: movieGenres, quality: movieQuality, language: movieLanguage, rating: movieRating, episodes: availableEpisodes }, initialEpisodeId: selected.id, replaceActiveRoom, expectedActiveRoomId: activeRoom?.id }, firebaseIdToken)
      setOpen(false); router.push(`/watch-party/${result.roomId}`)
    } catch (nextError) {
      if (nextError instanceof WatchPartyApiError && nextError.code === 'ACTIVE_ROOM_EXISTS') setActiveRoom(nextError.details?.activeRoom as WatchPartyRoomPreview)
      setError(nextError instanceof Error ? nextError.message : 'Không thể tạo phòng.')
    }
    finally { setIsCreating(false) }
  }

  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild>{children}</DialogTrigger><DialogContent className="border-white/10 bg-[#111522] sm:max-w-lg">
    <DialogHeader><DialogTitle className="flex items-center gap-2 text-fg"><Users className="h-5 w-5 text-accent-strong" />Tạo phòng xem chung</DialogTitle><DialogDescription>Host có thể đăng nhập bằng Google hoặc email/mật khẩu, sau đó chọn quyền riêng tư và chia sẻ link.</DialogDescription></DialogHeader>
    <div className="space-y-5">
      <div className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3">{moviePoster && <img src={moviePoster} alt="" className="h-20 w-14 rounded object-cover" />}<div><p className="font-semibold text-fg">{movieTitle}</p><p className="text-sm text-fg-secondary">{selected?.name} · {selected?.serverName}</p><Badge className={`mt-2 ${limited ? 'bg-rating/70' : 'bg-ok/70'}`}>{limited ? 'Đồng bộ giới hạn' : 'Đồng bộ đầy đủ'}</Badge></div></div>
      {limited && <div className="flex gap-2 rounded-lg border border-rating/30 bg-rating/10 p-3 text-sm text-rating"><AlertTriangle className="h-5 w-5 shrink-0" /><span>Nguồn iframe chỉ đồng bộ đổi tập, chat và reaction; không đảm bảo play, pause và seek.</span></div>}
      {!selected && <div className="flex gap-2 rounded-lg border border-bad/30 bg-bad/10 p-3 text-sm text-bad"><AlertTriangle className="h-5 w-5 shrink-0" /><span>Phim này chưa có nguồn HLS nên không thể tạo phòng realtime. Iframe chỉ dùng dự phòng khi xem cá nhân.</span></div>}
      {probeCapability === 'unavailable' && <div className="flex gap-2 rounded-lg border border-bad/30 bg-bad/10 p-3 text-sm text-bad"><AlertTriangle className="h-5 w-5 shrink-0" /><span>Máy chủ không truy cập được nguồn HLS hiện tại. Hãy thử lại hoặc chọn nguồn khác.</span></div>}
      {!user && <div className="rounded-lg border border-accent/30 bg-accent/10 p-4"><p className="mb-3 text-sm text-accent-soft">Bạn cần đăng nhập để trở thành host và có thể lấy lại quyền sau khi mất kết nối.</p><AuthDialog><Button type="button" className="w-full" disabled={authLoading}>Đăng nhập hoặc đăng ký</Button></AuthDialog></div>}
      {user && <p className="text-sm text-gray-300">Host: <span className="font-medium text-fg">{user.displayName || user.email}</span></p>}
      <div className="flex gap-2 rounded-xl border border-info/20 bg-info/[0.08] p-3 text-xs leading-relaxed text-info-soft"><Clock3 className="mt-0.5 h-4 w-4 shrink-0" /><span>Phòng công khai sẽ ẩn ngay khi trống và tự xóa sau 5 phút nếu không ai quay lại. Mỗi phòng hoạt động tối đa 12 giờ.</span></div>
      {activeRoom && <div className="space-y-3 rounded-xl border border-rating/25 bg-rating/[0.08] p-3"><div><p className="text-sm font-semibold text-rating">Bạn đang có phòng {activeRoom.id}</p><p className="mt-1 text-xs text-rating/70">{activeRoom.movie.title} · {activeRoom.userCount} người đang xem</p></div><div className="grid grid-cols-2 gap-2"><Button type="button" variant="outline" onClick={() => { setOpen(false); router.push(`/watch-party/${activeRoom.id}`) }}>Vào phòng cũ</Button><Button type="button" variant="destructive" disabled={isCreating} onClick={() => void create(true)}>Kết thúc và tạo mới</Button></div></div>}
      <div className="space-y-2"><Label htmlFor="watch-party-name">Tên phòng</Label><Input id="watch-party-name" value={roomName} onChange={(event) => setRoomName(event.target.value)} maxLength={80} placeholder={`${movieTitle} — phòng của tôi`} /></div>
      <div className="grid gap-2 sm:grid-cols-3">{([{ mode: 'public', label: 'Công khai', icon: Radio }, { mode: 'link_only', label: 'Bằng link', icon: Link2 }, { mode: 'password', label: 'Mật khẩu', icon: LockKeyhole }] as const).map(({ mode, label, icon: Icon }) => <Button key={mode} type="button" variant={accessMode === mode ? 'default' : 'outline'} onClick={() => setAccessMode(mode)}><Icon className="mr-2 h-4 w-4" />{label}</Button>)}</div>
      {accessMode === 'password' && <div className="space-y-2"><Label htmlFor="watch-party-password">Mật khẩu phòng</Label><Input id="watch-party-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} maxLength={64} placeholder="Từ 6–64 ký tự" /></div>}
      {error && <p className="text-sm text-bad" role="alert">{error}</p>}
      <Button className="w-full" disabled={!selected || isCreating || authLoading || !user || Boolean(activeRoom) || (accessMode === 'password' && password.length < 6)} onClick={() => void create()}>{isCreating ? <><Loader className="mr-2 h-4 w-4 animate-spin" />Đang tạo phòng…</> : 'Tạo phòng và vào xem'}</Button>
    </div>
  </DialogContent></Dialog>
}
