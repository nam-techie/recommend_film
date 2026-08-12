import type { Metadata } from 'next'
import { CommunityAdminPage } from '@/components/admin/CommunityAdminPage'

export const metadata: Metadata = { title: 'Kiểm duyệt cộng đồng | CineMind Admin', robots: { index: false, follow: false } }
export default function Page() { return <CommunityAdminPage /> }
