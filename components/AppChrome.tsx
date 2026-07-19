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
  return <><Navbar genres={genres} countries={countries} /><main className="min-w-0 w-full flex-1 overflow-visible pb-10">{children}</main><Footer /></>
}
