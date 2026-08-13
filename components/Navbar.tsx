'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronDown, Film, Menu, MessageSquarePlus, Search, Sparkles, Tv, UserRound, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SearchAutocomplete } from '@/components/search/SearchAutocomplete'
import { useAuth } from '@/components/auth/AuthProvider'
import { AuthDialog } from '@/components/auth/AuthDialog'
import { GithubRepoControl } from '@/components/GithubRepoControl'
import type { Country, Genre } from '@/lib/api'

const AccountControls = dynamic(() => import('@/components/account/AccountControls'), { ssr: false })
const FeedbackLauncher = dynamic(() => import('@/components/feedback/FeedbackLauncher').then((module) => module.FeedbackLauncher), { ssr: false })
type OpenPanel = null | 'nav' | 'search' | 'genres' | 'countries'

export default function Navbar({ genres, countries }: { genres: Genre[]; countries: Country[] }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const headerRef = useRef<HTMLElement>(null)
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null)
  const { user, loading: authLoading, logout } = useAuth()
  const isHome = pathname === '/'
  const initialSearch = pathname === '/search' ? searchParams.get('keyword') || '' : ''
  const preservedQuery = useMemo(() => {
    if (pathname !== '/search') return ''
    const next = new URLSearchParams(searchParams.toString())
    next.delete('keyword'); next.delete('page')
    return next.toString()
  }, [pathname, searchParams])

  useEffect(() => { setOpenPanel(null) }, [pathname, searchParams])
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!headerRef.current?.contains(event.target as Node)) setOpenPanel(null) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpenPanel(null) }
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [])

  const toggle = (panel: Exclude<OpenPanel, null>) => setOpenPanel((current) => current === panel ? null : panel)

  return <header ref={headerRef} className={`sticky top-0 z-50 w-full border-b border-white/[0.07] ${isHome ? 'bg-[#080911]/85' : 'bg-[#080911]/95'} backdrop-blur-xl`}>
    <div className="relative mx-auto flex h-16 max-w-shell items-center gap-2 px-3 sm:px-5 lg:h-[72px] lg:px-7">
      <button type="button" className="touch-target -ml-2 flex items-center justify-center text-fg-secondary lg:hidden" aria-label={openPanel === 'nav' ? 'Đóng menu' : 'Mở menu'} aria-expanded={openPanel === 'nav'} onClick={() => toggle('nav')}>{openPanel === 'nav' ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</button>
      <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="CineMind - Trang chủ"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-strong shadow-lg shadow-accent"><Film className="h-5 w-5 text-fg" /></span><span className="hidden text-xl font-black tracking-tight text-fg sm:block">Cine<span className="text-accent">Mind</span></span></Link>

      <div className="ml-2 hidden min-w-[220px] max-w-[340px] flex-1 xl:block"><SearchAutocomplete variant="header" initialValue={initialSearch} preservedQuery={preservedQuery} /></div>
      <nav className="ml-1 hidden min-w-0 items-center gap-0.5 lg:flex" aria-label="Điều hướng chính">
        <NavLink href="/search?type=phim-le">Phim lẻ</NavLink><NavLink href="/tv-series">Phim bộ</NavLink><NavLink href="/search?type=tv-shows">TV Shows</NavLink>
        <span className="2xl:hidden"><NavLink href="/community"><Users className="mr-1.5 h-4 w-4" />Cộng đồng</NavLink></span>
        <MenuDropdown label="Thể loại" open={openPanel === 'genres'} onToggle={() => toggle('genres')} items={genres} base="/genre" allHref="/genres" />
        <MenuDropdown label="Quốc gia" open={openPanel === 'countries'} onToggle={() => toggle('countries')} items={countries} base="/country" allHref="/countries" align="right" />
      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        <button type="button" className="touch-target flex items-center justify-center text-fg-secondary xl:hidden" aria-label="Tìm kiếm" aria-expanded={openPanel === 'search'} onClick={() => toggle('search')}><Search className="h-5 w-5" /></button>
        <GithubRepoControl compact={false} />
        <Link href="/watch-party" className="hidden min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-fg-secondary hover:bg-white/[0.06] 2xl:flex"><Users className="h-4 w-4" />Xem chung</Link>
        {!authLoading && user && <FeedbackLauncher />}
        {!authLoading && <div className="shrink-0">{user ? <AccountControls user={user} logout={logout} /> : <AuthDialog><Button size="icon" variant="outline" aria-label="Đăng nhập" className="h-11 w-11 rounded-full"><UserRound className="h-5 w-5" /></Button></AuthDialog>}</div>}
      </div>
    </div>

    {openPanel === 'search' && <div className="border-t border-white/[0.06] px-4 py-3 xl:hidden"><div className="mx-auto max-w-xl"><SearchAutocomplete variant="mobile" initialValue={initialSearch} preservedQuery={preservedQuery} autoFocus /></div></div>}
    {openPanel === 'nav' && <nav className="border-t border-white/[0.07] bg-[#0b0d17] px-4 py-4 lg:hidden" aria-label="Menu di động"><div className="grid grid-cols-2 gap-2"><MobileLink href="/search?type=phim-le" icon={Film}>Phim lẻ</MobileLink><MobileLink href="/tv-series" icon={Tv}>Phim bộ</MobileLink><MobileLink href="/genres" icon={Sparkles}>Thể loại</MobileLink><MobileLink href="/countries" icon={Film}>Quốc gia</MobileLink><MobileLink href="/watch-party" icon={Users}>Xem chung</MobileLink><MobileLink href="/community" icon={Users}>Cộng đồng</MobileLink>{user && <button type="button" onClick={() => window.dispatchEvent(new Event('cinemind:open-feedback'))} className="flex min-h-12 items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 text-sm font-medium text-fg-secondary hover:bg-white/[0.06]"><MessageSquarePlus className="h-4 w-4 text-accent-soft" />Góp ý</button>}</div></nav>}
  </header>
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) { return <Link href={href} className="flex min-h-10 items-center rounded-xl px-2.5 text-sm font-semibold text-fg-secondary hover:bg-white/[0.06] hover:text-fg">{children}</Link> }

function MenuDropdown({ label, open, onToggle, items, base, allHref, align = 'left' }: { label: string; open: boolean; onToggle: () => void; items: Array<Genre | Country>; base: string; allHref: string; align?: 'left' | 'right' }) {
  return <div className="relative"><button type="button" onClick={onToggle} className={`flex min-h-10 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold ${open ? 'bg-white/[0.08] text-fg' : 'text-fg-secondary hover:bg-white/[0.06]'}`} aria-haspopup="menu" aria-expanded={open}>{label}<ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} /></button>{open && <div role="menu" className={`absolute top-[calc(100%+10px)] z-[70] w-[min(620px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#10131f]/[.98] shadow-[0_24px_70px_rgba(0,0,0,.55)] backdrop-blur-xl ${align === 'right' ? 'right-0' : 'left-0'}`}><div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3"><span className="text-sm font-bold text-fg">Khám phá theo {label.toLowerCase()}</span><Link href={allHref} className="text-xs font-semibold text-accent-soft">Xem tất cả</Link></div><div className="grid max-h-[360px] grid-cols-2 gap-1 overflow-y-auto p-3 md:grid-cols-4">{items.map((item) => <Link key={item.slug} href={`${base}/${item.slug}`} role="menuitem" className="rounded-xl px-3 py-2.5 text-sm text-fg-secondary hover:bg-accent/10 hover:text-accent-soft">{item.name}</Link>)}</div></div>}</div>
}

function MobileLink({ href, icon: Icon, children }: { href: string; icon: typeof Film; children: React.ReactNode }) { return <Link href={href} className="flex min-h-12 items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 text-sm font-medium text-fg-secondary hover:bg-white/[0.06]"><Icon className="h-4 w-4 text-accent-soft" />{children}</Link> }
