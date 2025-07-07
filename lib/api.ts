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

// API Response cho thể loại, quốc gia, năm
export interface CategoryApiResponse {
  status: boolean
  msg: string
  data: {
    seoOnPage: {
      og_type: string
      titleHead: string
      descriptionHead: string
      og_image: string[]
      og_url: string
    }
    breadCrumb: Array<{
      name: string
      slug?: string
      isCurrent: boolean
      position: number
    }>
    titlePage: string
    items: Movie[]
    params: {
      type_slug: string
      slug?: string
      filterCategory: string[]
      filterCountry: string[]
      filterYear: string[]
      filterType: string[]
      sortField: string
      sortType: string
      pagination: {
        totalItems: number
        totalItemsPerPage: number
        currentPage: number
        totalPages: number
      }
    }
    type_list: string
    APP_DOMAIN_FRONTEND: string
    APP_DOMAIN_CDN_IMAGE: string
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
    const response = await fetch(buildApiUrl('/danh-sach/phim-moi-cap-nhat', { page }), {
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
    const endpoint = params.keyword ? '/v1/api/tim-kiem' : '/api/danh-sach/phim-moi-cap-nhat'
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
): Promise<CategoryApiResponse> {
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
): Promise<CategoryApiResponse> {
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
    const response = await fetch(buildApiUrl('/the-loai'))
    if (!response.ok) throw new Error('Failed to fetch genres')
    const data = await response.json()
    return Array.isArray(data) ? data : data.data || []
  } catch (error) {
    console.error('Error fetching genres:', error)
    throw error
  }
}

export async function fetchCountries(): Promise<Country[]> {
  try {
    const response = await fetch(buildApiUrl('/quoc-gia'))
    if (!response.ok) throw new Error('Failed to fetch countries')
    const data = await response.json()
    // API trả về trực tiếp array
    return Array.isArray(data) ? data : []
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
    const response = await fetch(buildApiUrl(`/v1/api/danh-sach/type/${typeList}`, params))
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
    const response = await fetch(buildApiUrl('/danh-sach/phim-moi-cap-nhat', { page }), {
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
    const response = await fetch(buildApiUrl('/danh-sach/phim-moi-cap-nhat', { page }), {
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
    const response = await fetch(buildApiUrl(`/v1/api/danh-sach/${type}`, { page }), {
      next: { revalidate: 300 }
    })
    if (!response.ok) throw new Error(`Failed to fetch ${type}`)
    return await response.json()
  } catch (error) {
    console.error(`Error fetching ${type}:`, error)
    throw error
  }
}

// Tổng hợp API - Fetch movies with filters  
export async function fetchMoviesByFilter(params: {
  type_list: 'phim-bo' | 'phim-le' | 'tv-shows' | 'hoat-hinh' | 'phim-vietsub' | 'phim-thuyet-minh' | 'phim-long-tieng'
  page?: number
  sort_field?: 'modified.time' | '_id' | 'year'
  sort_type?: 'asc' | 'desc'
  sort_lang?: 'vietsub' | 'thuyet-minh' | 'long-tieng'
  category?: string
  country?: string
  year?: string
  limit?: number
}): Promise<CategoryApiResponse> {
  try {
    const { type_list, ...filterParams } = params
    const response = await fetch(buildApiUrl(`/v1/api/danh-sach/${type_list}`, filterParams), {
      next: { revalidate: 300 }
    })
    if (!response.ok) throw new Error(`Failed to fetch movies by filter`)
    return await response.json()
  } catch (error) {
    console.error('Error fetching movies by filter:', error)
    throw error
  }
}

// Specific functions for different movie categories
export async function fetchKoreanMovies(page: number = 1, limit: number = 12): Promise<CategoryApiResponse> {
  return fetchMoviesByFilter({
    type_list: 'phim-bo',
    country: 'han-quoc',
    sort_field: 'modified.time',
    sort_type: 'desc',
    page,
    limit
  })
}

export async function fetchChineseMovies(page: number = 1, limit: number = 12): Promise<CategoryApiResponse> {
  return fetchMoviesByFilter({
    type_list: 'phim-bo',
    country: 'trung-quoc',
    sort_field: 'modified.time',
    sort_type: 'desc',
    page,
    limit
  })
}

export async function fetchJapaneseMovies(page: number = 1, limit: number = 12): Promise<CategoryApiResponse> {
  return fetchMoviesByFilter({
    type_list: 'phim-bo',
    country: 'nhat-ban',
    sort_field: 'modified.time',
    sort_type: 'desc',
    page,
    limit
  })
}

export async function fetchVietnameseMovies(page: number = 1, limit: number = 12): Promise<CategoryApiResponse> {
  return fetchMoviesByFilter({
    type_list: 'phim-bo',
    country: 'viet-nam',
    sort_field: 'modified.time',
    sort_type: 'desc',
    page,
    limit
  })
}

export async function fetchUSUKMovies(page: number = 1, limit: number = 12): Promise<CategoryApiResponse> {
  return fetchMoviesByFilter({
    type_list: 'phim-le',
    country: 'au-my',
    sort_field: 'modified.time',
    sort_type: 'desc',
    page,
    limit
  })
}

export async function fetchActionMovies(page: number = 1, limit: number = 12): Promise<CategoryApiResponse> {
  return fetchMoviesByFilter({
    type_list: 'phim-le',
    category: 'hanh-dong',
    sort_field: 'modified.time',
    sort_type: 'desc',
    page,
    limit
  })
}

export async function fetchTheaterMovies(page: number = 1, limit: number = 12): Promise<CategoryApiResponse> {
  return fetchMoviesByFilter({
    type_list: 'phim-le',
    sort_field: 'year',
    sort_type: 'desc',
    year: '2024',
    page,
    limit
  })
}

export async function fetchAnimeMovies(page: number = 1, limit: number = 12): Promise<CategoryApiResponse> {
  return fetchMoviesByFilter({
    type_list: 'hoat-hinh',
    sort_field: 'modified.time',
    sort_type: 'desc',
    page,
    limit
  })
}

// Category helper for movie collections
export interface Category {
  slug: string
  name: string
  description: string
  type: 'country' | 'genre' | 'special'
  apiParams: {
    type_list: 'phim-bo' | 'phim-le' | 'tv-shows' | 'hoat-hinh' | 'phim-vietsub' | 'phim-thuyet-minh' | 'phim-long-tieng'
    country?: string
    category?: string
    year?: string
    sort_field?: 'modified.time' | '_id' | 'year'
    sort_type?: 'asc' | 'desc'
  }
}

// Predefined categories mapping
export const CATEGORIES: Record<string, Category> = {
  'han-quoc': {
    slug: 'han-quoc',
    name: 'Phim Hàn Quốc',
    description: 'Những bộ phim Hàn Quốc hot nhất, K-Drama đặc sắc với cốt truyện hấp dẫn',
    type: 'country',
    apiParams: {
      type_list: 'phim-bo',
      country: 'han-quoc',
      sort_field: 'modified.time',
      sort_type: 'desc'
    }
  },
  'trung-quoc': {
    slug: 'trung-quoc',
    name: 'Phim Trung Quốc',
    description: 'Phim cổ trang Trung Quốc đặc sắc, võ thuật huyền thoại và tình cảm lãng mạn',
    type: 'country',
    apiParams: {
      type_list: 'phim-bo',
      country: 'trung-quoc',
      sort_field: 'modified.time',
      sort_type: 'desc'
    }
  },
  'au-my': {
    slug: 'au-my',
    name: 'Phim US-UK',
    description: 'Blockbuster Hollywood và phim Anh Quốc chất lượng cao, kịch tính và hành động',
    type: 'country',
    apiParams: {
      type_list: 'phim-le',
      country: 'au-my',
      sort_field: 'modified.time',
      sort_type: 'desc'
    }
  },
  'viet-nam': {
    slug: 'viet-nam',
    name: 'Yêu Kiều Mỹ',
    description: 'Phim Việt Nam chất lượng cao, câu chuyện gần gũi và ý nghĩa',
    type: 'country',
    apiParams: {
      type_list: 'phim-bo',
      country: 'viet-nam',
      sort_field: 'modified.time',
      sort_type: 'desc'
    }
  },
  'hanh-dong': {
    slug: 'hanh-dong',
    name: 'Đường về nhà là vào tim ta...',
    description: 'Phim hành động gay cấn, kịch tính với những pha action mãn nhãn',
    type: 'genre',
    apiParams: {
      type_list: 'phim-le',
      category: 'hanh-dong',
      sort_field: 'modified.time',
      sort_type: 'desc'
    }
  },
  'hoat-hinh': {
    slug: 'hoat-hinh',
    name: 'Kho Tàng Anime Mới Nhất',
    description: 'Thế giới hoạt hình Nhật Bản đầy màu sắc, anime hay nhất mọi thời đại',
    type: 'genre',
    apiParams: {
      type_list: 'hoat-hinh',
      sort_field: 'modified.time',
      sort_type: 'desc'
    }
  }
}

// Fetch movies by category slug
export async function fetchMoviesByCategorySlug(
  categorySlug: string,
  page: number = 1,
  limit: number = 24
): Promise<CategoryApiResponse> {
  const category = CATEGORIES[categorySlug]
  
  if (!category) {
    throw new Error(`Category ${categorySlug} not found`)
  }

  return fetchMoviesByFilter({
    ...category.apiParams,
    page,
    limit
  })
}

// Get category info by slug
export function getCategoryInfo(slug: string): Category | null {
  return CATEGORIES[slug] || null
}

// Get all available categories
export function getAllCategories(): Category[] {
  return Object.values(CATEGORIES)
}