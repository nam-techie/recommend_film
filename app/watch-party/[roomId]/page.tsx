import { Metadata } from 'next'
import WatchPartyPage from '@/components/pages/WatchPartyPage'

interface Props {
  params: {
    roomId: string
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { roomId } = params
  
  return {
    title: `Phòng ${roomId} - Xem Chung - CineMind`,
    description: 'Tham gia phòng xem phim cùng bạn bè với chat real-time và đồng bộ video.',
    keywords: 'xem chung, watch party, phòng xem phim, chat real-time',
  }
}

export default function WatchPartyRoomPage({ params }: Props) {
  const { roomId } = params
  
  return <WatchPartyPage roomId={roomId} />
} 