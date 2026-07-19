import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CatalogPage } from '@/components/pages/CatalogPage'
import { parseCatalogQuery } from '@/lib/catalog'
import { fetchCountries, fetchGenres, fetchMoviesByCategory } from '@/lib/api'

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
  const query = parseCatalogQuery(searchParams)
  const [genres, countries] = await Promise.all([fetchGenres(), fetchCountries()])
  const genre = genres.find((item) => item.slug === params.slug)
  if (!genre) notFound()
  const response = await fetchMoviesByCategory(params.slug, {
    page: query.page,
    limit: query.limit,
    country: query.country !== 'all' ? query.country : undefined,
    year: query.year !== 'all' ? query.year : undefined,
    sort_field: query.sortField,
    sort_type: query.sortType,
  })
  const items = response.data?.items || []
  const pagination = response.data?.params?.pagination
  return <CatalogPage title={`Phim ${genre.name}`} description={`Bộ sưu tập phim ${genre.name} được cập nhật liên tục.`} movies={items} query={query} totalItems={pagination?.totalItems || items.length} totalPages={pagination?.totalPages || 1} countries={countries} />
}
