import { CatalogPage } from '@/components/pages/CatalogPage'
import { parseCatalogQuery } from '@/lib/catalog'
import { fetchCountries, fetchGenres, fetchNewMovies, searchMovies } from '@/lib/api'

export const revalidate = 300

export default async function SearchPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const query = parseCatalogQuery(searchParams)
  const [genres, countries, response] = await Promise.all([
    fetchGenres(),
    fetchCountries(),
    query.keyword || query.type !== 'all' || query.genre !== 'all' || query.country !== 'all' || query.year !== 'all'
      ? searchMovies({ keyword: query.keyword || undefined, type_list: query.type !== 'all' ? query.type : undefined, category: query.genre !== 'all' ? query.genre : undefined, country: query.country !== 'all' ? query.country : undefined, year: query.year !== 'all' ? query.year : undefined, sort_field: query.sortField, sort_type: query.sortType, page: query.page, limit: query.limit })
      : fetchNewMovies(query.page),
  ])
  const items = response.items || []
  return <CatalogPage title={query.keyword ? `Kết quả cho “${query.keyword}”` : 'Khám phá phim'} description="Tìm kiếm và lọc kho phim theo thể loại, quốc gia và năm phát hành." movies={items} query={query} totalItems={response.pagination?.totalItems || items.length} totalPages={response.pagination?.totalPages || 1} genres={genres} countries={countries} showSearch />
}
