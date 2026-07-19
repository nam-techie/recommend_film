import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MovieDetailPage } from '@/components/pages/MovieDetailPage'
import { getImageUrl } from '@/lib/api'
import { getMoviePageData } from '@/lib/movie-data'

interface PageProps { params: { slug: string } }

export const revalidate = 600

function plainText(value?: string) {
  return (value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const detail = await getMoviePageData(params.slug)
    const movie = detail.movie
    const description = plainText(movie.content).slice(0, 155) || `Xem ${movie.name} chất lượng cao tại CineMind.`
    const image = getImageUrl(movie.thumb_url || movie.poster_url)
    return {
      title: `${movie.name}${movie.origin_name ? ` (${movie.origin_name})` : ''} - CineMind`,
      description,
      alternates: { canonical: `/movie/${movie.slug}` },
      openGraph: { title: movie.name, description, type: 'video.movie', images: [{ url: image, alt: movie.name }] },
      twitter: { card: 'summary_large_image', title: movie.name, description, images: [image] },
    }
  } catch {
    return { title: 'Phim không tồn tại - CineMind' }
  }
}

export default async function MoviePage({ params }: PageProps) {
  if (!params.slug || params.slug.length < 2) notFound()
  try {
    const detail = await getMoviePageData(params.slug)
    if (!detail?.movie || detail.status === false) notFound()
    return <MovieDetailPage slug={params.slug} initialDetail={detail} />
  } catch {
    notFound()
  }
}
