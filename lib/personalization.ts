import type { Movie } from '@/lib/api'

export type RecommendationReasonCode = 'because_genre_affinity' | 'because_completed_similar' | 'because_watchlist' | 'trending_fallback' | 'editorial_pick'

export interface UserPersonalizationFeatures {
  uid: string
  enabled: boolean
  eligible: boolean
  qualifiedTitles: number
  activeSeconds: number
  genreAffinity: Record<string, number>
  completionRate: number
  preferredTimeBands: Record<'morning' | 'afternoon' | 'evening' | 'night', number>
  computedAt: number
  windowDays: 180
}

export interface PersonalizedRecommendation {
  movie: Movie
  score: number
  reasonCode: RecommendationReasonCode
  reason: string
  exploration: boolean
}

export type RecommendationEventType = 'impression' | 'click' | 'qualified_play' | 'completion' | 'dismiss'

export interface RecommendationEventInput {
  type: RecommendationEventType
  movieSlug: string
  reasonCode: RecommendationReasonCode
}
