import { Metadata } from 'next'
import WatchPartyPage from '@/components/pages/WatchPartyPage'

export const metadata: Metadata = {
  title: 'Phòng Xem Chung - CineMind',
  description: 'Tham gia phòng xem chung hoặc tạo phòng mới để xem phim đồng bộ cùng bạn bè.'
}

export default function WatchPartyMainPage() {
  return <WatchPartyPage />
}
