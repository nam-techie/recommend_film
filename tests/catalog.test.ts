import { describe, expect, it } from 'vitest'
import { catalogQueryString, catalogSearchParams, parseCatalogQuery } from '@/lib/catalog'

describe('catalog query', () => {
  it('validates untrusted URL parameters', () => {
    expect(parseCatalogQuery({ type: 'bad', genre: '../secret', year: '9999', language: 'bad', sort_field: 'drop', page: '-4', limit: '999' })).toMatchObject({
      type: 'all', genre: 'all', year: 'all', language: 'all', sortField: 'modified.time', page: 1, limit: 24,
    })
  })

  it('maps every supported filter to the movie API', () => {
    const query = parseCatalogQuery({ keyword: 'dragon', type: 'phim-le', genre: 'hanh-dong', country: 'viet-nam', year: '2025', language: 'vietsub', sort_field: 'year', sort_type: 'asc', page: '3', limit: '48' })
    expect(catalogSearchParams(query)).toEqual({
      keyword: 'dragon', type_list: 'phim-le', category: 'hanh-dong', country: 'viet-nam', year: '2025', sort_lang: 'vietsub', sort_field: 'year', sort_type: 'asc', page: 3, limit: 48,
    })
  })

  it('round trips browser back/forward state through the URL', () => {
    const query = parseCatalogQuery({ keyword: 'drag', type: 'phim-bo', language: 'long-tieng', page: '2', limit: '32' })
    const params = Object.fromEntries(new URLSearchParams(catalogQueryString(query)))
    expect(parseCatalogQuery(params)).toEqual(query)
  })
})
