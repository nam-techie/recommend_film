import type { Metadata } from 'next'
import { ContentAdminPage } from '@/components/admin/ContentAdminPage'

export const metadata: Metadata = { title: 'Phim & biên tập | CineMind Admin', robots: { index: false, follow: false } }
export default function Page() { return <ContentAdminPage /> }
