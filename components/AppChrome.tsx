'use client'

import { ReactNode, Suspense, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import type { Country, Genre } from '@/lib/api'
import { GlobalFloatingActions } from '@/components/GlobalFloatingActions'

export function AppChrome({ children, genres, countries }: { children: ReactNode; genres: Genre[]; countries: Country[] }) {
  const pathname = usePathname()
  const [immersive, setImmersive] = useState(false)
  useEffect(() => { const listener = (event: Event) => setImmersive(Boolean((event as CustomEvent<boolean>).detail)); window.addEventListener('cinemind:immersive-change', listener); return () => window.removeEventListener('cinemind:immersive-change', listener) }, [])
  const isRoom = /^\/watch-party\/[^/]+/.test(pathname)
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/')
  if (isRoom || isAdmin) return <main className="min-h-screen">{children}</main>
  return (
    <>
      <a
        href="#main"
        className="sr-only rounded-md bg-accent px-4 py-2 font-semibold text-accent-fg focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100]"
      >
        Bỏ qua điều hướng, tới nội dung chính
      </a>
      <div inert={immersive ? true : undefined} aria-hidden={immersive || undefined}><Suspense fallback={null}><Navbar genres={genres} countries={countries} /></Suspense></div>
      <main id="main" className="min-w-0 w-full flex-1 overflow-visible pb-10">{children}</main>
      <Footer />
      <GlobalFloatingActions />
    </>
  )
}
