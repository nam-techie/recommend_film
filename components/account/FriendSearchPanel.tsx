'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { AtSign, Check, Loader2, Mail, MessageCircle, Search, UserPlus, X } from 'lucide-react'
import { AccountAvatar } from '@/components/account/AccountAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAccount } from '@/hooks/useAccount'
import { useAuth } from '@/components/auth/AuthProvider'
import { PublicProfile } from '@/lib/account-types'
import { getProfileByUsername, normalizeUsername } from '@/lib/account-service'
import { lookupProfileByEmail } from '@/lib/social-api'
import { cn } from '@/lib/utils'

type SearchMode = 'username' | 'email'
type SearchState = 'idle' | 'loading' | 'found' | 'empty' | 'error'

export function FriendSearchPanel() {
  const account = useAccount()
  const { getIdToken, user } = useAuth()
  const [mode, setMode] = useState<SearchMode>('username')
  const [username, setUsername] = useState('')
  const [gmailName, setGmailName] = useState('')
  const [customEmail, setCustomEmail] = useState('')
  const [customDomain, setCustomDomain] = useState(false)
  const [state, setState] = useState<SearchState>('idle')
  const [result, setResult] = useState<PublicProfile | null>(null)
  const [error, setError] = useState('')

  const resetResult = () => { setState('idle'); setResult(null); setError('') }
  const switchMode = (next: SearchMode) => { setMode(next); resetResult() }
  const email = customDomain ? customEmail.trim().toLowerCase() : `${gmailName.trim().toLowerCase()}@gmail.com`
  const valid = mode === 'username' ? normalizeUsername(username.replace(/^@/, '')).length >= 3 : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!valid || state === 'loading') return
    setState('loading'); setResult(null); setError('')
    try {
      const profile = mode === 'username'
        ? await getProfileByUsername(username.replace(/^@/, ''))
        : (await lookupProfileByEmail(email, (await getIdToken()) || '')).profile || null
      if (!profile) { setState('empty'); return }
      setResult(profile); setState('found')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Không thể tìm người dùng.')
      setState('error')
    }
  }

  const openChat = (uid: string) => window.dispatchEvent(new CustomEvent('cinemind:open-chat', { detail: { uid } }))
  const relationAction = async () => {
    if (!result || !account.profile || result.uid === account.profile.uid) return
    try {
      if (account.friends[result.uid]) openChat(result.uid)
      else if (account.friendRequests[result.uid]) await account.answerFriend(account.friendRequests[result.uid], true)
      else if (account.sentFriendRequests[result.uid]) await account.cancelFriend(result.uid)
      else await account.requestFriend(result)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Không thể cập nhật lời mời kết bạn.')
      setState('error')
    }
  }

  const relation = result ? account.friends[result.uid] ? 'friend' : account.friendRequests[result.uid] ? 'incoming' : account.sentFriendRequests[result.uid] ? 'outgoing' : result.uid === user?.uid ? 'self' : 'none' : 'none'

  return <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="font-semibold text-white">Tìm bạn mới</h2><p className="mt-1 text-xs text-slate-500">Chỉ tìm khi bạn bấm nút; hệ thống không truy vấn trong lúc gõ.</p></div>
      <div className="flex rounded-xl bg-black/30 p-1">
        <button type="button" onClick={() => switchMode('username')} className={cn('flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs', mode === 'username' ? 'bg-purple-600 text-white' : 'text-slate-400')}><AtSign className="h-3.5 w-3.5" />Username</button>
        <button type="button" onClick={() => switchMode('email')} className={cn('flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs', mode === 'email' ? 'bg-purple-600 text-white' : 'text-slate-400')}><Mail className="h-3.5 w-3.5" />Email</button>
      </div>
    </div>
    <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
      {mode === 'username' ? <Input value={username} onChange={(event) => { setUsername(event.target.value); resetResult() }} maxLength={25} placeholder="Nhập đầy đủ @username" autoComplete="off" /> : customDomain ? <Input value={customEmail} onChange={(event) => { setCustomEmail(event.target.value); resetResult() }} type="email" placeholder="ban@example.com" autoComplete="off" /> : <div className="flex min-w-0 flex-1 overflow-hidden rounded-md border border-input bg-background"><input value={gmailName} onChange={(event) => { setGmailName(event.target.value.replace(/[@\s]/g, '')); resetResult() }} className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none" placeholder="tenemail" autoComplete="off" /><span className="flex items-center border-l border-white/10 bg-white/5 px-3 text-sm text-slate-400">@gmail.com</span></div>}
      {mode === 'email' && <Button type="button" variant="ghost" onClick={() => { setCustomDomain((value) => !value); resetResult() }} className="shrink-0 text-xs">{customDomain ? 'Dùng Gmail' : 'Email khác'}</Button>}
      <Button type="submit" disabled={!valid || state === 'loading'} className="shrink-0">{state === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Tìm</Button>
    </form>
    {state === 'empty' && <p className="mt-4 rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-400">Không tìm thấy tài khoản phù hợp.</p>}
    {state === 'error' && <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
    {state === 'found' && result && <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <AccountAvatar name={result.displayName} src={result.avatar} className="h-12 w-12 text-xs" />
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{result.displayName}</p><Link href={`/u/${result.username}`} className="text-xs text-purple-300 hover:underline">@{result.username} · Xem hồ sơ</Link></div>
      {relation !== 'self' && <Button size="sm" variant={relation === 'outgoing' ? 'outline' : 'default'} onClick={() => void relationAction()}>{relation === 'friend' ? <MessageCircle className="h-4 w-4" /> : relation === 'incoming' ? <Check className="h-4 w-4" /> : relation === 'outgoing' ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}{relation === 'friend' ? 'Nhắn tin' : relation === 'incoming' ? 'Chấp nhận' : relation === 'outgoing' ? 'Hủy lời mời' : 'Kết bạn'}</Button>}
      {relation === 'self' && <span className="text-xs text-slate-500">Đây là bạn</span>}
    </div>}
  </section>
}
