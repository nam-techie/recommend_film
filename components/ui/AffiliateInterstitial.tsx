'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, ShieldCheck, ShoppingBag } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import type { AffiliateCreative } from '@/lib/affiliate'

export function AffiliateInterstitial({ creative, onContinue }: { creative: AffiliateCreative; onContinue: () => void }) {
  const { user } = useAuth()
  const [remainingMs, setRemainingMs] = useState<number>(creative.durationMs)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastTickRef = useRef(Date.now())
  const impressionSentRef = useRef(false)
  const finished = remainingMs <= 0

  useEffect(() => {
    setRemainingMs(creative.durationMs)
    impressionSentRef.current = false
  }, [creative.assignmentId, creative.durationMs])

  useEffect(() => {
    lastTickRef.current = Date.now()
    const tick = () => {
      const now = Date.now()
      const elapsed = Math.max(0, now - lastTickRef.current)
      if (document.visibilityState === 'visible') setRemainingMs((value) => Math.max(0, value - elapsed))
      lastTickRef.current = now
    }
    const timer = window.setInterval(tick, 100)
    const onVisibility = () => { lastTickRef.current = Date.now() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisibility) }
  }, [creative.assignmentId])

  useEffect(() => {
    if (!user) return
    let sufficientlyVisible = typeof IntersectionObserver === 'undefined'
    const sendWhenVisible = () => {
      if (impressionSentRef.current || document.visibilityState !== 'visible' || !sufficientlyVisible) return
      impressionSentRef.current = true
      void user.getIdToken().then((token) => fetch('/api/me/affiliate-impressions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ assignmentId: creative.assignmentId }), keepalive: true,
      })).catch(() => undefined)
    }
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((entries) => {
      sufficientlyVisible = Boolean(entries[0]?.isIntersecting && entries[0].intersectionRatio >= 0.5)
      sendWhenVisible()
    }, { threshold: [0.5] })
    if (containerRef.current) observer?.observe(containerRef.current)
    sendWhenVisible()
    document.addEventListener('visibilitychange', sendWhenVisible)
    return () => { observer?.disconnect(); document.removeEventListener('visibilitychange', sendWhenVisible) }
  }, [creative.assignmentId, user])

  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    const first = root.querySelector<HTMLElement>('a,button')
    first?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const focusable = Array.from(root.querySelectorAll<HTMLElement>('a[href],button:not([disabled])'))
      if (!focusable.length) return
      const firstItem = focusable[0]; const lastItem = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus() }
      else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus() }
    }
    root.addEventListener('keydown', onKeyDown)
    return () => root.removeEventListener('keydown', onKeyDown)
  }, [finished])

  const seconds = Math.ceil(remainingMs / 1000)
  return <section ref={containerRef} role="dialog" aria-modal="true" aria-labelledby="affiliate-title" aria-describedby="affiliate-description" className="relative flex aspect-video min-h-[340px] w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(238,77,45,.22),transparent_55%),linear-gradient(145deg,#15101a,#070912)] p-6 text-center">
    <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-black/35 p-6 shadow-2xl backdrop-blur-md sm:p-9">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ee4d2d]/20 text-[#ff8068]"><ShoppingBag className="h-7 w-7" /></span>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#ff8068]">Nội dung tài trợ</p>
      <h2 id="affiliate-title" className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">{creative.productTitle}</h2>
      <p id="affiliate-description" className="mt-3 text-sm leading-6 text-slate-300">{creative.disclosure}</p>
      <a href={creative.redirectPath} target="_blank" rel="noopener noreferrer sponsored" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#ee4d2d] px-6 text-sm font-bold text-white transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#ff8068] focus:ring-offset-2 focus:ring-offset-black"><ExternalLink className="h-4 w-4" />{creative.ctaLabel}</a>
      <div className="mt-5 min-h-12" aria-live="polite">{finished ? <Button type="button" onClick={onContinue} autoFocus className="h-12 rounded-full px-7"><ShieldCheck className="h-5 w-5" />Tiếp tục xem</Button> : <p className="pt-3 text-sm font-semibold text-slate-200">Có thể tiếp tục sau <span className="tabular-nums text-white">{seconds}</span> giây</p>}</div>
      <p className="mt-4 text-xs text-slate-400">CTA không rút ngắn thời gian chờ. <Link href="/pricing" className="text-accent-soft underline underline-offset-2">Plus ít nội dung tài trợ hơn, Ultra không có nội dung tài trợ.</Link></p>
    </div>
  </section>
}
