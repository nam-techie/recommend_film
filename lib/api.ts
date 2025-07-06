// API Types based on phimapi.com documentation
export interface Movie {
  _id: string
  name: string
  slug: string
  origin_name: string
  content?: string
  type: 'single' | 'series' | 'hoathinh'
  status?: string
  poster_url: string
  thumb_url: string
  is_copyright: boolean
  sub_docquyen: boolean
  chieurap: boolean
  trailer_url?: string
  time: string
  episode_current: string
  episode_total?: string
  quality: string
  lang: string
  notify?: string
  showtimes?: string
  year: number
  view?: number
  actor?: string[]
  director?: string[]
  category: Array<{
    id: string
    name: string
    slug: string
  }>
  country: Array<{
    id: string
    name: string
    slug: string
  }>
  created?: {
    time: string
  }
  modified?: {
    time: string
  }
  tmdb?: {
    type: string
    id: string
    season?: number
    vote_average: number
    vote_count: number
  }
  imdb?: {
    id: string | null
  }
}

export interface Episode {
  name: string
  slug: string
  filename: string
  link_embed: string
  link_m3u8: string
}

export interface EpisodeServer {
  server_name: string
  server_data: Episode[]
}

export interface MovieDetail {
  status: boolean
  msg: string
  movie: Movie
  episodes: EpisodeServer[]
}

export interface ApiResponse<T> {
  status: boolean | string
  msg: string
  data?: T
  items?: Movie[]
  pagination?: {
    totalItems: number
    totalItemsPerPage: number
    currentPage: number
    totalPages: number
  }
}

export interface SearchParams {
  keyword?: string
  page?: number
  sort_field?: string
  sort_type?: 'asc' | 'desc'
  sort_lang?: string
  category?: string
  country?: string
  year?: string
  limit?: number
  type_list?: string
}

export interface Genre {
  _id: string
  name: string
  slug: string
}

export interface Country {
  _id: string
  name: string
  slug: string
}

const API_BASE_URL = 'https://phimapi.com'
const CDN_IMAGE_URL = 'https://phimimg.com'

// Helper function to build image URL
export function getImageUrl(path: string): string {
  if (!path) return '/placeholder-movie.jpg'
  if (path.startsWith('http')) return path
  return `${CDN_IMAGE_URL}/${path}`
}

// Helper function to build API URL
function buildApiUrl(endpoint: string, params?: Record<string, any>): string {
  const url = new URL(`${API_BASE_URL}${endpoint}`)
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, value.toString())
      }
    })
  }
  
  return url.toString()
}

// API Functions
export async function fetchNewMovies(page: number = 1): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(buildApiUrl('/danh-sach/phim-moi-cap-nhat-v3', { page }), {
      next: { revalidate: 300 } // Cache for 5 minutes
    })
    if (!response.ok) throw new Error('Failed to fetch new movies')
    return await response.json()
  } catch (error) {
    console.error('Error fetching new movies:', error)
    throw error
  }
}

export async function fetchMovieDetail(slug: string): Promise<MovieDetail> {
  try {
    const response = await fetch(buildApiUrl(`/phim/${slug}`), {
      next: { revalidate: 600 } // Cache for 10 minutes
    })
    if (!response.ok) throw new Error('Failed to fetch movie detail')
    return await response.json()
  } catch (error) {
    console.error('Error fetching movie detail:', error)
    throw error
  }
}

export async function searchMovies(params: SearchParams): Promise<ApiResponse<any>> {
  try {
    const endpoint = params.keyword ? '/v1/api/tim-kiem' : '/v1/api/danh-sach/phim-moi-cap-nhat'
    const response = await fetch(buildApiUrl(endpoint, params))
    if (!response.ok) throw new Error('Failed to search movies')
    return await response.json()
  } catch (error) {
    console.error('Error searching movies:', error)
    throw error
  }
}

export async function fetchMoviesByCategory(
  categorySlug: string, 
  params: Omit<SearchParams, 'category'> = {}
): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(buildApiUrl(`/v1/api/the-loai/${categorySlug}`, params))
    if (!response.ok) throw new Error('Failed to fetch movies by category')
    return await response.json()
  } catch (error) {
    console.error('Error fetching movies by category:', error)
    throw error
  }
}

export async function fetchMoviesByCountry(
  countrySlug: string, 
  params: Omit<SearchParams, 'country'> = {}
): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(buildApiUrl(`/v1/api/quoc-gia/${countrySlug}`, params))
    if (!response.ok) throw new Error('Failed to fetch movies by country')
    return await response.json()
  } catch (error) {
    console.error('Error fetching movies by country:', error)
    throw error
  }
}

export async function fetchMoviesByYear(
  year: string, 
  params: Omit<SearchParams, 'year'> = {}
): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(buildApiUrl(`/v1/api/nam/${year}`, params))
    if (!response.ok) throw new Error('Failed to fetch movies by year')
    return await response.json()
  } catch (error) {
    console.error('Error fetching movies by year:', error)
    throw error
  }
}

export async function fetchGenres(): Promise<Genre[]> {
  try {
    const response = await fetch(buildApiUrl('/v1/api/the-loai'))
    if (!response.ok) throw new Error('Failed to fetch genres')
    return await response.json()
  } catch (error) {
    console.error('Error fetching genres:', error)
    throw error
  }
}

export async function fetchCountries(): Promise<Country[]> {
  try {
    const response = await fetch(buildApiUrl('/v1/api/quoc-gia'))
    if (!response.ok) throw new Error('Failed to fetch countries')
    return await response.json()
  } catch (error) {
    console.error('Error fetching countries:', error)
    throw error
  }
}

export async function fetchMoviesByType(
  typeList: string,
  params: SearchParams = {}
): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(buildApiUrl(`/v1/api/danh-sach/${typeList}`, params))
    if (!response.ok) throw new Error('Failed to fetch movies by type')
    return await response.json()
  } catch (error) {
    console.error('Error fetching movies by type:', error)
    throw error
  }
}

// Fetch trending movies (most viewed)
export async function fetchTrendingMovies(page: number = 1): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(buildApiUrl('/danh-sach/phim-moi-cap-nhat-v3', { 
      page,
      sort_field: 'view',
      sort_type: 'desc'
    }), {
      next: { revalidate: 300 }
    })
    if (!response.ok) throw new Error('Failed to fetch trending movies')
    return await response.json()
  } catch (error) {
    console.error('Error fetching trending movies:', error)
    throw error
  }
}

// Fetch featured movies (high rated)
export async function fetchFeaturedMovies(page: number = 1): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(buildApiUrl('/danh-sach/phim-moi-cap-nhat-v3', { 
      page,
      sort_field: 'tmdb.vote_average',
      sort_type: 'desc'
    }), {
      next: { revalidate: 300 }
    })
    if (!response.ok) throw new Error('Failed to fetch featured movies')
    return await response.json()
  } catch (error) {
    console.error('Error fetching featured movies:', error)
    throw error
  }
}

// Fetch movies by type (phim-le, phim-bo, hoat-hinh)
export async function fetchMoviesByTypeV3(
  type: 'phim-le' | 'phim-bo' | 'hoat-hinh',
  page: number = 1
): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(buildApiUrl(`/danh-sach/${type}`, { page }), {
      next: { revalidate: 300 }
    })
    if (!response.ok) throw new Error(`Failed to fetch ${type}`)
    return await response.json()
  } catch (error) {
    console.error(`Error fetching ${type}:`, error)
    throw error
  }
}