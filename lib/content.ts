export type FeaturedPlacement = 'hero' | 'featured_rail'
export type ContentVersionStatus = 'draft' | 'scheduled' | 'published' | 'archived'

export interface ContentMovieSnapshot {
  slug: string
  providerId: string | null
  title: string
  originalTitle: string
  poster: string
  thumbnail: string
  genres: string[]
  year: number | null
  episodeLabel: string
  capturedAt: number
}

export interface FeaturedCollectionVersion {
  id: string
  collectionId: string
  title: string
  placement: FeaturedPlacement
  status: ContentVersionStatus
  movies: ContentMovieSnapshot[]
  startsAt: number | null
  endsAt: number | null
  createdAt: number
  createdBy: string
  publishedAt: number | null
  publishedBy: string | null
  reason: string
  basedOnVersionId: string | null
}

export interface FeaturedCollectionSummary {
  id: string
  title: string
  placement: FeaturedPlacement
  draftVersionId: string | null
  publishedVersionId: string | null
  updatedAt: number
  updatedBy: string
}

export interface PublicHomeContent {
  generatedAt: number
  collections: Array<Pick<FeaturedCollectionVersion, 'collectionId' | 'title' | 'placement' | 'movies' | 'startsAt' | 'endsAt' | 'publishedAt'>>
}
