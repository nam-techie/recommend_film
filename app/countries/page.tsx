import { Metadata } from 'next'
import { CountriesPage } from '@/components/pages/CountriesPage'

export const metadata: Metadata = {
  title: 'Phim Theo Quốc Gia - MovieWiser',
  description: 'Khám phá bộ sưu tập phim từ các quốc gia khác nhau: Hàn Quốc, Trung Quốc, Mỹ, Nhật Bản, Thái Lan và nhiều quốc gia khác. Xem phim quốc tế chất lượng cao với phụ đề tiếng Việt.',
  keywords: [
    'phim quốc gia',
    'phim Hàn Quốc',
    'phim Trung Quốc', 
    'phim Mỹ',
    'phim Nhật Bản',
    'phim Thái Lan',
    'xem phim quốc tế',
    'phim vietsub',
    'MovieWiser'
  ],
  openGraph: {
    title: 'Phim Theo Quốc Gia - MovieWiser',
    description: 'Khám phá bộ sưu tập phim từ các quốc gia khác nhau với phụ đề tiếng Việt chất lượng cao.',
    type: 'website',
    url: 'https://moviewiser.com/countries',
    siteName: 'MovieWiser'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Phim Theo Quốc Gia - MovieWiser',
    description: 'Khám phá bộ sưu tập phim từ các quốc gia khác nhau với phụ đề tiếng Việt chất lượng cao.',
  },
  alternates: {
    canonical: 'https://moviewiser.com/countries'
  }
}

export default function Countries() {
  return <CountriesPage />
} 