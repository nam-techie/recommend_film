'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, UserPlus, X } from 'lucide-react'
import { AccountAvatar } from '@/components/account/AccountAvatar'
import { FriendSearchPanel } from '@/components/account/FriendSearchPanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAccount } from '@/hooks/useAccount'

export function WatchPartyFriendInviteDialog({
  open,
  roomId,
  movieSlug,
  onClose,
}: {
  open: boolean
  roomId: string
  movieSlug: string
  onClose: () => void
}) {
  const account = useAccount()
  const [query, setQuery] = useState('')
  const [showFindNew, setShowFindNew] = useState(false)
  const [sendingUid, setSendingUid] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const normalizedQuery = query.trim().replace(/^@/, '').toLocaleLowerCase('vi')
  const friends = useMemo(() => Object.values(account.friends)
    .filter((friend) => !normalizedQuery
      || friend.displayName.toLocaleLowerCase('vi').includes(normalizedQuery)
      || friend.username.toLocaleLowerCase('vi').includes(normalizedQuery))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'vi')), [account.friends, normalizedQuery])

  if (!open) return null

  const invite = async (friend: (typeof friends)[number]) => {
    setSendingUid(friend.uid)
    setNotice('')
    try {
      await account.inviteFriend(friend, roomId, movieSlug)
      setNotice(`Đã mời ${friend.displayName} vào phòng.`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Không gửi được lời mời.')
    } finally {
      setSendingUid(null)
    }
  }

  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 px-3 py-5 backdrop-blur-lg" role="dialog" aria-modal="true" aria-labelledby="invite-friends-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="flex max-h-[calc(100dvh-2.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111522] shadow-2xl">
      <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div><h2 id="invite-friends-title" className="text-lg font-semibold">Mời bạn bè xem chung</h2><p className="mt-1 text-sm text-slate-400">Tìm trong danh sách bạn bè hoặc kết bạn ngay tại đây. Phòng: {roomId}.</p></div>
        <Button size="icon" variant="ghost" aria-label="Đóng" onClick={onClose} className="shrink-0"><X className="h-4 w-4" /></Button>
      </div>

      <div className="overflow-y-auto p-4 sm:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm bạn theo tên hoặc @username" className="pl-10" autoFocus />
        </div>

        <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
          {friends.length ? friends.map((friend) => <div key={friend.uid} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-3">
            <AccountAvatar name={friend.displayName} src={friend.avatar} className="h-10 w-10 text-xs" />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{friend.displayName}</p><Link href={`/u/${friend.username}`} className="text-xs text-purple-300 hover:underline">@{friend.username} · Xem hồ sơ</Link></div>
            <Button size="sm" disabled={sendingUid === friend.uid} onClick={() => void invite(friend)}>{sendingUid === friend.uid ? 'Đang gửi…' : 'Mời'}</Button>
          </div>) : <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-400">
            {Object.keys(account.friends).length ? 'Không tìm thấy người bạn này.' : 'Bạn chưa có bạn bè để mời.'}
          </div>}
        </div>

        {notice && <p role="status" className="mt-3 rounded-xl bg-purple-500/10 px-3 py-2 text-xs text-purple-200">{notice}</p>}

        <div className="my-4 flex items-center gap-3 text-xs text-slate-600"><span className="h-px flex-1 bg-white/10" />Chưa có trong danh sách?<span className="h-px flex-1 bg-white/10" /></div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setShowFindNew((value) => !value)}><UserPlus className="h-4 w-4" />{showFindNew ? 'Ẩn tìm bạn mới' : 'Tìm và kết bạn ngay'}</Button>
          <Button asChild type="button" variant="ghost"><Link href="/account">Mở trang Bạn bè</Link></Button>
        </div>
        {showFindNew && <div className="mt-4"><FriendSearchPanel /></div>}
      </div>
    </div>
  </div>
}
