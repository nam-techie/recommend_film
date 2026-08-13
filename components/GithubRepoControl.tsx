'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ExternalLink, Star } from 'lucide-react'
import { FaGithub } from 'react-icons/fa'

export const CINEMIND_REPOSITORY_URL = 'https://github.com/nam-techie/recommend_film'

export function GithubRepoControl({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  const [open, setOpen] = useState(false)
  const [buttonFailed, setButtonFailed] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const close = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape' && open) { setOpen(false); triggerRef.current?.focus() } }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', keydown)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', keydown) }
  }, [open])

  return <div ref={rootRef} className={`relative ${className}`} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocusCapture={() => setOpen(true)}>
    <button ref={triggerRef} type="button" aria-haspopup="menu" aria-expanded={open} aria-label="GitHub CineMind" onClick={() => setOpen((value) => !value)} className={`flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.045] font-semibold text-fg-secondary transition hover:border-white/20 hover:bg-white/[0.08] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${compact ? 'h-11 w-11 px-0' : 'h-11 w-11 px-0 xl:w-auto xl:px-3'}`}>
      <FaGithub className="h-5 w-5" /><span className={compact ? 'sr-only' : 'hidden 2xl:inline'}>GitHub</span>{!compact && <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />}
    </button>
    {open && <div role="menu" aria-label="Repository CineMind" className="absolute right-0 top-[calc(100%+8px)] z-[75] w-[280px] rounded-2xl border border-white/10 bg-[#10131f]/[.98] p-2 shadow-[0_24px_70px_rgba(0,0,0,.6)] backdrop-blur-xl">
      <div role="menuitem" className="rounded-xl border border-accent/20 bg-accent/[0.07] p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg"><Star className="h-4 w-4 text-rating" />Star trên GitHub</div>
        {!buttonFailed ? <iframe onError={() => setButtonFailed(true)} title="Star nam-techie/recommend_film trên GitHub" src="https://ghbtns.com/github-btn.html?user=nam-techie&repo=recommend_film&type=star&count=true&size=large" width="170" height="30" scrolling="no" frameBorder="0" className="block max-w-full" /> : <a href={CINEMIND_REPOSITORY_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-3 text-sm font-bold text-black"><Star className="h-4 w-4" />Mở GitHub để Star</a>}
      </div>
      <a role="menuitem" href={CINEMIND_REPOSITORY_URL} target="_blank" rel="noopener noreferrer" className="mt-2 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-fg-secondary transition hover:bg-white/[0.06] hover:text-fg"><FaGithub className="h-5 w-5" /><span className="flex-1">Xem repository</span><ExternalLink className="h-4 w-4" /></a>
      <p className="px-3 pb-1 pt-2 text-[12px] leading-5 text-fg-muted">Nút này chỉ mở GitHub. Xác minh nhận Plus được xử lý riêng trong Tài khoản.</p>
    </div>}
  </div>
}
