import type { Metadata } from 'next'
import { AnalyticsAdminPage } from '@/components/admin/AnalyticsAdminPage'

export const metadata: Metadata = { title: 'Phân tích nội dung | CineMind Admin', robots: { index: false, follow: false } }
export default function Page() { return <AnalyticsAdminPage /> }
