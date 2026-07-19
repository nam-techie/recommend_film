'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { ChevronDown, Film, Menu, Search, Sparkles, Tv, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SearchAutocomplete } from '@/components/search/SearchAutocomplete'
import { useAuth } from '@/components/auth/AuthProvider'
import { AuthDialog } from '@/components/auth/AuthDialog'
import type { Country, Genre } from '@/lib/api'

const AccountControls = dynamic(() => import('@/components/account/AccountControls'), { ssr: false })
type DropdownName = 'genres' | 'countries' | null

export default function Navbar({ genres, countries }: { genres: Genre[]; countries: Country[] }) {
  const pathname = usePathname()
  const dropdownAreaRef = useRef<HTMLDivElement>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<DropdownName>(null)
  const { user, loading: authLoading, logout } = useAuth()
  const isHome = pathname === '/'
  const initialSearch = ''

  useEffect(() => {
    setMobileMenuOpen(false)
    setMobileSearchOpen(false)
    setOpenDropdown(null)
  }, [pathname])

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!dropdownAreaRef.current?.contains(event.target as Node)) setOpenDropdown(null)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
        setMobileSearchOpen(false)
        setOpenDropdown(null)
      }
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  return (
    <header className={`sticky top-0 z-50 w-full border-b border-white/[0.07] ${isHome ? 'bg-[#080911]/85' : 'bg-[#080911]/95'} backdrop-blur-xl`}>
      <div className="relative mx-auto flex h-16 max-w-[1800px] items-center gap-3 px-3 sm:px-5 lg:h-[72px] lg:px-7">
        <button type="button" className="touch-target -ml-2 flex items-center justify-center text-slate-200 lg:hidden" aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((value) => !value)}>{mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</button>

        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="CineMind - Trang chủ"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-600 to-purple-600 shadow-lg shadow-fuchsia-950/40"><Film className="h-5 w-5 text-white" /></span><span className="hidden text-xl font-black tracking-tight text-white sm:block">Cine<span className="text-fuchsia-400">Mind</span></span></Link>

        <div className="ml-2 hidden shrink-0 xl:block"><SearchAutocomplete variant="header" initialValue={initialSearch} /></div>

        <nav ref={dropdownAreaRef} className="ml-2 hidden min-w-0 items-center gap-0.5 lg:flex" aria-label="Điều hướng chính">
          <NavLink href="/search?type=phim-le">Phim lẻ</NavLink>
          <NavLink href="/tv-series">Phim bộ</NavLink>
          <NavLink href="/search?type=tv-shows">TV Shows</NavLink>
          <MenuDropdown label="Thể loại" open={openDropdown === 'genres'} onToggle={() => setOpenDropdown((value) => value === 'genres' ? null : 'genres')} items={genres} base="/genre" allHref="/genres" columns="grid-cols-4" />
          <MenuDropdown label="Quốc gia" open={openDropdown === 'countries'} onToggle={() => setOpenDropdown((value) => value === 'countries' ? null : 'countries')} items={countries} base="/country" allHref="/countries" align="right" columns="grid-cols-4" />
        </nav>

        <button type="button" className="mobile-search-trigger touch-target items-center justify-center text-slate-200" aria-label="Tìm kiếm" aria-expanded={mobileSearchOpen} onClick={() => setMobileSearchOpen((value) => !value)}><Search className="h-5 w-5" /></button>

        <div className="ml-auto hidden items-center gap-1 sm:gap-2 xl:flex">
          <Link href="/ai-recommender" className="hidden min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-fuchsia-200 hover:bg-fuchsia-500/10 xl:flex"><Sparkles className="h-4 w-4" /> Gợi ý AI</Link>
          <Link href="/watch-party" className="hidden min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-slate-300 hover:bg-white/[0.06] 2xl:flex"><Users className="h-4 w-4" /> Xem chung</Link>
          {!authLoading && (user ? <AccountControls user={user} logout={logout} /> : <AuthDialog><Button size="sm" className="h-10 rounded-full bg-white px-4 text-slate-950 hover:bg-slate-200">Thành viên</Button></AuthDialog>)}
        </div>
      </div>

      {mobileSearchOpen && <div className="border-t border-white/[0.06] px-4 py-3 xl:hidden"><div className="mx-auto max-w-xl"><SearchAutocomplete variant="mobile" initialValue={initialSearch} autoFocus /></div></div>}

      {mobileMenuOpen && <nav className="border-t border-white/[0.07] bg-[#0b0d17] px-4 py-4 lg:hidden" aria-label="Menu di động"><div className="grid grid-cols-2 gap-2"><MobileLink href="/search?type=phim-le" icon={Film}>Phim lẻ</MobileLink><MobileLink href="/tv-series" icon={Tv}>Phim bộ</MobileLink><MobileLink href="/genres" icon={Sparkles}>Thể loại</MobileLink><MobileLink href="/countries" icon={Film}>Quốc gia</MobileLink><MobileLink href="/ai-recommender" icon={Sparkles}>Gợi ý AI</MobileLink><MobileLink href="/watch-party" icon={Users}>Xem chung</MobileLink></div></nav>}
    </header>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="flex min-h-10 items-center rounded-xl px-3 text-[13px] font-semibold text-slate-200 hover:bg-white/[0.06] hover:text-white">{children}</Link>
}

function MenuDropdown({ label, open, onToggle, items, base, allHref, align = 'left', columns }: { label: string; open: boolean; onToggle: () => void; items: Array<Genre | Country>; base: string; allHref: string; align?: 'left' | 'right'; columns: string }) {
  return <div className="relative"><button type="button" onClick={onToggle} className={`flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold ${open ? 'bg-white/[0.08] text-white' : 'text-slate-200 hover:bg-white/[0.06]'}`} aria-haspopup="menu" aria-expanded={open}>{label}<ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} /></button>{open && <div role="menu" className={`absolute top-[calc(100%+10px)] z-[70] w-[620px] overflow-hidden rounded-2xl border border-white/10 bg-[#10131f]/[.98] shadow-[0_24px_70px_rgba(0,0,0,.55)] backdrop-blur-xl ${align === 'right' ? 'right-0' : 'left-0'}`}><div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3"><span className="text-sm font-bold text-white">Khám phá theo {label.toLowerCase()}</span><Link href={allHref} className="text-xs font-semibold text-fuchsia-300 hover:text-fuchsia-200">Xem tất cả</Link></div><div className={`grid ${columns} max-h-[360px] gap-1 overflow-y-auto p-3`}>{items.map((item) => <Link key={item.slug} href={`${base}/${item.slug}`} role="menuitem" className="rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-fuchsia-500/10 hover:text-fuchsia-100">{item.name}</Link>)}</div></div>}</div>
}

function MobileLink({ href, icon: Icon, children }: { href: string; icon: typeof Film; children: React.ReactNode }) {
  return <Link href={href} className="flex min-h-12 items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 text-sm font-medium text-slate-200 hover:bg-white/[0.06]"><Icon className="h-4 w-4 text-fuchsia-300" />{children}</Link>
}
