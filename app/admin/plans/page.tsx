import type { Metadata } from 'next'
import { PlansAdminPage } from '@/components/admin/PlansAdminPage'

export const metadata: Metadata = { title: 'Gói & giá | CineMind Admin', robots: { index: false, follow: false } }
export default function Page() { return <PlansAdminPage /> }
