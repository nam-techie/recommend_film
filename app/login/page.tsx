'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthPanel } from '@/components/auth/AuthPanel'
import { useAuth } from '@/components/auth/AuthProvider'

const safeReturnUrl = (value: string | null) => value && value.startsWith('/') && !value.startsWith('//') ? value : '/account'

function LoginContent() {
  const router = useRouter(); const searchParams = useSearchParams(); const { user, loading } = useAuth(); const returnUrl = safeReturnUrl(searchParams.get('returnUrl'))
  useEffect(() => { if (!loading && user) router.replace(returnUrl) }, [loading, returnUrl, router, user])
  if (loading || user) return <main className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-[#070912]"><div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" /></main>
  return <main className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden bg-[#070912] px-4 py-10"><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.16),transparent_34%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.1),transparent_34%)]" /><div className="relative w-full max-w-md"><AuthPanel onAuthenticated={() => router.replace(returnUrl)} /></div></main>
}

export default function LoginPage() { return <Suspense fallback={<main className="min-h-screen bg-[#070912]" />}><LoginContent /></Suspense> }
