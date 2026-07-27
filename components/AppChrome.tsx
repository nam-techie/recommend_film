'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import type { Country, Genre } from '@/lib/api'

export function AppChrome({ children, genres, countries }: { children: ReactNode; genres: Genre[]; countries: Country[] }) {
  const pathname = usePathname()
  const isRoom = /^\/watch-party\/[^/]+/.test(pathname)
  if (isRoom) return <main className="min-h-screen">{children}</main>
  return (
    <>
      <a
        href="#main"
        className="sr-only rounded-md bg-accent px-4 py-2 font-semibold text-accent-fg focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100]"
      >
        Bỏ qua điều hướng, tới nội dung chính
      </a>
      <Navbar genres={genres} countries={countries} />
      <main id="main" className="min-w-0 w-full flex-1 overflow-visible pb-10">{children}</main>
      <Footer />
    </>
  )
}
