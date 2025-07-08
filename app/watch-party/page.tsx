import { Metadata } from 'next'
import GenresUpgradePage from '@/components/pages/GenresUpgradePage'

export const metadata: Metadata = {
  title: 'Phòng Xem Chung - CineMind',
  description: 'Tham gia phòng xem chung hoặc tạo phòng mới',
}

export default function WatchPartyMainPage() {
  return <GenresUpgradePage />
} 