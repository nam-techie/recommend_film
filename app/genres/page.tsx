import { Metadata } from 'next'
import GenresUpgradePage from '@/components/pages/GenresUpgradePage'

export const metadata: Metadata = {
  title: 'Xem Chung - Đang Nâng Cấp - MovieWiser',
  description: 'Tính năng Xem Chung đang được nâng cấp để mang đến trải nghiệm tốt hơn cho bạn.',
  keywords: [
    'xem chung',
    'nâng cấp',
    'MovieWiser',
    'bảo trì'
  ],
  openGraph: {
    title: 'Xem Chung - Đang Nâng Cấp - MovieWiser',
    description: 'Tính năng Xem Chung đang được nâng cấp để mang đến trải nghiệm tốt hơn cho bạn.',
    type: 'website',
    url: 'https://moviewiser.com/genres',
    siteName: 'MovieWiser'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Xem Chung - Đang Nâng Cấp - MovieWiser',
    description: 'Tính năng Xem Chung đang được nâng cấp để mang đến trải nghiệm tốt hơn cho bạn.',
  },
  alternates: {
    canonical: 'https://moviewiser.com/genres'
  }
}

export default function GenresPage() {
  return <GenresUpgradePage />
} 