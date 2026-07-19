import { User } from 'firebase/auth'
import { get, push, ref, remove, runTransaction, set, update } from 'firebase/database'
import { database } from '@/lib/firebase'
import {
  AccountNotification,
  AccountSettings,
  DEFAULT_PRIVACY,
  FriendRequest,
  FriendshipRecord,
  LibraryWatchStatus,
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

export async function ensureAccountProfile(user: User, preferredDisplayName?: string) {
  const db = requireDatabase()
  const snapshot = await get(ref(db, `publicProfiles/${user.uid}`))
  if (snapshot.exists()) {
    const existing = snapshot.val() as PublicProfile
    const nextDisplayName = preferredDisplayName?.trim().slice(0, 40)
    if (nextDisplayName && existing.displayName !== nextDisplayName && Date.now() - existing.createdAt < 60_000) {
      const updated = { ...existing, displayName: nextDisplayName, updatedAt: Date.now() }
      await set(ref(db, `publicProfiles/${user.uid}`), updated)
      return updated
    }
    return existing
  }
  const now = Date.now()
  const profile = profileFromAuthUser(user)
  if (preferredDisplayName?.trim()) profile.displayName = preferredDisplayName.trim().slice(0, 40)
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

export function normalizeLibraryItem(item: WatchlistMovie): WatchlistMovie {
  return {
    ...item,
    favorite: item.favorite ?? item.status === 'favorite',
    watchLater: item.watchLater ?? item.status === 'planned',
    watchStatus: item.watchStatus ?? (item.status === 'watching' || item.status === 'completed' ? item.status : null),
  }
}

export async function updateMovieLibrary(uid: string, movie: Omit<WatchlistMovie, 'status' | 'favorite' | 'watchLater' | 'watchStatus' | 'addedAt' | 'updatedAt'>, patch: { favorite?: boolean; watchLater?: boolean; watchStatus?: LibraryWatchStatus }) {
  const db = requireDatabase(); const movieRef = ref(db, `watchlists/${uid}/${movie.movieSlug}`); const snapshot = await get(movieRef); const now = Date.now()
  const previous = snapshot.exists() ? normalizeLibraryItem(snapshot.val() as WatchlistMovie) : null
  const favorite = patch.favorite ?? previous?.favorite ?? false
  const watchLater = patch.watchLater ?? previous?.watchLater ?? false
  const watchStatus = patch.watchStatus !== undefined ? patch.watchStatus : previous?.watchStatus ?? null
  if (!favorite && !watchLater && !watchStatus) { await remove(movieRef); return null }
  const status: WatchlistStatus = watchStatus || (favorite ? 'favorite' : 'planned')
  const value: WatchlistMovie = { ...movie, status, favorite, watchLater, watchStatus, addedAt: previous?.addedAt || now, updatedAt: now }
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
  const content = input.content.trim().slice(0, 1200)
  if (content.length < 3) throw new Error('Đánh giá cần ít nhất 3 ký tự.')
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 10) throw new Error('Điểm đánh giá phải từ 1 đến 10.')
  const db = requireDatabase(); const now = Date.now(); const reviewRef = ref(db, `reviews/${input.movieSlug}/${profile.uid}`); const old = await get(reviewRef)
  const review: SocialReview = {
    id: `${input.movieSlug}:${profile.uid}`,
    ...input,
    content,
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

const relationshipRecord = (profile: PublicProfile): FriendshipRecord => ({ uid: profile.uid, displayName: profile.displayName, username: profile.username, ...(profile.avatar ? { avatar: profile.avatar } : {}), createdAt: Date.now() })

export async function sendFriendRequest(actor: PublicProfile, target: PublicProfile) {
  if (actor.uid === target.uid) throw new Error('Bạn không thể tự kết bạn với chính mình.')
  const db = requireDatabase(); const blocked = await get(ref(db, `blocks/${target.uid}/${actor.uid}`)); if (blocked.exists()) throw new Error('Không thể gửi lời mời tới người dùng này.')
  const request = relationshipRecord(actor); const sent = relationshipRecord(target)
  const notificationRef = push(ref(db, `notifications/${target.uid}`))
  await update(ref(db), {
    [`friendRequests/${target.uid}/${actor.uid}`]: request,
    [`sentFriendRequests/${actor.uid}/${target.uid}`]: sent,
    [`notifications/${target.uid}/${notificationRef.key}`]: { id: notificationRef.key, type: 'friend_request', actorUid: actor.uid, actorName: actor.displayName, actorUsername: actor.username, actorAvatar: actor.avatar || null, read: false, createdAt: Date.now() },
  })
}

export async function cancelFriendRequest(actorUid: string, targetUid: string) {
  await update(ref(requireDatabase()), { [`friendRequests/${targetUid}/${actorUid}`]: null, [`sentFriendRequests/${actorUid}/${targetUid}`]: null })
}

export async function respondFriendRequest(actor: PublicProfile, requester: FriendRequest, accept: boolean) {
  const db = requireDatabase(); const updates: Record<string, unknown> = { [`friendRequests/${actor.uid}/${requester.uid}`]: null, [`sentFriendRequests/${requester.uid}/${actor.uid}`]: null }
  if (accept) {
    const now = Date.now()
    updates[`friendships/${actor.uid}/${requester.uid}`] = { ...requester, createdAt: now }
    updates[`friendships/${requester.uid}/${actor.uid}`] = { ...relationshipRecord(actor), createdAt: now }
    const notificationRef = push(ref(db, `notifications/${requester.uid}`))
    updates[`notifications/${requester.uid}/${notificationRef.key}`] = { id: notificationRef.key, type: 'friend_accepted', actorUid: actor.uid, actorName: actor.displayName, actorUsername: actor.username, actorAvatar: actor.avatar || null, read: false, createdAt: now }
  }
  await update(ref(db), updates)
}

export async function removeFriend(actorUid: string, friendUid: string) {
  await update(ref(requireDatabase()), { [`friendships/${actorUid}/${friendUid}`]: null, [`friendships/${friendUid}/${actorUid}`]: null })
}

export async function setUserBlocked(actorUid: string, targetUid: string, blocked: boolean) {
  await update(ref(requireDatabase()), {
    [`blocks/${actorUid}/${targetUid}`]: blocked || null,
    [`friendships/${actorUid}/${targetUid}`]: null,
    [`friendships/${targetUid}/${actorUid}`]: null,
    [`friendRequests/${actorUid}/${targetUid}`]: null,
    [`friendRequests/${targetUid}/${actorUid}`]: null,
    [`sentFriendRequests/${actorUid}/${targetUid}`]: null,
    [`sentFriendRequests/${targetUid}/${actorUid}`]: null,
  })
}

export async function toggleReviewLike(actor: PublicProfile, review: SocialReview, liked: boolean) {
  const db = requireDatabase(); await set(ref(db, `reviewLikes/${review.movieSlug}/${review.authorUid}/${actor.uid}`), liked || null)
  if (liked && actor.uid !== review.authorUid) {
    const notificationRef = push(ref(db, `notifications/${review.authorUid}`))
    await set(notificationRef, { id: notificationRef.key!, type: 'review_like', actorUid: actor.uid, actorName: actor.displayName, actorUsername: actor.username, actorAvatar: actor.avatar || null, movieSlug: review.movieSlug, reviewId: review.id, read: false, createdAt: Date.now() }).catch(() => undefined)
  }
}

export async function addReviewReply(actor: PublicProfile, review: SocialReview, content: string) {
  const db = requireDatabase(); const replyRef = push(ref(db, `reviewReplies/${review.movieSlug}/${review.authorUid}`)); const reply: ReviewReply = { id: replyRef.key!, authorUid: actor.uid, authorName: actor.displayName, authorUsername: actor.username, ...(actor.avatar ? { authorAvatar: actor.avatar } : {}), content: content.trim().slice(0, 300), createdAt: Date.now() }
  await set(replyRef, reply)
  if (actor.uid !== review.authorUid) {
    const notificationRef = push(ref(db, `notifications/${review.authorUid}`))
    await set(notificationRef, { id: notificationRef.key!, type: 'review_reply', actorUid: actor.uid, actorName: actor.displayName, actorUsername: actor.username, actorAvatar: actor.avatar || null, movieSlug: review.movieSlug, reviewId: review.id, read: false, createdAt: Date.now() }).catch(() => undefined)
  }
  return reply
}

export async function deleteAccountData(profile: PublicProfile) {
  const db = requireDatabase()
  const [followingSnapshot, followersSnapshot, friendsSnapshot, reviewsSnapshot] = await Promise.all([get(ref(db, `following/${profile.uid}`)), get(ref(db, `followers/${profile.uid}`)), get(ref(db, `friendships/${profile.uid}`)), get(ref(db, 'reviews'))])
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
    [`friendships/${profile.uid}`]: null,
    [`friendRequests/${profile.uid}`]: null,
    [`sentFriendRequests/${profile.uid}`]: null,
    [`blocks/${profile.uid}`]: null,
    [`presenceConnections/${profile.uid}`]: null,
    [`presenceLastSeen/${profile.uid}`]: null,
  }
  Object.keys(followingSnapshot.val() || {}).forEach((targetUid) => { updates[`followers/${targetUid}/${profile.uid}`] = null })
  Object.keys(followersSnapshot.val() || {}).forEach((followerUid) => { updates[`following/${followerUid}/${profile.uid}`] = null })
  Object.keys(friendsSnapshot.val() || {}).forEach((friendUid) => { updates[`friendships/${friendUid}/${profile.uid}`] = null })
  Object.entries(reviewsSnapshot.val() || {}).forEach(([movieSlug, movieReviews]) => { if ((movieReviews as Record<string, unknown>)[profile.uid]) { updates[`reviews/${movieSlug}/${profile.uid}`] = null; updates[`reviewLikes/${movieSlug}/${profile.uid}`] = null; updates[`reviewReplies/${movieSlug}/${profile.uid}`] = null } })
  await update(ref(db), updates)
}
