'use client'

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { AuthPanel } from '@/components/auth/AuthPanel'

export default function RegisterPage() {
  const router = useRouter()
  return <Suspense fallback={<main className="min-h-screen bg-[#070912]" />}><main className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden bg-[#070912] px-4 py-10"><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.16),transparent_34%)]" /><div className="relative w-full max-w-md"><AuthPanel initialMode="register" onAuthenticated={() => router.replace('/account')} /></div></main></Suspense>
}
