import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CheckoutPage } from '@/components/pages/CheckoutPage'

export const metadata: Metadata = { title: 'Thanh toán | CineMind' }
export default function Page() { return <Suspense fallback={<div className="min-h-screen bg-bg" />}><CheckoutPage /></Suspense> }
