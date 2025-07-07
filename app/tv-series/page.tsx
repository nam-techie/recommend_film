import { Metadata } from 'next'
import { TvSeriesPage } from '@/components/pages/TvSeriesPage'

export const metadata: Metadata = {
  title: 'Phim Bộ - MovieWiser',
  description: 'Xem phim bộ chất lượng cao với phụ đề tiếng Việt. Bộ sưu tập phim bộ Hàn Quốc, Trung Quốc, Mỹ, Thái Lan và nhiều quốc gia khác. Cập nhật tập mới liên tục.',
  keywords: [
    'phim bộ',
    'xem phim bộ',
    'phim bộ Hàn Quốc',
    'phim bộ Trung Quốc',
    'phim bộ Mỹ',
    'phim bộ Thái Lan',
    'TV series',
    'phim vietsub',
    'MovieWiser'
  ],
  openGraph: {
    title: 'Phim Bộ - MovieWiser',
    description: 'Xem phim bộ chất lượng cao với phụ đề tiếng Việt. Cập nhật tập mới liên tục.',
    type: 'website',
    url: 'https://moviewiser.com/tv-series',
    siteName: 'MovieWiser'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Phim Bộ - MovieWiser',
    description: 'Xem phim bộ chất lượng cao với phụ đề tiếng Việt. Cập nhật tập mới liên tục.',
  },
  alternates: {
    canonical: 'https://moviewiser.com/tv-series'
  }
}

export default function TvSeries() {
  return <TvSeriesPage />
} 