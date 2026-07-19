'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Film, Loader2, MessageCircle, Minus, Search, Send, UserPlus, Users, X } from 'lucide-react'
import { limitToLast, onDisconnect, onValue, query, ref, set } from 'firebase/database'
import { AccountAvatar } from '@/components/account/AccountAvatar'
import { Button } from '@/components/ui/button'
import { useAccount } from '@/hooks/useAccount'
import { useAuth } from '@/components/auth/AuthProvider'
import { ConversationState, DirectConversation, DirectMessage, FriendshipRecord, TypingState } from '@/lib/account-types'
import { database } from '@/lib/firebase'
import { directConversationId, ensureDirectConversation, markConversationRead, sendDirectMessage, setConversationTyping } from '@/lib/messaging-service'
import { cn } from '@/lib/utils'

const messageTime = (timestamp: number) => new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(timestamp)

export function FriendMessenger({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const account = useAccount()
  const { user } = useAuth()
  const [selectedUid, setSelectedUid] = useState<string | null>(null)
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [conversationStates, setConversationStates] = useState<Record<string, ConversationState>>({})
  const [conversationSummaries, setConversationSummaries] = useState<Record<string, DirectConversation>>({})
  const [messageLimit, setMessageLimit] = useState(30)
  const [friendQuery, setFriendQuery] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [typing, setTyping] = useState(false)
  const [error, setError] = useState('')
  const typingTimer = useRef<number | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const selected = selectedUid ? account.friends[selectedUid] : undefined
  const conversationId = user && selected ? directConversationId(user.uid, selected.uid) : null
  const normalizedFriendQuery = friendQuery.trim().replace(/^@/, '').toLocaleLowerCase('vi')
  const friends = useMemo(() => Object.values(account.friends)
    .filter((friend) => !normalizedFriendQuery || friend.displayName.toLocaleLowerCase('vi').includes(normalizedFriendQuery) || friend.username.toLocaleLowerCase('vi').includes(normalizedFriendQuery))
    .sort((a, b) => (conversationSummaries[directConversationId(user?.uid || '', b.uid)]?.lastMessageAt || 0) - (conversationSummaries[directConversationId(user?.uid || '', a.uid)]?.lastMessageAt || 0) || Number(account.friendPresence[b.uid]?.online) - Number(account.friendPresence[a.uid]?.online) || a.displayName.localeCompare(b.displayName, 'vi')), [account.friendPresence, account.friends, conversationSummaries, normalizedFriendQuery, user?.uid])

  useEffect(() => {
    const listener = (event: Event) => {
      const uid = (event as CustomEvent<{ uid?: string }>).detail?.uid
      if (uid) setSelectedUid(uid)
      onOpenChange(true)
    }
    window.addEventListener('cinemind:open-chat', listener)
    return () => window.removeEventListener('cinemind:open-chat', listener)
  }, [onOpenChange])

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onOpenChange(false) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onOpenChange, open])

  useEffect(() => {
    if (!open || !database || !user) return
    let childUnsubscribers: Array<() => void> = []
    const unsubscribe = onValue(ref(database, `userConversations/${user.uid}`), (snapshot) => {
      childUnsubscribers.forEach((stop) => stop()); childUnsubscribers = []
      const states = (snapshot.val() || {}) as Record<string, ConversationState>
      setConversationStates(states)
      const ids = Object.keys(states)
      setConversationSummaries((current) => Object.fromEntries(Object.entries(current).filter(([id]) => ids.includes(id))))
      childUnsubscribers = ids.map((id) => onValue(ref(database!, `directConversations/${id}`), (conversationSnapshot) => setConversationSummaries((current) => ({ ...current, ...(conversationSnapshot.exists() ? { [id]: conversationSnapshot.val() as DirectConversation } : {}) }))))
    })
    return () => { unsubscribe(); childUnsubscribers.forEach((stop) => stop()) }
  }, [open, user])

  useEffect(() => {
    if (!open || !database || !conversationId || !user) { setMessages([]); return }
    const ownTypingRef = ref(database, `directTyping/${conversationId}/${user.uid}`)
    void onDisconnect(ownTypingRef).remove().catch(() => undefined)
    const unsubscribeMessages = onValue(query(ref(database, `directMessages/${conversationId}`), limitToLast(messageLimit)), (snapshot) => {
      setMessages(Object.values((snapshot.val() || {}) as Record<string, DirectMessage>).sort((a, b) => a.createdAt - b.createdAt))
      void markConversationRead(user.uid, conversationId).catch(() => undefined)
      window.setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 20)
    }, () => setError('Không tải được cuộc trò chuyện. Hãy kiểm tra quyền Firebase Database.'))
    const unsubscribeTyping = onValue(ref(database, `directTyping/${conversationId}/${selectedUid}`), (snapshot) => {
      const value = snapshot.val() as TypingState | null
      setTyping(Boolean(value?.typing && Date.now() - value.updatedAt < 5000))
    })
    return () => { unsubscribeMessages(); unsubscribeTyping(); void onDisconnect(ownTypingRef).cancel().catch(() => undefined); void set(ownTypingRef, null).catch(() => undefined) }
  }, [conversationId, messageLimit, open, selectedUid, user])

  useEffect(() => () => { if (typingTimer.current) window.clearTimeout(typingTimer.current) }, [])

  const selectFriend = async (friend: FriendshipRecord) => {
    setSelectedUid(friend.uid); setMessageLimit(30); setError('')
    if (account.profile) await ensureDirectConversation(account.profile, friend).catch(() => setError('Không mở được cuộc trò chuyện.'))
  }
  const updateText = (value: string) => {
    setText(value.slice(0, 1000))
    if (!conversationId || !user) return
    void setConversationTyping(conversationId, user.uid, Boolean(value.trim())).catch(() => undefined)
    if (typingTimer.current) window.clearTimeout(typingTimer.current)
    typingTimer.current = window.setTimeout(() => void setConversationTyping(conversationId, user.uid, false).catch(() => undefined), 1200)
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!account.profile || !selected || !text.trim() || sending) return
    setSending(true); setError('')
    try { await sendDirectMessage(account.profile, selected, text); setText(''); if (conversationId && user) await setConversationTyping(conversationId, user.uid, false) }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Không gửi được tin nhắn.') }
    finally { setSending(false) }
  }

  if (!open) return null
  return <div className="fixed inset-0 z-[80] bg-black/70 sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(680px,calc(100dvh-7rem))] sm:w-[400px] sm:bg-transparent">
    <aside className="flex h-full w-full flex-col overflow-hidden bg-[#0b0e17] text-white shadow-[0_24px_90px_rgba(0,0,0,.7)] sm:rounded-3xl sm:border sm:border-white/10">
      <div className="h-1 shrink-0 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400" />
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-white/[0.08] px-3">
        {selected ? <Button size="icon" variant="ghost" aria-label="Về danh sách bạn bè" title="Danh sách bạn bè" onClick={() => setSelectedUid(null)} className="h-9 w-9 rounded-full"><ChevronLeft className="h-5 w-5" /></Button> : <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15"><MessageCircle className="h-5 w-5 text-purple-300" /></span>}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold">{selected ? selected.displayName : 'Bạn bè & Tin nhắn'}</h2>
          <p className="truncate text-[11px] text-slate-500">{selected ? (typing ? 'Đang nhập…' : account.friendPresence[selected.uid]?.online ? 'Đang hoạt động' : `@${selected.username}`) : `${Object.keys(account.friends).length} bạn bè`}</p>
        </div>
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 rounded-full" title="Tìm phim"><Link href="/" onClick={() => onOpenChange(false)} aria-label="Đóng chat và tìm phim"><Film className="h-4 w-4" /></Link></Button>
        <Button size="icon" variant="ghost" aria-label="Thu nhỏ tin nhắn" title="Thu nhỏ" onClick={() => onOpenChange(false)} className="hidden h-9 w-9 rounded-full sm:inline-flex"><Minus className="h-5 w-5" /></Button>
        <Button size="icon" variant="ghost" aria-label="Đóng tin nhắn" title="Đóng" onClick={() => onOpenChange(false)} className="h-9 w-9 rounded-full hover:bg-red-500/10 hover:text-red-300"><X className="h-5 w-5" /></Button>
      </header>

      {!selected ? <>
        <div className="space-y-3 border-b border-white/[0.08] p-3">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={friendQuery} onChange={(event) => setFriendQuery(event.target.value)} placeholder="Tìm tên hoặc @username" className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.045] pl-10 pr-3 text-sm outline-none placeholder:text-slate-600 focus:border-purple-400/70" /></div>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline" className="h-9 flex-1 rounded-xl"><Link href="/account" onClick={() => onOpenChange(false)}><UserPlus className="h-4 w-4" />Tìm bạn mới</Link></Button>
            {Object.keys(account.friendRequests).length > 0 && <Button asChild size="sm" className="h-9 flex-1 rounded-xl"><Link href="/account" onClick={() => onOpenChange(false)}>{Object.keys(account.friendRequests).length} lời mời</Link></Button>}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <p className="px-2 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600">Trò chuyện gần đây</p>
          {friends.length ? friends.map((friend) => {
            const id = directConversationId(user?.uid || '', friend.uid)
            const summary = conversationSummaries[id]
            const unread = Boolean(summary && summary.lastSenderUid !== user?.uid && summary.lastMessageAt > (conversationStates[id]?.lastReadAt || 0))
            return <button key={friend.uid} type="button" onClick={() => void selectFriend(friend)} className="group flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-white/[0.055]">
              <span className="relative"><AccountAvatar name={friend.displayName} src={friend.avatar} className="h-11 w-11 text-xs" />{account.friendPresence[friend.uid]?.online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0b0e17] bg-emerald-400" />}</span>
              <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className={cn('truncate text-sm', unread ? 'font-bold' : 'font-semibold')}>{friend.displayName}</p>{summary?.lastMessageAt ? <span className="ml-auto shrink-0 text-[10px] text-slate-600">{messageTime(summary.lastMessageAt)}</span> : null}</div><p className={cn('mt-0.5 truncate text-xs', unread ? 'font-medium text-purple-200' : 'text-slate-500')}>{summary?.lastMessage || `@${friend.username}`}</p></div>
              {unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-purple-400 shadow-[0_0_12px_rgba(192,132,252,.8)]" />}
            </button>
          }) : <div className="flex h-full min-h-64 flex-col items-center justify-center px-6 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]"><Users className="h-7 w-7 text-slate-600" /></span><p className="mt-4 text-sm font-semibold">{normalizedFriendQuery ? 'Không tìm thấy người bạn này' : 'Chưa có cuộc trò chuyện'}</p><p className="mt-1 text-xs leading-relaxed text-slate-500">{normalizedFriendQuery ? 'Thử tìm bằng tên hoặc username khác.' : 'Tìm và kết bạn để bắt đầu trò chuyện cùng nhau.'}</p>{!normalizedFriendQuery && <Button asChild size="sm" className="mt-4 rounded-xl"><Link href="/account" onClick={() => onOpenChange(false)}>Tìm bạn mới</Link></Button>}</div>}
        </div>
      </> : <>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(126,34,206,.08),transparent_38%)] px-3 py-4">
          {messages.length >= messageLimit && <button type="button" onClick={() => setMessageLimit((value) => value + 30)} className="mx-auto mb-4 block rounded-full bg-white/[0.05] px-3 py-1.5 text-[11px] text-purple-200 hover:bg-white/10">Tải tin nhắn cũ hơn</button>}
          {messages.length ? <div className="space-y-2.5">{messages.map((message) => {
            const own = message.senderUid === user?.uid
            return <div key={message.id} className={cn('flex', own ? 'justify-end' : 'justify-start')}><div className={cn('max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm', own ? 'rounded-br-md bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white' : 'rounded-bl-md border border-white/[0.06] bg-[#171b27] text-slate-100')}>
              {message.type === 'watch_party_invite' ? <div><p className="font-medium">{message.text}</p>{message.movieTitle && <p className="mt-1 text-xs text-white/65">{message.movieTitle}</p>}{message.roomId && <Link href={`/watch-party/${message.roomId}`} onClick={() => onOpenChange(false)} className="mt-2 inline-flex rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-purple-700">Tham gia xem</Link>}</div> : <p className="whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>}
              <p className="mt-1 text-right text-[9px] text-white/40">{messageTime(message.createdAt)}</p>
            </div></div>
          })}<div ref={endRef} /></div> : <div className="flex h-full min-h-64 flex-col items-center justify-center text-center"><AccountAvatar name={selected.displayName} src={selected.avatar} className="h-16 w-16" /><p className="mt-4 text-sm font-semibold">Bắt đầu trò chuyện với {selected.displayName}</p><p className="mt-1 text-xs text-slate-500">Gửi một lời chào để mở đầu câu chuyện.</p></div>}
        </div>
        {error && <p role="alert" className="border-t border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-200">{error}</p>}
        <form onSubmit={submit} className="flex shrink-0 items-end gap-2 border-t border-white/[0.08] bg-[#0d111c] p-3"><textarea value={text} onChange={(event) => updateText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} maxLength={1000} rows={1} placeholder="Nhập tin nhắn…" className="max-h-28 min-h-11 min-w-0 flex-1 resize-none rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-purple-400/70" /><Button type="submit" size="icon" disabled={!text.trim() || sending} className="h-11 w-11 shrink-0 rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 hover:opacity-90">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button></form>
      </>}
    </aside>
  </div>
}
