import type { Metadata } from 'next'
import { AffiliateAdminPage } from '@/components/admin/AffiliateAdminPage'

export const metadata: Metadata = { title: 'Shopee Affiliate | CineMind Admin', robots: { index: false, follow: false } }

export default function Page() { return <AffiliateAdminPage /> }
