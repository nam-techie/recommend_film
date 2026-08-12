import type { Metadata } from 'next'
import { CommunityPage } from '@/components/pages/CommunityPage'

export const metadata: Metadata = { title: 'Cộng đồng phim | CineMind', description: 'Review, hoạt động và những người có cùng gu phim.' }
export default function Page() { return <CommunityPage /> }
