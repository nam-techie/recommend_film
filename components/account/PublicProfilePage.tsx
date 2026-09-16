
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Activity, Ban, Bookmark, CalendarDays, Check, Film, Flag, Heart, Loader2, LockKeyhole, MoreHorizontal, Share2, Star, UserPlus, Users } from 'lucide-react'
import { get, ref } from 'firebase/database'
import { useProfileCover } from '@/hooks/useProfileCover'
import { useAccount } from '@/hooks/useAccount'
import { useWatchProgress } from '@/hooks/useWatchProgress'
import { AccountAvatar } from '@/components/account/AccountAvatar'
import { SocialReviewCard } from '@/components/account/SocialReviewCard'
import { ActivityHeatmap } from '@/components/account/ActivityHeatmap'
import { PresenceBadge } from '@/components/account/PresenceBadge'
import { MembershipBadge } from '@/components/monetization/MembershipBadge'
import { ShareCardBuilder } from '@/components/account/ShareCardBuilder'
import { Button } from '@/components/ui/button'
import { PublicProfile, SocialActivity, SocialReview, WatchlistMovie } from '@/lib/account-types'
import { toggleFollow } from '@/lib/account-service'
import { auth, database } from '@/lib/firebase'
import { cn } from '@/lib/utils'
import type { AccountPlan } from '@/lib/monetization'

type ProfileTab = 'overview' | 'recent' | 'watchlist' | 'reviews' | 'activity'
interface RecentItem { movieSlug: string; movieTitle: string; poster?: string; episodeName?: string; percentage?: number; updatedAt: number }

export function PublicProfilePage({ username }: { username: string }) {
  const { records: ownProgressRecords } = useWatchProgress()
  const router = useRouter(); const account = useAccount(); const [profile, setProfile] = useState<PublicProfile | null>(null); const [membershipPlan, setMembershipPlan] = useState<AccountPlan | null>(null); const [loading, setLoading] = useState(true); const [notFound, setNotFound] = useState(false); const [following, setFollowing] = useState(false); const [followers, setFollowers] = useState(0); const [followingCount, setFollowingCount] = useState(0); const [recent, setRecent] = useState<RecentItem[]>([]); const [watchlist, setWatchlist] = useState<WatchlistMovie[]>([]); const [reviews, setReviews] = useState<SocialReview[]>([]); const [activities, setActivities] = useState<SocialActivity[]>([]); const [tab, setTab] = useState<ProfileTab>('overview'); const [menuOpen, setMenuOpen] = useState(false); const [copied, setCopied] = useState(false); const [friendActionLoading, setFriendActionLoading] = useState(false); const [friendActionError, setFriendActionError] = useState('')
  const cover = useProfileCover(profile?.cover, Boolean(profile?.uid && profile.uid === account.profile?.uid))
  const profileMenuRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true); setNotFound(false)
    try {
      const currentUser = auth?.currentUser
      const token = currentUser ? await currentUser.getIdToken() : null
      const response = await fetch(`/api/public/profiles/${encodeURIComponent(username)}`, { cache: 'no-store', headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      if (response.status === 404) { setNotFound(true); return }
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Không thể tải hồ sơ.')
      if (payload.private) {
        setProfile({ ...payload.profile, favoriteGenres: [], createdAt: 0, updatedAt: 0, isPublic: false, showRecentMovies: false, showWatchlist: false, showActivity: false, allowWatchPartyInvites: false, allowTasteDiscovery: false })
        setMembershipPlan(null); setFollowers(0); setFollowingCount(0); setRecent([]); setWatchlist([]); setReviews([]); setActivities([]); setFollowing(false)
        return
      }
      setProfile({ ...payload.profile, favoriteGenres: Array.isArray(payload.profile.favoriteGenres) ? payload.profile.favoriteGenres : [] })
      setMembershipPlan(payload.membershipPlan === 'normal' || payload.membershipPlan === 'premium' || payload.membershipPlan === 'ultra' ? payload.membershipPlan : null)
      setFollowers(Number(payload.counts?.followers || 0)); setFollowingCount(Number(payload.counts?.following || 0)); setFollowing(Boolean(payload.viewerFollowing))
      setRecent(Array.isArray(payload.recent) ? payload.recent : []); setWatchlist(Array.isArray(payload.watchlist) ? payload.watchlist : []); setReviews(Array.isArray(payload.reviews) ? payload.reviews : []); setActivities(Array.isArray(payload.activities) ? payload.activities : [])
    } catch { setNotFound(true) }
    finally { setLoading(false) }
  }, [account.profile, username])
  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (!menuOpen) return

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsidePress)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen])

  const ownProfile = account.profile?.uid === profile?.uid; const visible = Boolean(profile && (profile.isPublic || ownProfile))
  const profileRecent = ownProfile ? Object.values(ownProgressRecords).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 12) : recent
  const isFriend = Boolean(profile && account.friends[profile.uid]); const friendRequestSent = Boolean(profile && account.sentFriendRequests[profile.uid]); const incomingFriendRequest = profile ? account.friendRequests[profile.uid] : undefined
  const toggle = async () => { if (!account.profile || !profile || ownProfile) return; const next = !following; setFollowing(next); setFollowers((value) => Math.max(0, value + (next ? 1 : -1))); await toggleFollow(account.profile, profile, next).catch(() => { setFollowing(!next); setFollowers((value) => Math.max(0, value + (next ? -1 : 1))) }) }
  const handleFriend = async () => {
    if (!profile || friendActionLoading) return
    setFriendActionLoading(true); setFriendActionError('')
    try {
      if (isFriend) await account.unfriend(profile.uid)
      else if (friendRequestSent) await account.cancelFriend(profile.uid)
      else if (incomingFriendRequest) await account.answerFriend(incomingFriendRequest, true)
      else await account.requestFriend(profile)
    } catch (error) {
      setFriendActionError(error instanceof Error ? error.message : 'Không thể cập nhật lời mời kết bạn.')
    } finally { setFriendActionLoading(false) }
  }
  const report = async (type: 'block' | 'report') => { if (!account.profile || !profile || !database) return; if (type === 'block') await account.blockUser(profile.uid); else { const currentUser = auth?.currentUser; if (!currentUser) return; const token = await currentUser.getIdToken(); const response = await fetch('/api/community/reports', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ targetType: 'profile', targetId: profile.uid, targetUid: profile.uid, reason: 'profile', details: 'Báo cáo từ hồ sơ công khai.' }) }); if (!response.ok) throw new Error((await response.json().catch(() => ({})) as { error?: string }).error || 'Không thể gửi báo cáo.') } setMenuOpen(false) }
  const share = async () => { await navigator.clipboard.writeText(window.location.href); setCopied(true); window.setTimeout(() => setCopied(false), 1600) }

  if (loading) return <main className="flex min-h-[70vh] items-center justify-center bg-[#070912]"><Loader2 className="h-9 w-9 animate-spin text-accent-strong" /></main>
  if (notFound || !profile) return <State icon={Users} title="Không tìm thấy người dùng" text="Username này không tồn tại hoặc đã được thay đổi." />
  if (!visible) return <State icon={LockKeyhole} title="Hồ sơ riêng tư" text="Người dùng này chưa công khai trang cá nhân." />

  const profileTabs: Array<{ id: ProfileTab; label: string; show: boolean }> = [{ id: 'overview', label: 'Tổng quan', show: true }, { id: 'recent', label: 'Phim gần đây', show: profile.showRecentMovies || ownProfile }, { id: 'watchlist', label: 'Danh sách phim', show: profile.showWatchlist || ownProfile }, { id: 'reviews', label: 'Đánh giá', show: true }, { id: 'activity', label: 'Hoạt động', show: profile.showActivity || ownProfile }]
  return <main className="min-h-screen bg-[#070912] text-fg"><div className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-5 sm:py-10">
    <section className="relative isolate rounded-3xl border border-white/10 bg-[#0d111d]">
      <div
        className="h-36 rounded-t-[calc(1.5rem-1px)] bg-gradient-to-br from-accent-strong/70 via-slate-900 to-surface-2 sm:h-52"
        style={cover.url ? { backgroundImage: `linear-gradient(rgba(4,6,12,.25),rgba(4,6,12,.7)),url(${cover.url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      />
      <div className="px-4 pb-5 sm:px-7">
        <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 lg:flex-row lg:items-end">
          <AccountAvatar name={profile.displayName} src={profile.avatar} className="h-24 w-24 border-4 border-[#0d111d] text-xl sm:h-28 sm:w-28" />
          <div className="min-w-0 flex-1 lg:pb-1">
            <div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-2xl font-bold sm:text-3xl">{profile.displayName}</h1>{membershipPlan && <MembershipBadge plan={membershipPlan} />}</div>
            <p className="mt-1 truncate text-sm text-accent-soft">@{profile.username}</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
            {ownProfile ? (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><Button className="w-full sm:w-auto" onClick={() => router.push('/account?tab=profile')}><UserPlus className="mr-2 h-4 w-4" />Chỉnh sửa hồ sơ</Button><ShareCardBuilder compact /></div>
            ) : (
              <div className="grid w-full grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:flex sm:w-auto">
                <Button className="w-full sm:w-auto" disabled={!account.profile} onClick={() => void toggle()} variant={following ? 'outline' : 'default'}>
                  {following ? <Check className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                  {following ? 'Đang theo dõi' : 'Theo dõi'}
                </Button>
                <Button className="w-full sm:w-auto" disabled={!account.profile || friendActionLoading} variant={isFriend || incomingFriendRequest ? 'default' : 'outline'} onClick={() => void handleFriend()}>
                  {friendActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                  {isFriend ? 'Bạn bè' : incomingFriendRequest ? 'Chấp nhận kết bạn' : friendRequestSent ? 'Hủy lời mời' : 'Kết bạn'}
                </Button>
              </div>
            )}
            <div className="ml-auto flex items-center gap-2 sm:ml-0">
              <Button className="shrink-0" size="icon" variant="outline" aria-label="Chia sẻ hồ sơ" onClick={() => void share()}>
                {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              </Button>
              {!ownProfile && account.profile && (
                <div ref={profileMenuRef} className="relative shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Tùy chọn hồ sơ"
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                    onClick={() => setMenuOpen((value) => !value)}
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                  {menuOpen && (
                    <div role="menu" className="absolute bottom-full right-0 z-50 mb-2 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#111522] p-1 shadow-2xl">
                      <button role="menuitem" onClick={() => void report('block')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg-secondary hover:bg-white/5">
                        <Ban className="h-4 w-4" />Chặn
                      </button>
                      <button role="menuitem" onClick={() => void report('report')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-bad hover:bg-bad/10">
                        <Flag className="h-4 w-4" />Báo cáo
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {isFriend && profile && <PresenceBadge presence={account.friendPresence[profile.uid]} className="mt-4" />}
        {friendActionError && <p role="alert" className="mt-4 text-sm text-bad">{friendActionError}</p>}
        {profile.bio && <p className="mt-5 max-w-2xl text-sm leading-relaxed text-fg-secondary">{profile.bio}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <span><strong>{followers}</strong> <span className="text-fg-muted">người theo dõi</span></span>
          <span><strong>{followingCount}</strong> <span className="text-fg-muted">đang theo dõi</span></span>
          <span className="flex min-w-0 items-center gap-1.5 text-fg-muted"><CalendarDays className="h-4 w-4 shrink-0" />Tham gia {new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(profile.createdAt)}</span>
        </div>
      </div>
    </section>
    <nav className="mt-5 flex gap-2 overflow-x-auto border-b border-white/10" aria-label="Nội dung hồ sơ">{profileTabs.filter((item) => item.show).map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={cn('shrink-0 border-b-2 px-3 py-3 text-sm transition', tab === item.id ? 'border-accent-strong text-fg' : 'border-transparent text-fg-muted hover:text-fg')}>{item.label}</button>)}</nav>
    <section className="py-6">{tab === 'overview' && <div className="grid gap-5 lg:grid-cols-[1fr_340px]"><div><h2 className="mb-3 text-lg font-semibold">Đánh giá gần đây</h2>{reviews.length ? <div className="space-y-3">{reviews.slice(0, 3).map((review) => <SocialReviewCard key={review.id} review={review} actor={account.profile} onReviewDeleted={(deleted) => setReviews((items) => items.filter((item) => item.id !== deleted.id))} />)}</div> : <Empty icon={Star} text="Chưa có đánh giá công khai." />}</div><aside><h2 className="mb-3 text-lg font-semibold">Gu phim</h2><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">{profile.favoriteGenres?.length ? <div className="flex flex-wrap gap-2">{profile.favoriteGenres.map((genre) => <span key={genre} className="rounded-full bg-accent/10 px-3 py-1.5 text-xs text-accent-soft">{genre}</span>)}</div> : <p className="text-sm text-fg-muted">Chưa chọn thể loại yêu thích.</p>}</div></aside></div>}
      {tab === 'recent' && <MovieGrid items={profileRecent.map((item) => ({ slug: item.movieSlug, title: item.movieTitle, poster: item.poster, meta: item.episodeName }))} empty={ownProfile ? 'Bạn chưa xem phim nào gần đây.' : 'Chưa có phim gần đây được công khai.'} />}
      {tab === 'watchlist' && <MovieGrid items={watchlist.map((item) => ({ slug: item.movieSlug, title: item.title, poster: item.poster, meta: item.status === 'favorite' ? 'Yêu thích' : item.status === 'completed' ? 'Đã xem' : item.status === 'watching' ? 'Đang xem' : 'Muốn xem' }))} empty="Danh sách phim đang trống." />}
      {tab === 'reviews' && (reviews.length ? <div className="space-y-3">{reviews.map((review) => <SocialReviewCard key={review.id} review={review} actor={account.profile} onReviewDeleted={(deleted) => setReviews((items) => items.filter((item) => item.id !== deleted.id))} />)}</div> : <Empty icon={Star} text="Chưa có đánh giá." />)}
      {tab === 'activity' && <div className="space-y-4"><ActivityHeatmap activities={activities} />{activities.length ? <div className="overflow-hidden rounded-2xl border border-white/10">{activities.map((item) => <div key={item.id} className="flex items-center gap-3 border-b border-white/10 p-4 last:border-b-0"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent-soft">{item.type === 'review' ? <Star className="h-5 w-5" /> : item.type === 'follow' ? <Users className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><p className="text-sm">{item.type === 'review' ? 'Đã viết đánh giá cho' : item.type === 'follow' ? `Đã theo dõi ${item.targetName}` : 'Đã cập nhật danh sách'} {item.movieTitle && <Link href={`/movie/${item.movieSlug}`} className="font-semibold text-accent-soft hover:underline">{item.movieTitle}</Link>}</p><p className="mt-1 text-xs text-fg-muted">{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(item.createdAt)}</p></div></div>)}</div> : <Empty icon={Activity} text="Chưa có hoạt động công khai." />}</div>}
    </section>
  </div></main>
}

function MovieGrid({ items, empty }: { items: Array<{ slug: string; title: string; poster?: string; meta?: string }>; empty: string }) { return items.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{items.map((item) => <Link key={item.slug} href={`/movie/${item.slug}`} className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"><img src={item.poster || '/placeholder-movie.jpg'} alt="" className="aspect-[2/3] w-full object-cover transition duration-200 group-hover:scale-[1.03]" /><div className="p-3"><h3 className="line-clamp-2 text-sm font-semibold">{item.title}</h3>{item.meta && <p className="mt-1 truncate text-xs text-fg-muted">{item.meta}</p>}</div></Link>)}</div> : <Empty icon={Film} text={empty} /> }
function Empty({ icon: Icon, text }: { icon: typeof Film; text: string }) { return <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center"><Icon className="mx-auto h-8 w-8 text-fg-muted" /><p className="mt-3 text-sm text-fg-muted">{text}</p></div> }
function State({ icon: Icon, title, text }: { icon: typeof Users; title: string; text: string }) { return <main className="flex min-h-[70vh] items-center justify-center bg-[#070912] px-4 text-center text-fg"><div><Icon className="mx-auto h-10 w-10 text-fg-muted" /><h1 className="mt-4 text-2xl font-bold">{title}</h1><p className="mt-2 text-sm text-fg-secondary">{text}</p><Button asChild className="mt-5"><Link href="/">Về trang chủ</Link></Button></div></main> }
