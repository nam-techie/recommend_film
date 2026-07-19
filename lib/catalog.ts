export interface CatalogQuery {
  keyword: string
  type: string
  genre: string
  country: string
  year: string
  language: string
  sortField: string
  sortType: 'asc' | 'desc'
  page: number
  limit: number
}

type RawParams = Record<string, string | string[] | undefined>

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || ''
}

export function parseCatalogQuery(params: RawParams): CatalogQuery {
  const page = Number(one(params.page))
  const limit = Number(one(params.limit))
  return {
    keyword: one(params.keyword).trim().slice(0, 100),
    type: one(params.type) || 'all',
    genre: one(params.genre) || 'all',
    country: one(params.country) || 'all',
    year: one(params.year) || 'all',
    language: one(params.language) || 'all',
    sortField: one(params.sort_field) || 'modified.time',
    sortType: one(params.sort_type) === 'asc' ? 'asc' : 'desc',
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
    limit: [16, 24, 32, 48].includes(limit) ? limit : 24,
  }
}

export function catalogQueryString(query: CatalogQuery, overrides: Partial<CatalogQuery> = {}) {
  const value = { ...query, ...overrides }
  const params = new URLSearchParams()
  if (value.keyword) params.set('keyword', value.keyword)
  if (value.type !== 'all') params.set('type', value.type)
  if (value.genre !== 'all') params.set('genre', value.genre)
  if (value.country !== 'all') params.set('country', value.country)
  if (value.year !== 'all') params.set('year', value.year)
  if (value.language !== 'all') params.set('language', value.language)
  if (value.sortField !== 'modified.time') params.set('sort_field', value.sortField)
  if (value.sortType !== 'desc') params.set('sort_type', value.sortType)
  if (value.limit !== 24) params.set('limit', String(value.limit))
  if (value.page > 1) params.set('page', String(value.page))
  return params.toString()
}
