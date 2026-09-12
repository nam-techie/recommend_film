'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, Star } from 'lucide-react'
import { FaGithub } from 'react-icons/fa'

export const CINEMIND_REPOSITORY_URL = 'https://github.com/nam-techie/recommend_film'

export function GithubRepoControl({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  const [open, setOpen] = useState(false)
  const [stars, setStars] = useState<number | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout>>()
  const menuId = useId()
  const pathname = usePathname()
  const cancelClose = () => clearTimeout(closeTimer.current)
  const close = () => { cancelClose(); setOpen(false) }
  const focusItem = (index: number) => requestAnimationFrame(() => {
    const items = rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')
    items?.[(index + items.length) % items.length]?.focus()
  })

  useEffect(() => {
    if (compact) return
    const controller = new AbortController()
    void fetch('/api/github/repository', { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => { if (Number.isSafeInteger(data?.stars) && data.stars >= 0) setStars(data.stars) })
      .catch(() => undefined)
    return () => controller.abort()
  }, [compact])
  const starLabel = stars === null ? 'GitHub' : new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(stars).toLowerCase()

  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }
    const fullscreen = () => setOpen(false)
    document.addEventListener('pointerdown', outside)
    document.addEventListener('fullscreenchange', fullscreen)
    return () => { clearTimeout(closeTimer.current); document.removeEventListener('pointerdown', outside); document.removeEventListener('fullscreenchange', fullscreen) }
  }, [])

  return <div ref={rootRef} className={`relative ${className}`}
    onPointerEnter={(event) => { if (event.pointerType === 'mouse') { cancelClose(); setOpen(true) } }}
    onPointerLeave={(event) => { if (event.pointerType === 'mouse') closeTimer.current = setTimeout(() => { if (!rootRef.current?.contains(document.activeElement)) setOpen(false) }, 150) }}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) close() }}
    onKeyDown={(event) => {
      if (event.key === 'Escape' && open) { event.preventDefault(); close(); triggerRef.current?.focus() }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); cancelClose(); setOpen(true)
        const items = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') || [])
        const index = items.indexOf(document.activeElement as HTMLElement)
        focusItem(event.key === 'Home' ? 0 : event.key === 'End' ? 1 : event.key === 'ArrowDown' ? index + 1 : index < 0 ? 1 : index - 1)
      }
    }}>
    <button ref={triggerRef} type="button" aria-haspopup="menu" aria-controls={open ? menuId : undefined} aria-expanded={open} aria-label={stars === null ? 'GitHub CineMind' : `GitHub CineMind · ${stars.toLocaleString('vi-VN')} sao`}
      onClick={() => { cancelClose(); setOpen((value) => !value) }}
      className={`group relative flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.03] text-fg-secondary transition-colors duration-200 before:absolute before:-inset-y-1.5 before:inset-x-0 hover:border-amber-300/35 hover:bg-amber-300/[0.06] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0b10] ${compact ? 'w-8' : 'px-2.5'}`}>
      <FaGithub aria-hidden className="h-4 w-4 shrink-0" />
      {!compact && <><span className="text-[13px] font-medium leading-none tabular-nums">{starLabel}</span><Star aria-hidden className="h-3.5 w-3.5 shrink-0 fill-amber-300 text-amber-300" strokeWidth={1.5} /></>}
    </button>
    {open && <div className="absolute right-0 top-full z-[75] w-[min(216px,calc(100vw-24px))] pt-2">
      <div id={menuId} role="menu" aria-label="Repository CineMind" className="rounded-xl border border-white/10 bg-[#10121b] p-1.5 text-fg">
        <form action="/api/github/star/start" method="POST" target="_blank" rel="noopener noreferrer" onSubmit={() => setTimeout(close, 0)}>
          <button type="submit" role="menuitem" className="group flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-white/[0.06] focus:bg-white/[0.06] focus:outline-none">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center text-amber-300"><Star aria-hidden className="h-[18px] w-[18px] fill-current" /></span>
            <span className="flex-1"><span className="block text-sm font-medium text-fg">Star trên GitHub</span></span>
            <ArrowUpRight aria-hidden className="h-4 w-4 text-fg-muted" />
          </button>
        </form>
        <div className="mx-3 my-1 h-px bg-white/[0.07]" />
        <a role="menuitem" href={CINEMIND_REPOSITORY_URL} target="_blank" rel="noopener noreferrer" onClick={close} className="flex min-h-12 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-fg-secondary transition-colors hover:bg-white/[0.06] hover:text-fg focus:bg-white/[0.06] focus:outline-none"><span className="flex h-7 w-7 items-center justify-center"><FaGithub aria-hidden className="h-[18px] w-[18px]" /></span><span className="flex-1">Xem repository</span><ArrowUpRight aria-hidden className="h-4 w-4 text-fg-muted" /></a>
      </div>
    </div>}
  </div>
}
