import { Metadata } from 'next'
import { CatalogPage } from '@/components/pages/CatalogPage'
import { parseCatalogQuery } from '@/lib/catalog'
import { fetchCountries, fetchGenres, fetchMoviesByFilter } from '@/lib/api'

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

export default async function TvSeries({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const query = parseCatalogQuery(searchParams)
  const [genres, countries, response] = await Promise.all([
    fetchGenres(),
    fetchCountries(),
    fetchMoviesByFilter({ type_list: 'phim-bo', page: query.page, limit: query.limit, country: query.country !== 'all' ? query.country : undefined, category: query.genre !== 'all' ? query.genre : undefined, year: query.year !== 'all' ? query.year : undefined, sort_field: query.sortField as 'modified.time' | '_id' | 'year', sort_type: query.sortType }),
  ])
  const items = response.data?.items || []
  const pagination = response.data?.params?.pagination
  return <CatalogPage title="Phim bộ" description="Series mới từ Hàn Quốc, Trung Quốc, Âu Mỹ và nhiều quốc gia khác." movies={items} query={query} totalItems={pagination?.totalItems || items.length} totalPages={pagination?.totalPages || 1} genres={genres} countries={countries} />
}
