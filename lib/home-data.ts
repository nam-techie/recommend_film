import 'server-only'

import {
  fetchActionMovies,
  fetchAnimeMovies,
  fetchChineseMovies,
  fetchFeaturedMovies,
  fetchGenres,
  fetchKoreanMovies,
  fetchMovieDetail,
  fetchNewMovies,
  fetchUSUKMovies,
  fetchVietnameseMovies,
  type Genre,
  type Movie,
} from '@/lib/api'

export interface HomeMovieSection {
  id: string
  title: string
  subtitle: string
  href: string
  movies: Movie[]
}

export interface HomePageData {
  hero: Movie[]
  sections: HomeMovieSection[]
  genres: Genre[]
}

async function safeMovies(load: () => Promise<Movie[]>): Promise<Movie[]> {
  try {
    return (await load()).filter((movie) => movie?.slug && movie?.poster_url && movie?.name).slice(0, 10)
  } catch (error) {
    console.error('Unable to load home movie section', error)
    return []
  }
}

export async function getHomePageData(): Promise<HomePageData> {
  const latestPromise = safeMovies(async () => (await fetchNewMovies(1)).items || [])

  const [latest, featured, korean, chinese, usuk, vietnamese, action, anime, genres] = await Promise.all([
    latestPromise,
    safeMovies(async () => (await fetchFeaturedMovies(1)).items || []),
    safeMovies(async () => (await fetchKoreanMovies(1, 10)).data?.items || []),
    safeMovies(async () => (await fetchChineseMovies(1, 10)).data?.items || []),
    safeMovies(async () => (await fetchUSUKMovies(1, 10)).data?.items || []),
    safeMovies(async () => (await fetchVietnameseMovies(1, 10)).data?.items || []),
    safeMovies(async () => (await fetchActionMovies(1, 10)).data?.items || []),
    safeMovies(async () => (await fetchAnimeMovies(1, 10)).data?.items || []),
    fetchGenres().catch((error) => {
      console.error('Unable to load genres', error)
      return []
    }),
  ])

  const heroBase = latest.slice(0, 5)
  const hero = await Promise.all(
    heroBase.map(async (movie) => {
      try {
        return (await fetchMovieDetail(movie.slug)).movie
      } catch {
        return movie
      }
    }),
  )

  return {
    hero,
    genres,
    sections: [
      { id: 'featured', title: 'Phim nổi bật', subtitle: 'Những lựa chọn đáng xem lúc này', href: '/top-rated', movies: featured },
      { id: 'korean', title: 'Phim Hàn Quốc mới', subtitle: 'K-Drama được cập nhật liên tục', href: '/country/han-quoc', movies: korean },
      { id: 'chinese', title: 'Phim Trung Quốc mới', subtitle: 'Cổ trang, hiện đại và những câu chuyện cuốn hút', href: '/country/trung-quoc', movies: chinese },
      { id: 'usuk', title: 'Phim Âu Mỹ', subtitle: 'Điện ảnh và series quốc tế nổi bật', href: '/country/au-my', movies: usuk },
      { id: 'vietnamese', title: 'Phim Việt Nam', subtitle: 'Những câu chuyện gần gũi, giàu cảm xúc', href: '/country/viet-nam', movies: vietnamese },
      { id: 'action', title: 'Phim hành động', subtitle: 'Gay cấn, tốc độ và kịch tính', href: '/genre/hanh-dong', movies: action },
      { id: 'anime', title: 'Anime mới nhất', subtitle: 'Thế giới hoạt hình đầy màu sắc', href: '/genre/hoat-hinh', movies: anime },
      { id: 'latest', title: 'Mới phát hành', subtitle: 'Các phim vừa được cập nhật', href: '/new-releases', movies: latest },
    ],
  }
}
