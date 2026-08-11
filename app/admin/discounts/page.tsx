import type { Metadata } from 'next'
import { DiscountAdminPage } from '@/components/admin/DiscountAdminPage'

export const metadata: Metadata = { title: 'Mã giảm giá | CineMind Admin', robots: { index: false, follow: false } }

export default function Page() { return <DiscountAdminPage /> }
