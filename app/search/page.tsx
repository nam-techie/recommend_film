import { CatalogPage } from '@/components/pages/CatalogPage'
import { catalogSearchParams, parseCatalogQuery } from '@/lib/catalog'
import { fetchCountries, fetchGenres, searchMovies } from '@/lib/api'

export const revalidate = 300

export default async function SearchPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const query = parseCatalogQuery(searchParams)
  const [genres, countries, response] = await Promise.all([
    fetchGenres(),
    fetchCountries(),
    searchMovies(catalogSearchParams(query)),
  ])
  const items = response.items || []
  return <CatalogPage title={query.keyword ? `Kết quả cho “${query.keyword}”` : 'Khám phá phim'} description="Tìm kiếm và lọc kho phim theo thể loại, quốc gia và năm phát hành." movies={items} query={query} totalItems={response.pagination?.totalItems || items.length} totalPages={response.pagination?.totalPages || 1} genres={genres} countries={countries} showSearch />
}
