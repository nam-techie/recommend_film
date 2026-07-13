export type WatchlistStatus = 'planned' | 'watching' | 'completed' | 'favorite'

export interface PublicProfile {
  uid: string
  username: string
  displayName: string
  avatar?: string
  cover?: string
  bio?: string
  favoriteGenres: string[]
  createdAt: number
  updatedAt: number
  isPublic: boolean
  showRecentMovies: boolean
  showWatchlist: boolean
  showActivity: boolean
  allowWatchPartyInvites: boolean
}

export interface AccountPrivacy {
  profilePublic: boolean
  showRecentMovies: boolean
  showWatchlist: boolean
  showActivity: boolean
  allowWatchPartyInvites: boolean
}

export interface AccountSettings {
  privacy: AccountPrivacy
  emailNotifications: boolean
  updatedAt: number
}

export interface WatchlistMovie {
  movieSlug: string
  title: string
  poster?: string
  year?: number
  status: WatchlistStatus
  addedAt: number
  updatedAt: number
}

export interface SocialReview {
  id: string
  movieSlug: string
  movieTitle: string
  poster?: string
  authorUid: string
  authorName: string
  authorUsername: string
  authorAvatar?: string
  rating: number
  content: string
  spoiler: boolean
  createdAt: number
  updatedAt: number
}

export interface ReviewReply {
  id: string
  authorUid: string
  authorName: string
  authorUsername: string
  authorAvatar?: string
  content: string
  createdAt: number
}

export type ActivityType = 'watchlist' | 'completed' | 'review' | 'follow'

export interface SocialActivity {
  id: string
  actorUid: string
  actorName: string
  actorUsername: string
  actorAvatar?: string
  type: ActivityType
  movieSlug?: string
  movieTitle?: string
  poster?: string
  targetUid?: string
  targetName?: string
  createdAt: number
}

export interface AccountNotification {
  id: string
  type: 'follow' | 'review_like' | 'review_reply' | 'watch_party_invite'
  actorUid: string
  actorName: string
  actorUsername?: string
  actorAvatar?: string
  movieSlug?: string
  reviewId?: string
  roomId?: string
  read: boolean
  createdAt: number
}

export const DEFAULT_PRIVACY: AccountPrivacy = {
  profilePublic: true,
  showRecentMovies: false,
  showWatchlist: true,
  showActivity: true,
  allowWatchPartyInvites: true,
}
