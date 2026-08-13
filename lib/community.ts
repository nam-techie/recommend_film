import type { DirectoryProfile, SocialActivity, SocialReview } from '@/lib/account-types'

export type CommunityFeedTab = 'following' | 'trending'
export type CommunityContentState = 'published' | 'hidden' | 'removed'
export type ModerationStatus = 'open' | 'in_review' | 'resolved' | 'dismissed'

export interface CommunityFeedItem {
  id: string
  kind: 'review' | 'activity'
  createdAt: number
  review?: SocialReview
  activity?: SocialActivity
}

export interface CommunityFeedResponse {
  generatedAt: number
  tab: CommunityFeedTab
  items: CommunityFeedItem[]
  tasteMatches: Array<DirectoryProfile & { sharedGenres: string[] }>
}

export interface ModerationCase {
  id: string
  reporterUid: string
  targetUid?: string
  targetType: 'profile' | 'review' | 'reply' | 'activity'
  targetId?: string
  movieSlug?: string
  reason: string
  details?: string
  status: ModerationStatus
  createdAt: number
  updatedAt: number
  assignedTo?: string
  resolution?: string
  evidence?: unknown
}
