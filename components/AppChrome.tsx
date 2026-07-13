'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isRoom = /^\/watch-party\/[^/]+/.test(pathname)
  if (isRoom) return <main className="min-h-screen">{children}</main>
  return <><Navbar /><main className="flex-1 overflow-visible pb-10">{children}</main><Footer /></>
}
