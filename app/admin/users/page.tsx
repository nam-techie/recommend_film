import type { Metadata } from 'next'
import { UsersAdminPage } from '@/components/admin/UsersAdminPage'

export const metadata: Metadata = { title: 'Người dùng | CineMind Admin', robots: { index: false, follow: false } }
export default function Page() { return <UsersAdminPage /> }
