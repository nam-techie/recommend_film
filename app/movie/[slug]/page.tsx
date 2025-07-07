import { Metadata } from 'next'
import { MovieDetailPage } from '@/components/pages/MovieDetailPage'
import { notFound } from 'next/navigation'

interface PageProps {
  params: {
    slug: string
  }
}

// Generate metadata for the movie page
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = params
  
  // Create a more readable title from slug
  const title = slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return {
    title: `${title} - MovieWiser`,
    description: `Xem phim ${title} vietsub chất lượng cao tại MovieWiser. Phim HD với nhiều server và tốc độ tải nhanh.`,
    keywords: [
      title,
      'xem phim online',
      'phim vietsub',
      'phim HD',
      'MovieWiser',
      'phim hay'
    ],
    openGraph: {
      title: `${title} - MovieWiser`,
      description: `Xem phim ${title} vietsub chất lượng cao tại MovieWiser.`,
      type: 'video.movie',
      url: `https://moviewiser.com/movie/${slug}`,
      siteName: 'MovieWiser'
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} - MovieWiser`,
      description: `Xem phim ${title} vietsub chất lượng cao tại MovieWiser.`,
    },
    alternates: {
      canonical: `https://moviewiser.com/movie/${slug}`
    }
  }
}

export default function MoviePage({ params }: PageProps) {
  const { slug } = params

  // Validate slug format (basic check)
  if (!slug || slug.length < 2) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <MovieDetailPage slug={slug} />
    </div>
  )
}