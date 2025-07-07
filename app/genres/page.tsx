import { Metadata } from 'next'
import GenresUpgradePage from '@/components/pages/GenresUpgradePage'

export const metadata: Metadata = {
  title: 'Xem Chung - CineMind',
  description: 'Xem phim cùng bạn bè với tính năng Watch Party. Tạo phòng riêng tư, chat real-time và đồng bộ video.',
  keywords: 'xem chung, watch party, phim online, xem phim cùng bạn bè, chat phim',
}

export default function GenresPage() {
  return <GenresUpgradePage />
} 