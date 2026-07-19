'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { User } from 'firebase/auth'
import { Bell, Bookmark, History, LogOut, Settings, UserRound } from 'lucide-react'
import { AccountAvatar } from '@/components/account/AccountAvatar'
import { Button } from '@/components/ui/button'
import { useAccount } from '@/hooks/useAccount'

export default function AccountControls({ user, logout }: { user: User; logout: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const account = useAccount()

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  const name = account.profile?.displayName || user.displayName || user.email || 'Tài khoản'
  return (
    <div ref={menuRef} className="relative">
      <Button variant="outline" size="sm" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="h-10 gap-2 rounded-full border-white/10 bg-white/[0.035] px-2 text-white hover:bg-white/[0.07] sm:px-3">
        <AccountAvatar name={name} src={account.profile?.avatar || user.photoURL} className="h-7 w-7 text-[9px]" />
        <span className="hidden max-w-24 truncate 2xl:inline">{name}</span>
        {account.unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-fuchsia-500 px-1 text-[10px] font-bold text-white">{Math.min(99, account.unreadCount)}</span>}
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+0.6rem)] z-50 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#101522] p-2 text-white shadow-2xl">
          <div className="flex items-center gap-3 border-b border-white/10 px-2 pb-3 pt-1">
            <AccountAvatar name={name} src={account.profile?.avatar || user.photoURL} className="h-10 w-10 text-xs" />
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{name}</p><p className="truncate text-xs text-slate-500">{account.profile ? `@${account.profile.username}` : user.email}</p></div>
          </div>
          <div className="py-2">
            {[
              { href: account.profile && !account.degraded ? `/u/${account.profile.username}` : '/account', label: 'Xem hồ sơ', icon: UserRound },
              { href: '/account', label: 'Tài khoản', icon: Settings },
              { href: '/history', label: 'Lịch sử xem', icon: History },
              { href: '/account', label: 'Danh sách phim', icon: Bookmark },
            ].map((item) => <Link key={`${item.href}:${item.label}`} href={item.href} role="menuitem" className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm text-slate-300 hover:bg-white/[0.06] hover:text-white"><item.icon className="h-4 w-4" />{item.label}</Link>)}
          </div>
          <Link href="/account" className="flex min-h-10 items-center gap-3 rounded-xl border-t border-white/10 px-3 pt-2 text-sm text-slate-300 hover:text-white"><Bell className="h-4 w-4" />Thông báo{account.unreadCount > 0 && <span className="ml-auto rounded-full bg-purple-500 px-2 py-0.5 text-[10px] font-bold">{account.unreadCount}</span>}</Link>
          <button type="button" role="menuitem" onClick={() => void logout()} className="mt-1 flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm text-red-300 hover:bg-red-500/10"><LogOut className="h-4 w-4" />Đăng xuất</button>
        </div>
      )}
    </div>
  )
}
