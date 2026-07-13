'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LogIn } from 'lucide-react'
import { AuthDialog } from '@/components/auth/AuthDialog'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'

const safeReturnUrl = (value: string | null) => value && value.startsWith('/') && !value.startsWith('//') ? value : '/'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const returnUrl = safeReturnUrl(searchParams.get('returnUrl'))
  useEffect(() => { if (!loading && user) router.replace(returnUrl) }, [loading, returnUrl, router, user])
  if (loading || user) return <main className="flex min-h-[70vh] items-center justify-center text-white"><div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" /></main>
  return <main className="flex min-h-[70vh] items-center justify-center px-4 text-white"><div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0e1a] p-8 text-center"><LogIn className="mx-auto mb-4 h-10 w-10 text-purple-400" /><h1 className="text-2xl font-bold">Đăng nhập để tiếp tục</h1><p className="mt-2 text-sm text-gray-400">Bạn cần đăng nhập để tham gia phòng xem chung. Đăng nhập xong sẽ tự quay lại đúng phòng.</p><AuthDialog defaultOpen onAuthenticated={() => router.replace(returnUrl)}><Button className="mt-6 w-full">Mở đăng nhập</Button></AuthDialog></div></main>
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="flex min-h-[70vh] items-center justify-center text-white"><div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" /></main>}>
      <LoginContent />
    </Suspense>
  )
}
