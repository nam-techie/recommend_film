'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { ChevronDown, Clapperboard, Crown, Mic2 } from 'lucide-react'

const destinations = [
  { href: '/watch-party', label: 'Phòng chiếu', description: 'Xem phim cùng bạn bè', icon: Clapperboard },
  { href: '/karaoke', label: 'Karaoke', description: 'Chọn bài và hát cùng nhau', icon: Mic2 },
]

export function VipLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return <>{destinations.map(({ href, label, description, icon: Icon }) => {
    const active = pathname === href || pathname.startsWith(`${href}/`)
    return <Link key={href} href={href} onClick={onNavigate} aria-current={active ? 'page' : undefined} className={`flex min-h-16 items-center gap-3 rounded-xl px-3 py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${active ? 'bg-accent/10 text-accent-soft' : 'text-fg-secondary hover:bg-surface-2 hover:text-fg'}`}>
      <Icon className="h-5 w-5 shrink-0 text-accent-soft" aria-hidden="true" /><span><span className="block text-sm font-semibold">{label}</span><span className="mt-0.5 block text-xs font-normal text-fg-muted">{description}</span></span>
    </Link>
  })}</>
}

export function VipDropdown({ open, onToggle, onClose, pathname }: { open: boolean; onToggle: () => void; onClose: () => void; pathname: string }) {
  const trigger = useRef<HTMLButtonElement>(null)
  const active = destinations.some(({ href }) => pathname === href || pathname.startsWith(`${href}/`))
  return <div className="relative" onKeyDown={event => { if (event.key === 'Escape') { onClose(); trigger.current?.focus() } }}>
    <button ref={trigger} type="button" aria-expanded={open} aria-controls="vip-navigation" onClick={onToggle} className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold transition-colors ${open || active ? 'bg-accent/10 text-accent-soft' : 'text-fg-secondary hover:bg-white/[0.06] hover:text-fg'}`}><Crown className="h-4 w-4 text-accent-soft" aria-hidden="true" />VIP<ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 motion-safe:transition-transform ${open ? 'rotate-180' : ''}`} /></button>
    {open && <div id="vip-navigation" className="absolute right-0 top-[calc(100%+10px)] z-[70] w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-surface-1 p-2 shadow-[0_24px_70px_rgba(0,0,0,.55)]"><VipLinks pathname={pathname} onNavigate={onClose} /></div>}
  </div>
}
