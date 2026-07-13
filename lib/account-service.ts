import { User } from 'firebase/auth'
import { get, push, ref, remove, runTransaction, set, update } from 'firebase/database'
import { database } from '@/lib/firebase'
import {
  AccountNotification,
  AccountSettings,
  DEFAULT_PRIVACY,
  PublicProfile,
  ReviewReply,
  SocialActivity,
  SocialReview,
  WatchlistMovie,
  WatchlistStatus,
} from '@/lib/account-types'

const cleanUsername = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24)
export const normalizeUsername = (value: string) => cleanUsername(value)
export const usernameIsValid = (value: string) => /^[a-z0-9_]{3,24}$/.test(value)

function requireDatabase() {
  if (!database) throw new Error('Dịch vụ tài khoản chưa được cấu hình.')
  return database
}

export function suggestedUsername(user: Pick<User, 'uid' | 'displayName' | 'email'>) {
  const base = cleanUsername(user.displayName || user.email?.split('@')[0] || 'member').slice(0, 16) || 'member'
  return `${base}_${user.uid.slice(0, 5).toLowerCase()}`
}

export function profileFromAuthUser(user: User): PublicProfile {
  const createdAt = user.metadata.creationTime ? Date.parse(user.metadata.creationTime) : Date.now()
  const now = Date.now()
  return {
    uid: user.uid,
    username: suggestedUsername(user),
    displayName: user.displayName || user.email?.split('@')[0] || 'Thành viên',
    ...(user.photoURL ? { avatar: user.photoURL } : {}),
    bio: '',
    favoriteGenres: [],
    createdAt: Number.isFinite(createdAt) ? createdAt : now,
    updatedAt: now,
    isPublic: true,
    showRecentMovies: false,
    showWatchlist: true,
    showActivity: true,
    allowWatchPartyInvites: true,
  }
}

export async function ensureAccountProfile(user: User) {
  const db = requireDatabase()
  const snapshot = await get(ref(db, `publicProfiles/${user.uid}`))
  if (snapshot.exists()) return snapshot.val() as PublicProfile
  const now = Date.now()
  const profile = profileFromAuthUser(user)
  const reservation = await runTransaction(ref(db, `usernames/${profile.username}`), (current) => current || user.uid, { applyLocally: false })
  if (!reservation.committed || reservation.snapshot.val() !== user.uid) {
    profile.username = `member_${user.uid.slice(0, 10).toLowerCase()}`
    const fallback = await runTransaction(ref(db, `usernames/${profile.username}`), (current) => current || user.uid, { applyLocally: false })
    if (!fallback.committed || fallback.snapshot.val() !== user.uid) throw new Error('Không thể tạo username duy nhất cho tài khoản.')
  }
  await update(ref(db), {
    [`publicProfiles/${user.uid}`]: profile,
    [`usernames/${profile.username}`]: user.uid,
    [`users/${user.uid}/settings`]: { privacy: DEFAULT_PRIVACY, emailNotifications: true, updatedAt: now },
  })
  return profile
}

export async function usernameAvailable(username: string, currentUid?: string) {
  if (!usernameIsValid(username)) return false
  const snapshot = await get(ref(requireDatabase(), `usernames/${username}`))
  return !snapshot.exists() || snapshot.val() === currentUid
}

export async function savePublicProfile(user: User, previous: PublicProfile, next: Pick<PublicProfile, 'displayName' | 'username' | 'avatar' | 'cover' | 'bio' | 'favoriteGenres' | 'isPublic'>) {
  const db = requireDatabase()
  const username = normalizeUsername(next.username)
  if (!usernameIsValid(username)) throw new Error('Username cần 3–24 ký tự, chỉ gồm chữ thường, số hoặc dấu gạch dưới.')
  if (username !== previous.username) {
    const reservation = await runTransaction(ref(db, `usernames/${username}`), (current) => current || user.uid, { applyLocally: false })
    if (!reservation.committed || reservation.snapshot.val() !== user.uid) throw new Error('Username này đã được sử dụng.')
  }
  const profile: PublicProfile = {
    ...previous,
    ...next,
    username,
    displayName: next.displayName.trim().slice(0, 40),
    bio: next.bio?.trim().slice(0, 180) || '',
    favoriteGenres: next.favoriteGenres.slice(0, 8),
    updatedAt: Date.now(),
  }
  const updates: Record<string, unknown> = {
    [`publicProfiles/${user.uid}`]: profile,
    [`usernames/${username}`]: user.uid,
  }
  if (username !== previous.username) updates[`usernames/${previous.username}`] = null
  await update(ref(db), updates)
  return profile
}

export async function getProfileByUsername(username: string) {
  const db = requireDatabase()
  const uidSnapshot = await get(ref(db, `usernames/${normalizeUsername(username)}`))
  if (!uidSnapshot.exists()) return null
  const profileSnapshot = await get(ref(db, `publicProfiles/${uidSnapshot.val()}`))
  return profileSnapshot.exists() ? profileSnapshot.val() as PublicProfile : null
}

export async function saveSettings(uid: string, settings: AccountSettings) {
  const db = requireDatabase(); const updatedAt = Date.now()
  await update(ref(db), {
    [`users/${uid}/settings`]: { ...settings, updatedAt },
    [`publicProfiles/${uid}/isPublic`]: settings.privacy.profilePublic,
    [`publicProfiles/${uid}/showRecentMovies`]: settings.privacy.showRecentMovies,
    [`publicProfiles/${uid}/showWatchlist`]: settings.privacy.showWatchlist,
    [`publicProfiles/${uid}/showActivity`]: settings.privacy.showActivity,
    [`publicProfiles/${uid}/allowWatchPartyInvites`]: settings.privacy.allowWatchPartyInvites,
  })
}

export async function setWatchlistMovie(uid: string, movie: Omit<WatchlistMovie, 'status' | 'addedAt' | 'updatedAt'>, status: WatchlistStatus) {
  const db = requireDatabase(); const now = Date.now(); const movieRef = ref(db, `watchlists/${uid}/${movie.movieSlug}`)
  const previous = await get(movieRef)
  const value: WatchlistMovie = { ...movie, status, addedAt: previous.val()?.addedAt || now, updatedAt: now }
  await set(movieRef, value)
  return value
}

export async function removeWatchlistMovie(uid: string, movieSlug: string) {
  await remove(ref(requireDatabase(), `watchlists/${uid}/${movieSlug}`))
}

export async function writeActivity(uid: string, activity: Omit<SocialActivity, 'id' | 'createdAt'>) {
  const db = requireDatabase(); const activityRef = push(ref(db, `activities/${uid}`)); const id = activityRef.key!
  await set(activityRef, { ...activity, id, createdAt: Date.now() })
}

export async function saveReview(profile: PublicProfile, input: Pick<SocialReview, 'movieSlug' | 'movieTitle' | 'poster' | 'rating' | 'content' | 'spoiler'>) {
  const db = requireDatabase(); const now = Date.now(); const reviewRef = ref(db, `reviews/${input.movieSlug}/${profile.uid}`); const old = await get(reviewRef)
  const review: SocialReview = {
    id: `${input.movieSlug}:${profile.uid}`,
    ...input,
    authorUid: profile.uid,
    authorName: profile.displayName,
    authorUsername: profile.username,
    ...(profile.avatar ? { authorAvatar: profile.avatar } : {}),
    createdAt: old.val()?.createdAt || now,
    updatedAt: now,
  }
  await set(reviewRef, review)
  return review
}

export async function toggleFollow(actor: PublicProfile, target: PublicProfile, following: boolean) {
  const db = requireDatabase()
  await update(ref(db), {
    [`following/${actor.uid}/${target.uid}`]: following || null,
    [`followers/${target.uid}/${actor.uid}`]: following || null,
  })
  if (following) {
    const notificationRef = push(ref(db, `notifications/${target.uid}`))
    const notification: AccountNotification = { id: notificationRef.key!, type: 'follow', actorUid: actor.uid, actorName: actor.displayName, actorUsername: actor.username, ...(actor.avatar ? { actorAvatar: actor.avatar } : {}), read: false, createdAt: Date.now() }
    await set(notificationRef, notification)
    await writeActivity(actor.uid, { actorUid: actor.uid, actorName: actor.displayName, actorUsername: actor.username, actorAvatar: actor.avatar, type: 'follow', targetUid: target.uid, targetName: target.displayName })
  }
}

export async function toggleReviewLike(actor: PublicProfile, review: SocialReview, liked: boolean) {
  const db = requireDatabase(); await set(ref(db, `reviewLikes/${review.movieSlug}/${review.authorUid}/${actor.uid}`), liked || null)
  if (liked && actor.uid !== review.authorUid) {
    const notificationRef = push(ref(db, `notifications/${review.authorUid}`))
    await set(notificationRef, { id: notificationRef.key!, type: 'review_like', actorUid: actor.uid, actorName: actor.displayName, actorUsername: actor.username, actorAvatar: actor.avatar || null, movieSlug: review.movieSlug, reviewId: review.id, read: false, createdAt: Date.now() })
  }
}

export async function addReviewReply(actor: PublicProfile, review: SocialReview, content: string) {
  const db = requireDatabase(); const replyRef = push(ref(db, `reviewReplies/${review.movieSlug}/${review.authorUid}`)); const reply: ReviewReply = { id: replyRef.key!, authorUid: actor.uid, authorName: actor.displayName, authorUsername: actor.username, ...(actor.avatar ? { authorAvatar: actor.avatar } : {}), content: content.trim().slice(0, 300), createdAt: Date.now() }
  await set(replyRef, reply)
  if (actor.uid !== review.authorUid) {
    const notificationRef = push(ref(db, `notifications/${review.authorUid}`))
    await set(notificationRef, { id: notificationRef.key!, type: 'review_reply', actorUid: actor.uid, actorName: actor.displayName, actorUsername: actor.username, actorAvatar: actor.avatar || null, movieSlug: review.movieSlug, reviewId: review.id, read: false, createdAt: Date.now() })
  }
  return reply
}

export async function deleteAccountData(profile: PublicProfile) {
  const db = requireDatabase()
  const [followingSnapshot, followersSnapshot, reviewsSnapshot] = await Promise.all([get(ref(db, `following/${profile.uid}`)), get(ref(db, `followers/${profile.uid}`)), get(ref(db, 'reviews'))])
  const updates: Record<string, null> = {
    [`users/${profile.uid}`]: null,
    [`publicProfiles/${profile.uid}`]: null,
    [`usernames/${profile.username}`]: null,
    [`watchlists/${profile.uid}`]: null,
    [`publicWatchlists/${profile.uid}`]: null,
    [`publicRecent/${profile.uid}`]: null,
    [`following/${profile.uid}`]: null,
    [`followers/${profile.uid}`]: null,
    [`activities/${profile.uid}`]: null,
    [`notifications/${profile.uid}`]: null,
  }
  Object.keys(followingSnapshot.val() || {}).forEach((targetUid) => { updates[`followers/${targetUid}/${profile.uid}`] = null })
  Object.keys(followersSnapshot.val() || {}).forEach((followerUid) => { updates[`following/${followerUid}/${profile.uid}`] = null })
  Object.entries(reviewsSnapshot.val() || {}).forEach(([movieSlug, movieReviews]) => { if ((movieReviews as Record<string, unknown>)[profile.uid]) { updates[`reviews/${movieSlug}/${profile.uid}`] = null; updates[`reviewLikes/${movieSlug}/${profile.uid}`] = null; updates[`reviewReplies/${movieSlug}/${profile.uid}`] = null } })
  await update(ref(db), updates)
}
