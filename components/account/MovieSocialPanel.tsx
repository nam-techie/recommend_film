'use client'

import { useEffect, useState } from 'react'
import { Bookmark, Check, Heart, Loader2, MessageSquareText, Star } from 'lucide-react'
import { onValue, ref } from 'firebase/database'
import { useAccount } from '@/hooks/useAccount'
import { useAuth } from '@/components/auth/AuthProvider'
import { AuthDialog } from '@/components/auth/AuthDialog'
import { SocialReviewCard } from '@/components/account/SocialReviewCard'
import { Button } from '@/components/ui/button'
import { SocialReview } from '@/lib/account-types'
import { saveReview, writeActivity } from '@/lib/account-service'
import { database } from '@/lib/firebase'
import { cn } from '@/lib/utils'

const MIN_REVIEW_LENGTH = 3

export function MovieSocialPanel({ movie }: { movie: { slug: string; title: string; poster?: string; year?: number } }) {
  const { user } = useAuth()
  const account = useAccount()
  const [reviews, setReviews] = useState<SocialReview[]>([])
  const [rating, setRating] = useState(8)
  const [content, setContent] = useState('')
  const [spoiler, setSpoiler] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [noticeError, setNoticeError] = useState(false)
  const trimmedLength = content.trim().length

  useEffect(() => {
    if (!database) return
    return onValue(
      ref(database, `reviews/${movie.slug}`),
      (snapshot) => setReviews(Object.values((snapshot.val() || {}) as Record<string, SocialReview>).sort((a, b) => b.updatedAt - a.updatedAt)),
      () => { setReviews([]); setNoticeError(true); setNotice('Không tải được đánh giá. Hãy kiểm tra Firebase Rules.') },
    )
  }, [movie.slug])

  useEffect(() => {
    const own = reviews.find((item) => item.authorUid === user?.uid)
    if (own) { setRating(own.rating); setContent(own.content); setSpoiler(Boolean(own.spoiler)) }
  }, [reviews, user?.uid])

  const libraryItem = account.watchlist[movie.slug]
  const libraryMovie = { movieSlug: movie.slug, title: movie.title, poster: movie.poster, year: movie.year }
  const save = async () => {
    if (!account.profile || account.degraded || trimmedLength < MIN_REVIEW_LENGTH || rating < 1 || rating > 10) return
    setSaving(true); setNotice(null); setNoticeError(false)
    try {
      await saveReview(account.profile, { movieSlug: movie.slug, movieTitle: movie.title, poster: movie.poster, rating, content: content.trim(), spoiler })
      await writeActivity(account.profile.uid, { actorUid: account.profile.uid, actorName: account.profile.displayName, actorUsername: account.profile.username, actorAvatar: account.profile.avatar, type: 'review', movieSlug: movie.slug, movieTitle: movie.title, poster: movie.poster }).catch(() => undefined)
      setNotice('Đã lưu đánh giá.')
    } catch (error) {
      setNoticeError(true)
      setNotice(error instanceof Error && /permission/i.test(error.message) ? 'Firebase đang từ chối quyền ghi. Hãy publish Rules mới.' : error instanceof Error ? error.message : 'Chưa lưu được đánh giá.')
    } finally { setSaving(false) }
  }

  return <section className="mt-10 space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-sm text-purple-300">Cộng đồng</p><h2 className="mt-1 text-2xl font-bold text-white">Danh sách và đánh giá</h2><p className="mt-1 text-sm text-slate-400">Lưu phim hoặc chia sẻ cảm nhận với người xem khác.</p></div>
      {user ? <div className="flex flex-wrap gap-2"><Button variant={libraryItem?.watchLater ? 'default' : 'outline'} disabled={account.degraded} onClick={() => void account.updateMovieLibrary(libraryMovie, { watchLater: !libraryItem?.watchLater })}><Bookmark className="h-4 w-4" />{libraryItem?.watchLater ? 'Đã thêm Xem sau' : 'Xem sau'}</Button><Button variant={libraryItem?.favorite ? 'default' : 'outline'} disabled={account.degraded} onClick={() => void account.updateMovieLibrary(libraryMovie, { favorite: !libraryItem?.favorite })} className={libraryItem?.favorite ? 'bg-rose-600 hover:bg-rose-500' : ''}><Heart className={cn('h-4 w-4', libraryItem?.favorite && 'fill-current')} />Yêu thích</Button><Button variant={libraryItem?.watchStatus === 'completed' ? 'default' : 'outline'} disabled={account.degraded} onClick={() => void account.updateMovieLibrary(libraryMovie, { watchStatus: libraryItem?.watchStatus === 'completed' ? null : 'completed' })}><Check className="h-4 w-4" />{libraryItem?.watchStatus === 'completed' ? 'Đã xem' : 'Đánh dấu đã xem'}</Button></div> : <AuthDialog><Button variant="outline"><Bookmark className="mr-2 h-4 w-4" />Lưu phim</Button></AuthDialog>}
    </div>

    {user && account.profile && !account.degraded ? <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold text-white">{reviews.some((item) => item.authorUid === user.uid) ? 'Chỉnh sửa đánh giá' : 'Viết đánh giá'}</h3><div className="flex items-center gap-1" aria-label={`Điểm ${rating} trên 10`}>{Array.from({ length: 10 }, (_, index) => index + 1).map((value) => <button key={value} type="button" aria-label={`${value} điểm`} onClick={() => setRating(value)} className={cn('flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition', value <= rating ? 'bg-amber-500/15 text-amber-300' : 'bg-white/5 text-slate-500 hover:text-white')}>{value}</button>)}</div></div>
      <textarea value={content} onChange={(event) => { setContent(event.target.value.slice(0, 1200)); setNotice(null) }} rows={4} placeholder="Điều gì khiến bộ phim đáng xem?" className="mt-4 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-purple-500" />
      <div className="mt-3 flex flex-wrap items-center gap-3"><label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={spoiler} onChange={(event) => setSpoiler(event.target.checked)} className="accent-purple-500" />Có nội dung tiết lộ</label><span className={cn('text-xs', trimmedLength > 0 && trimmedLength < MIN_REVIEW_LENGTH ? 'text-amber-300' : 'text-slate-600')}>{content.length}/1200</span>{trimmedLength > 0 && trimmedLength < MIN_REVIEW_LENGTH && <span className="text-xs text-amber-300">Cần ít nhất {MIN_REVIEW_LENGTH} ký tự.</span>}{notice && <span role="status" className={cn('text-xs', noticeError ? 'text-red-300' : 'text-emerald-300')}>{notice}</span>}<Button size="sm" disabled={saving || trimmedLength < MIN_REVIEW_LENGTH || rating < 1} onClick={() => void save()} className="ml-auto">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><MessageSquareText className="mr-2 h-4 w-4" />Lưu đánh giá</>}</Button></div>
    </div> : <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">{user ? 'Dữ liệu tài khoản chưa kết nối. Hãy thử lại trong trang Tài khoản.' : 'Đăng nhập để viết đánh giá và tương tác.'}</div>}

    <div className="space-y-3">{reviews.length ? reviews.map((review) => <SocialReviewCard key={review.id} review={review} actor={account.degraded ? null : account.profile} onReviewDeleted={(deleted) => { if (deleted.authorUid === user?.uid) { setContent(''); setRating(8); setSpoiler(false); setNotice('Đã xóa đánh giá.'); setNoticeError(false) } }} />) : <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center"><Star className="mx-auto h-7 w-7 text-slate-600" /><p className="mt-3 text-sm text-slate-400">Chưa có đánh giá. Hãy là người đầu tiên.</p></div>}</div>
  </section>
}
