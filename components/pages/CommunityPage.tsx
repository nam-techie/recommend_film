'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Flag, Loader2, MessageCircle, Sparkles, Star, Users } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { AccountAvatar } from '@/components/account/AccountAvatar'
import { Button } from '@/components/ui/button'
import type { CommunityFeedResponse, CommunityFeedTab } from '@/lib/community'

export function CommunityPage() {
  const { user, loading: authLoading } = useAuth()
  const [tab, setTab] = useState<CommunityFeedTab>('trending')
  const [data, setData] = useState<CommunityFeedResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    if (!user) return
    setLoading(true); setError(null)
    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/community/feed?tab=${tab}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Không thể tải cộng đồng.')
      setData(payload)
    } catch (next) { setError(next instanceof Error ? next.message : 'Không thể tải cộng đồng.') }
    finally { setLoading(false) }
  }, [tab, user])
  useEffect(() => { void load() }, [load])

  const report = async (item: CommunityFeedResponse['items'][number]) => {
    if (!user) return
    const token = await user.getIdToken()
    const response = await fetch('/api/community/reports', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ targetType: item.kind, targetId: item.kind === 'review' ? item.review?.id : item.activity?.id, targetUid: item.kind === 'review' ? item.review?.authorUid : item.activity?.actorUid, movieSlug: item.kind === 'review' ? item.review?.movieSlug : item.activity?.movieSlug, reason: 'community_content', details: 'Người dùng báo cáo từ community feed.' }) })
    setError(response.ok ? 'Đã gửi báo cáo cho đội ngũ kiểm duyệt.' : ((await response.json().catch(() => ({}))) as { error?: string }).error || 'Không thể gửi báo cáo.')
  }

  if (authLoading) return <main className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-accent" /></main>
  if (!user) return <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center"><Users className="h-10 w-10 text-accent-soft" /><h1 className="mt-5 text-title-1">Cộng đồng CineMind</h1><p className="mt-3 text-sm leading-6 text-fg-secondary">Đăng nhập để khám phá review, hoạt động phim và những người có cùng gu.</p><Button asChild className="mt-6"><Link href="/login?returnUrl=/community">Đăng nhập</Link></Button></main>

  return <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
    <header className="max-w-3xl"><p className="text-eyebrow text-accent-soft">Cộng đồng</p><h1 className="mt-3 text-title-1">Bàn về phim, không tạo thêm một mạng xã hội ồn ào.</h1><p className="mt-3 text-sm leading-7 text-fg-secondary">Review, hoạt động và phòng xem chung công khai. Lịch sử xem chính xác của bạn không xuất hiện trong feed.</p></header>
    <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section><div role="tablist" aria-label="Community feed" className="flex gap-1 border-b border-white/[0.08]">{([['trending','Đang được bàn luận'],['following','Bạn bè & theo dõi']] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`min-h-12 border-b-2 px-4 text-sm font-semibold ${tab === id ? 'border-accent text-accent-soft' : 'border-transparent text-fg-muted hover:text-fg'}`}>{label}</button>)}</div>
        {error && <p role="status" className="mt-4 border border-info/20 bg-info/[0.06] px-4 py-3 text-sm text-info-soft">{error}</p>}
        {loading && !data ? <div className="flex min-h-52 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div> : data?.items.length ? <div className="divide-y divide-white/[0.07]">{data.items.map((item) => {
          const author = item.review ? { uid: item.review.authorUid, name: item.review.authorName, username: item.review.authorUsername, avatar: item.review.authorAvatar } : { uid: item.activity!.actorUid, name: item.activity!.actorName, username: item.activity!.actorUsername, avatar: item.activity!.actorAvatar }
          return <article key={item.id} className="py-5"><div className="flex gap-3"><AccountAvatar name={author.name} src={author.avatar} className="h-10 w-10" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Link href={`/u/${author.username}`} className="font-semibold hover:text-accent-soft">{author.name}</Link><span className="text-xs text-fg-muted">@{author.username}</span><span className="text-xs text-fg-muted">· {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(item.createdAt)}</span></div>{item.review ? <><Link href={`/movie/${item.review.movieSlug}`} className="mt-3 block text-sm font-semibold text-accent-soft">{item.review.movieTitle}</Link><div className="mt-2 flex items-center gap-1 text-rating"><Star className="h-4 w-4 fill-current" /><span className="text-sm font-bold">{item.review.rating}/10</span></div><p className={`mt-3 text-sm leading-7 text-fg-secondary ${item.review.spoiler ? 'rounded-md bg-surface-2 p-3 blur-sm hover:blur-none focus-within:blur-none' : ''}`}>{item.review.content}</p></> : <p className="mt-3 text-sm leading-7 text-fg-secondary">{item.activity?.type === 'completed' ? 'đã xem xong' : item.activity?.type === 'watchlist' ? 'đã cập nhật danh sách' : 'đã hoạt động tại'} {item.activity?.movieTitle && <Link href={`/movie/${item.activity.movieSlug}`} className="font-semibold text-accent-soft">{item.activity.movieTitle}</Link>}</p>}<div className="mt-4 flex items-center gap-2"><Button size="sm" variant="ghost"><MessageCircle className="h-4 w-4" />Thảo luận</Button><Button size="sm" variant="ghost" onClick={() => void report(item)}><Flag className="h-4 w-4" />Báo cáo</Button></div></div></div></article>
        })}</div> : <div className="flex min-h-52 flex-col items-center justify-center text-center"><MessageCircle className="h-8 w-8 text-fg-muted" /><h2 className="mt-4 font-semibold">Feed đang yên tĩnh</h2><p className="mt-2 text-sm text-fg-muted">Review phim đầu tiên sẽ xuất hiện tại đây.</p></div>}
      </section>
      <aside className="h-fit border border-white/[0.08] bg-surface-1 p-5 lg:sticky lg:top-24"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent-soft" /><h2 className="font-semibold">Người có cùng gu</h2></div><p className="mt-2 text-xs leading-5 text-fg-muted">Chỉ sử dụng thể loại yêu thích của hồ sơ đã bật khám phá.</p><div className="mt-4 space-y-3">{data?.tasteMatches.map((profile) => <Link key={profile.uid} href={`/u/${profile.username}`} className="flex items-center gap-3 rounded-md p-2 hover:bg-white/[0.05]"><AccountAvatar name={profile.displayName} src={profile.avatar} className="h-9 w-9" /><span className="min-w-0"><span className="block truncate text-sm font-semibold">{profile.displayName}</span><span className="block truncate text-xs text-fg-muted">{profile.sharedGenres.join(' · ')}</span></span></Link>)}{!data?.tasteMatches.length && <p className="text-sm leading-6 text-fg-muted">Bật “Khám phá người cùng gu” trong Quyền riêng tư và chọn thể loại yêu thích.</p>}</div></aside>
    </div>
  </main>
}
