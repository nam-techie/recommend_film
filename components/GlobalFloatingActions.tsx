'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ArrowUp, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function GlobalFloatingActions() {
  const pathname = usePathname()
  const [showTop, setShowTop] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const isRoom = /^\/watch-party\/[^/]+/.test(pathname)
  const hidden = pathname.startsWith('/admin') || pathname === '/ai-recommender' || isRoom || fullscreen

  useEffect(() => {
    const scroll = () => setShowTop(window.scrollY > 500)
    const screen = () => setFullscreen(Boolean(document.fullscreenElement) || document.documentElement.dataset.cinemindImmersive === 'true')
    scroll(); screen()
    window.addEventListener('scroll', scroll, { passive: true })
    document.addEventListener('fullscreenchange', screen)
    window.addEventListener('cinemind:immersive-change', screen)
    return () => { window.removeEventListener('scroll', scroll); document.removeEventListener('fullscreenchange', screen); window.removeEventListener('cinemind:immersive-change', screen) }
  }, [])

  if (hidden) return null
  return <div aria-label="Thao tác nhanh" className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-40 flex flex-col items-end gap-3" data-feedback-exclude>
    {showTop && <Button size="icon" variant="outline" aria-label="Lên đầu trang" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="h-11 w-11 rounded-full border-white/15 bg-[#10131f]/90 shadow-xl backdrop-blur"><ArrowUp className="h-4 w-4" /></Button>}
    <Link href="/ai-recommender" aria-label="Mở Gợi ý AI" className="group flex h-[52px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent-strong px-[17px] font-bold text-fg shadow-[0_14px_38px_rgba(192,38,211,.35)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft sm:px-4"><Sparkles className="h-5 w-5 shrink-0" /><span className="hidden max-w-0 overflow-hidden whitespace-nowrap text-sm opacity-0 transition-all duration-200 group-hover:max-w-28 group-hover:opacity-100 group-focus-visible:max-w-28 group-focus-visible:opacity-100 lg:inline">Gợi ý AI</span></Link>
  </div>
}
