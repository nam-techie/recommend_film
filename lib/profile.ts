import type { AccountPlan } from '@/lib/monetization'

export const PROFILE_GENRES = [
  'Hành động', 'Tình cảm', 'Hài', 'Kinh dị', 'Khoa học viễn tưởng', 'Hoạt hình',
  'Tâm lý', 'Hình sự', 'Phiêu lưu', 'Cổ trang', 'Tài liệu', 'Gia đình',
] as const

export type ProfileMediaKind = 'avatar' | 'cover'
export type ShareCardRange = '30d' | '90d'
export type ShareCardFormat = 'portrait' | 'story'
export type ShareCardAccent = 'fuchsia' | 'violet' | 'cyan' | 'amber'
export type ShareCardOptionalField = 'plan' | 'joinedAt' | 'favoriteGenres' | 'qualifiedViews' | 'watchHours' | 'completionRate' | 'favoriteMovies'

export interface ProfilePatchInput {
  expectedUpdatedAt: number
  displayName: string
  username: string
  bio?: string
  favoriteGenres: string[]
}

export interface ProfileMediaRecord {
  kind: ProfileMediaKind
  publicId: string
  assetId: string
  version: number
  deliveryType: 'upload' | 'authenticated'
  width: number
  height: number
  bytes: number
  format: 'webp'
  updatedAt: number
}

export interface ShareCardMovie {
  movieSlug: string
  title: string
  poster?: string
}

export interface ShareCardContext {
  profile: { displayName: string; username: string; avatar?: string; createdAt: number; favoriteGenres: string[] }
  plan: AccountPlan
  range: ShareCardRange
  analytics: { available: boolean; collectedFrom: number | null; qualifiedViews: number; watchHours: number; completionRate: number }
  favoriteMovies: ShareCardMovie[]
  mediaUploadEnabled: boolean
}

export interface ShareCardRenderInput {
  range: ShareCardRange
  format: ShareCardFormat
  accent: ShareCardAccent
  fields: ShareCardOptionalField[]
  favoriteMovieSlugs?: string[]
}
