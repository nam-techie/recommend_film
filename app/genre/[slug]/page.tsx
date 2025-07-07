import { Metadata } from 'next'
import { GenreDetailPage } from '@/components/pages/GenreDetailPage'
import { fetchGenres } from '@/lib/api'
import { notFound } from 'next/navigation'

interface PageProps {
  params: { slug: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = params
  
  try {
    // Fetch genres to get the genre name
    const genres = await fetchGenres()
    const genre = genres.find(g => g.slug === slug)
    
    if (!genre) {
      return {
        title: 'Thể loại không tồn tại - MovieWiser',
        description: 'Thể loại phim bạn tìm kiếm không tồn tại trên MovieWiser.'
      }
    }

    return {
      title: `Phim ${genre.name} - MovieWiser`,
      description: `Khám phá bộ sưu tập phim ${genre.name} chất lượng cao với phụ đề tiếng Việt tại MovieWiser. Xem phim ${genre.name} mới nhất và hay nhất.`,
      keywords: [
        `phim ${genre.name}`,
        `xem phim ${genre.name}`,
        `phim ${genre.name} mới nhất`,
        `phim ${genre.name} hay nhất`,
        'xem phim online',
        'phim vietsub',
        'MovieWiser'
      ],
      openGraph: {
        title: `Phim ${genre.name} - MovieWiser`,
        description: `Khám phá bộ sưu tập phim ${genre.name} chất lượng cao với phụ đề tiếng Việt tại MovieWiser.`,
        type: 'website',
        url: `https://moviewiser.com/genre/${slug}`,
        siteName: 'MovieWiser'
      },
      twitter: {
        card: 'summary_large_image',
        title: `Phim ${genre.name} - MovieWiser`,
        description: `Khám phá bộ sưu tập phim ${genre.name} chất lượng cao với phụ đề tiếng Việt.`,
      },
      alternates: {
        canonical: `https://moviewiser.com/genre/${slug}`
      }
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Thể loại phim - MovieWiser',
      description: 'Khám phá các thể loại phim đa dạng tại MovieWiser.'
    }
  }
}

// Generate static params for popular genres (optional optimization)
export async function generateStaticParams() {
  try {
    const genres = await fetchGenres()
    // Generate static pages for first 10 popular genres
    return genres.slice(0, 10).map((genre) => ({
      slug: genre.slug,
    }))
  } catch (error) {
    console.error('Error generating static params:', error)
    return []
  }
}

export default async function GenrePage({ params, searchParams }: PageProps) {
  const { slug } = params
  const page = Number(searchParams.page) || 1
  
  // Validate genre exists
  try {
    const genres = await fetchGenres()
    const genre = genres.find(g => g.slug === slug)
    
    if (!genre) {
      notFound()
    }
  } catch (error) {
    console.error('Error validating genre:', error)
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <GenreDetailPage 
        genreSlug={slug} 
        initialPage={page}
      />
    </div>
  )
} 