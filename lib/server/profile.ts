import 'server-only'

import { getAuth } from 'firebase-admin/auth'
import { getDatabase } from 'firebase-admin/database'
import type { DecodedIdToken } from 'firebase-admin/auth'
import { getFirebaseAdminApp, AdminAccessError } from '@/lib/server/firebase-admin'
import { getUserEntitlement } from '@/lib/server/monetization'
import { MonetizationError } from '@/lib/server/monetization-error'
import type { PublicProfile, SocialActivity, SocialReview, WatchlistMovie } from '@/lib/account-types'
import { type ShareCardContext, type ShareCardRange } from '@/lib/profile'
import { normalizeProfilePatch } from '@/lib/profile-validation'

export async function updateOwnProfile(uid: string, raw: unknown) {
  let input
  try { input = normalizeProfilePatch(raw) } catch (error) { throw new AdminAccessError(400, error instanceof Error ? error.message : 'Hồ sơ không hợp lệ.') }
  const db = getDatabase(getFirebaseAdminApp())
  const profileRef = db.ref(`publicProfiles/${uid}`)
  const snapshot = await profileRef.get()
  if (!snapshot.exists()) throw new AdminAccessError(404, 'Hồ sơ chưa được khởi tạo.')
  const previous = snapshot.val() as PublicProfile
  if (Number(previous.updatedAt || 0) !== input.expectedUpdatedAt) throw new AdminAccessError(409, 'Hồ sơ đã thay đổi ở nơi khác. Hãy tải lại trước khi lưu.')

  if (input.username !== previous.username) {
    const reservation = await db.ref(`usernames/${input.username}`).transaction((current) => current || uid, undefined, false)
    if (!reservation.committed || reservation.snapshot.val() !== uid) throw new AdminAccessError(409, 'Username này đã được sử dụng.')
  }

  const updatedAt = Date.now()
  const next: PublicProfile = { ...previous, displayName: input.displayName, username: input.username, bio: input.bio, favoriteGenres: input.favoriteGenres, updatedAt }
  const updates: Record<string, unknown> = {
    [`publicProfiles/${uid}`]: next,
    [`usernames/${input.username}`]: uid,
  }
  if (input.username !== previous.username) updates[`usernames/${previous.username}`] = null
  try {
    await db.ref().update(updates)
  } catch (error) {
    if (input.username !== previous.username) await db.ref(`usernames/${input.username}`).transaction((current) => current === uid ? null : current, undefined, false).catch(() => undefined)
    throw error
  }
  await getAuth(getFirebaseAdminApp()).updateUser(uid, { displayName: next.displayName, photoURL: next.avatar || undefined }).catch(() => undefined)
  return next
}

export async function readPublicProfileProjection(username: string, viewerUid?: string) {
  const db = getDatabase(getFirebaseAdminApp())
  const normalized = username.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24)
  const uidSnapshot = await db.ref(`usernames/${normalized}`).get()
  if (!uidSnapshot.exists()) return null
  const uid = String(uidSnapshot.val())
  const profileSnapshot = await db.ref(`publicProfiles/${uid}`).get()
  if (!profileSnapshot.exists()) return null
  const profile = profileSnapshot.val() as PublicProfile
  const owner = uid === viewerUid
  if (!profile.isPublic && !owner) {
    return { private: true, profile: { uid, username: profile.username, displayName: profile.displayName, avatar: profile.avatar } }
  }

  const [followers, following, watchlist, recent, activities, reviews, membership, viewerFollowing] = await Promise.all([
    db.ref(`followers/${uid}`).get(), db.ref(`following/${uid}`).get(),
    profile.showWatchlist || owner ? db.ref(`publicWatchlists/${uid}`).get() : null,
    profile.showRecentMovies || owner ? db.ref(`publicRecent/${uid}`).get() : null,
    profile.showActivity || owner ? db.ref(`activities/${uid}`).get() : null,
    db.ref('reviews').get(), getUserEntitlement(uid), viewerUid && viewerUid !== uid ? db.ref(`following/${viewerUid}/${uid}`).get() : null,
  ])
  const allReviews = reviews?.val() || {}
  const ownReviews = Object.values(allReviews as Record<string, Record<string, SocialReview>>)
    .flatMap((rows) => Object.values(rows || {})).filter((review) => review.authorUid === uid).sort((a, b) => b.updatedAt - a.updatedAt)
  return {
    private: false,
    owner,
    profile,
    membershipPlan: membership.plan,
    viewerFollowing: Boolean(viewerFollowing?.val()),
    counts: { followers: Object.keys(followers.val() || {}).length, following: Object.keys(following.val() || {}).length },
    watchlist: Object.values((watchlist?.val() || {}) as Record<string, WatchlistMovie>).sort((a, b) => b.updatedAt - a.updatedAt),
    recent: Object.values((recent?.val() || {}) as Record<string, { updatedAt: number }>).sort((a, b) => b.updatedAt - a.updatedAt),
    activities: Object.values((activities?.val() || {}) as Record<string, SocialActivity>).sort((a, b) => b.createdAt - a.createdAt),
    reviews: ownReviews,
  }
}

function dayKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

export async function getOwnShareCardContext(uid: string, range: ShareCardRange): Promise<ShareCardContext> {
  const entitlement = await getUserEntitlement(uid)
  if (entitlement.plan !== 'ultra') throw new MonetizationError('ULTRA_REQUIRED', 'Studio thẻ điện ảnh dành riêng cho CinePass Ultra.', 403)
  const db = getDatabase(getFirebaseAdminApp())
  const [profileSnapshot, watchlistSnapshot, aggregateSnapshot, progressSnapshot] = await Promise.all([
    db.ref(`publicProfiles/${uid}`).get(), db.ref(`watchlists/${uid}`).get(), db.ref(`analytics/aggregates/userDaily/${uid}`).get(),
    db.ref(`users/${uid}/watchProgressV2`).get(),
  ])
  if (!profileSnapshot.exists()) throw new AdminAccessError(404, 'Hồ sơ chưa được khởi tạo.')
  const profile = profileSnapshot.val() as PublicProfile
  const days = range === '90d' ? 90 : 30
  const start = new Date(Date.now() - (days - 1) * 86_400_000)
  const startKey = dayKey(start)
  const rowEntries = Object.entries((aggregateSnapshot.val() || {}) as Record<string, { qualifiedViews?: number; activeSeconds?: number; completedViews?: number }>)
    .filter(([key, value]) => key >= startKey && key <= dayKey(new Date()) && value && typeof value === 'object')
  const rows = rowEntries.map(([, value]) => value)
  const qualifiedViews = rows.reduce((sum, row) => sum + Number(row.qualifiedViews || 0), 0)
  const activeSeconds = rows.reduce((sum, row) => sum + Math.max(0, Number(row.activeSeconds) || 0), 0)
  const completedViews = rows.reduce((sum, row) => sum + Number(row.completedViews || 0), 0)
  const oldestDayKey = rowEntries.map(([key]) => key).sort()[0]
  const collectedFrom = oldestDayKey ? new Date(`${oldestDayKey}T00:00:00+07:00`).getTime() : null
  const progressMovies = Object.values((progressSnapshot.val() || {}) as Record<string, {
    resume?: { secondsWatched?: number }
    episodes?: Record<string, { secondsWatched?: number }>
  }>).filter((movie) => movie && typeof movie === 'object')
  const moviesOpened = progressMovies.filter((movie) => Boolean(movie.resume)).length
  const progressEpisodes = progressMovies.flatMap((movie) => Object.values(movie.episodes || {}))
  const episodesWatched = progressEpisodes.length
  const estimatedSeconds = progressEpisodes.reduce((sum, episode) => sum + Math.max(0, Number(episode.secondsWatched) || 0), 0)
  const hasVerifiedAnalytics = activeSeconds > 0 || qualifiedViews > 0
  const hasLegacyResume = moviesOpened > 0 || episodesWatched > 0 || estimatedSeconds > 0
  const verifiedWatchHours = activeSeconds / 3600
  const legacyWatchHours = estimatedSeconds / 3600
  const favorites = Object.values((watchlistSnapshot.val() || {}) as Record<string, WatchlistMovie>)
    .filter((movie) => movie.favorite === true || movie.status === 'favorite').sort((a, b) => b.updatedAt - a.updatedAt)
    .map((movie) => ({ movieSlug: movie.movieSlug, title: movie.title, ...(movie.poster ? { poster: movie.poster } : {}) }))
  return {
    profile: { displayName: profile.displayName, username: profile.username, ...(profile.avatar ? { avatar: profile.avatar } : {}), createdAt: profile.createdAt, favoriteGenres: profile.favoriteGenres || [] },
    plan: entitlement.plan,
    range,
    analytics: { available: hasVerifiedAnalytics, collectedFrom, qualifiedViews, watchHours: verifiedWatchHours, completionRate: qualifiedViews ? completedViews / qualifiedViews * 100 : 0 },
    activity: {
      moviesOpened,
      episodesWatched,
      watchHours: hasVerifiedAnalytics ? verifiedWatchHours : legacyWatchHours,
      source: hasVerifiedAnalytics ? 'verified' : hasLegacyResume ? 'legacy_resume' : 'none',
    },
    favoriteMovies: favorites,
    mediaUploadEnabled: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
  }
}

export function assertVerifiedMember(identity: DecodedIdToken) {
  if (identity.firebase?.sign_in_provider === 'anonymous') throw new AdminAccessError(403, 'Tài khoản khách không thể cập nhật hồ sơ.')
}
