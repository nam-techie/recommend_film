import { Metadata } from 'next'
import { GenresPage } from '@/components/pages/GenresPage'

export const metadata: Metadata = {
  title: 'Thể Loại Phim - MovieWiser',
  description: 'Khám phá phim theo thể loại: Hành động, Tình cảm, Kinh dị, Hài hước, Khoa học viễn tưởng và nhiều thể loại khác. Tìm phim theo sở thích của bạn.',
  keywords: [
    'thể loại phim',
    'phim hành động',
    'phim tình cảm',
    'phim kinh dị',
    'phim hài hước',
    'phim khoa học viễn tưởng',
    'phim võ thuật',
    'phim anime',
    'xem phim theo thể loại',
    'MovieWiser'
  ],
  openGraph: {
    title: 'Thể Loại Phim - MovieWiser',
    description: 'Khám phá phim theo thể loại yêu thích. Tìm phim phù hợp với sở thích của bạn.',
    type: 'website',
    url: 'https://moviewiser.com/genres',
    siteName: 'MovieWiser'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Thể Loại Phim - MovieWiser',
    description: 'Khám phá phim theo thể loại yêu thích. Tìm phim phù hợp với sở thích của bạn.',
  },
  alternates: {
    canonical: 'https://moviewiser.com/genres'
  }
}

export default function Genres() {
  return <GenresPage />
} 