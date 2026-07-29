import { Suspense } from 'react'
import { AccountPage } from '@/components/account/AccountPage'

export default function Page() {
  return <Suspense fallback={<main className="min-h-[70vh] bg-[#070912]" />}><AccountPage /></Suspense>
}
