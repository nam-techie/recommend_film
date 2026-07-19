import 'server-only'

import { cache } from 'react'
import { fetchMovieDetail } from '@/lib/api'

export const getMoviePageData = cache(async (slug: string) => fetchMovieDetail(slug))
