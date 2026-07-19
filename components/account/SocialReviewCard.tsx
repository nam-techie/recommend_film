'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Heart, Loader2, MessageCircle, Send, Star, TriangleAlert } from 'lucide-react'
import { onValue, ref } from 'firebase/database'
import { useAuth } from '@/components/auth/AuthProvider'
import { AccountAvatar } from '@/components/account/AccountAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PublicProfile, ReviewReply, SocialReview } from '@/lib/account-types'
import { addReviewReply, toggleReviewLike } from '@/lib/account-service'
import { database } from '@/lib/firebase'
import { cn } from '@/lib/utils'

export function SocialReviewCard({ review, actor }: { review: SocialReview; actor?: PublicProfile | null }) {
  const { user } = useAuth()
  const [likes, setLikes] = useState<Record<string, boolean>>({})
  const [replies, setReplies] = useState<ReviewReply[]>([])
  const [replyOpen, setReplyOpen] = useState(false)
  const [reply, setReply] = useState('')
  const [spoilerOpen, setSpoilerOpen] = useState(!review.spoiler)
  const [sendingReply, setSendingReply] = useState(false)
  const [interactionError, setInteractionError] = useState('')

  useEffect(() => {
    if (!database) return
    const offLikes = onValue(ref(database, `reviewLikes/${review.movieSlug}/${review.authorUid}`), (snapshot) => setLikes(snapshot.val() || {}), () => setInteractionError('Không tải được lượt thích.'))
    const offReplies = onValue(ref(database, `reviewReplies/${review.movieSlug}/${review.authorUid}`), (snapshot) => setReplies(Object.values((snapshot.val() || {}) as Record<string, ReviewReply>).sort((a, b) => a.createdAt - b.createdAt)), () => setInteractionError('Không tải được bình luận. Hãy publish Firebase Rules mới.'))
    return () => { offLikes(); offReplies() }
  }, [review.authorUid, review.movieSlug])

  const liked = Boolean(user && likes[user.uid])
  const likeCount = useMemo(() => Object.keys(likes).length, [likes])
  const changeLike = async () => {
    if (!actor) return
    setInteractionError('')
    try { await toggleReviewLike(actor, review, !liked) }
    catch (error) { setInteractionError(error instanceof Error && /permission/i.test(error.message) ? 'Firebase đang từ chối tương tác. Hãy publish Rules mới.' : 'Không cập nhật được lượt thích.') }
  }
  const sendReply = async () => {
    if (!actor || !reply.trim() || sendingReply) return
    setSendingReply(true); setInteractionError('')
    try { await addReviewReply(actor, review, reply); setReply(''); setReplyOpen(false) }
    catch (error) { setInteractionError(error instanceof Error && /permission/i.test(error.message) ? 'Firebase đang từ chối bình luận. Hãy publish Rules mới.' : error instanceof Error ? error.message : 'Không gửi được bình luận.') }
    finally { setSendingReply(false) }
  }

  return <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
    <div className="flex items-start gap-3"><Link href={`/u/${review.authorUsername}`}><AccountAvatar name={review.authorName} src={review.authorAvatar} className="h-10 w-10 text-xs" /></Link><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><Link href={`/u/${review.authorUsername}`} className="text-sm font-semibold hover:text-purple-300">{review.authorName}</Link><span className="text-xs text-slate-500">@{review.authorUsername}</span><span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300"><Star className="h-3 w-3 fill-current" />{review.rating}/10</span></div><p className="mt-1 text-[11px] text-slate-500">{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(review.updatedAt)}</p></div></div>
    {review.spoiler && !spoilerOpen ? <button type="button" onClick={() => setSpoilerOpen(true)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-6 text-sm text-amber-200"><TriangleAlert className="h-4 w-4" />Nội dung có tiết lộ. Bấm để xem.</button> : <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">{review.content}</p>}
    <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3"><Button size="sm" variant="ghost" disabled={!actor} onClick={() => void changeLike()} className={cn('rounded-full text-slate-400', liked && 'text-pink-300')}><Heart className={cn('mr-1.5 h-4 w-4', liked && 'fill-current')} />{likeCount}</Button><Button size="sm" variant="ghost" disabled={!actor} onClick={() => { setReplyOpen((value) => !value); setInteractionError('') }} className="rounded-full text-slate-400"><MessageCircle className="mr-1.5 h-4 w-4" />{replies.length}</Button></div>
    {replies.length > 0 && <div className="mt-3 space-y-3 border-l border-white/10 pl-4">{replies.map((item) => <div key={item.id} className="flex gap-2"><AccountAvatar name={item.authorName} src={item.authorAvatar} className="h-7 w-7 text-[9px]" /><div><p className="text-xs font-medium">{item.authorName} <span className="font-normal text-slate-500">@{item.authorUsername}</span></p><p className="mt-1 text-xs leading-relaxed text-slate-300">{item.content}</p></div></div>)}</div>}
    {replyOpen && <div className="mt-3"><div className="flex gap-2"><Input value={reply} onChange={(event) => setReply(event.target.value.slice(0, 300))} placeholder="Viết bình luận…" onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendReply() } }} /><Button size="icon" disabled={!reply.trim() || sendingReply} aria-label="Gửi bình luận" onClick={() => void sendReply()}>{sendingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button></div><p className="mt-1 text-right text-[10px] text-slate-600">{reply.length}/300</p></div>}
    {interactionError && <p role="alert" className="mt-3 text-xs text-red-300">{interactionError}</p>}
  </article>
}
