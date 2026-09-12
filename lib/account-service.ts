import { User } from 'firebase/auth'
import { get, push, ref, remove, runTransaction, set, update } from 'firebase/database'
import { auth, database } from '@/lib/firebase'
import {
  AccountNotification,
  AccountSettings,
  DEFAULT_PRIVACY,
  DirectoryProfile,
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

function withoutUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutUndefined) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, withoutUndefined(entry)]),
    ) as T
  }
  return value
}

export function normalizePublicProfile(profile: PublicProfile): PublicProfile {
  return {
    ...profile,
    favoriteGenres: Array.isArray(profile.favoriteGenres) ? profile.favoriteGenres : [],
    bio: typeof profile.bio === 'string' ? profile.bio : '',
    isPublic: profile.isPublic !== false,
    showRecentMovies: profile.showRecentMovies === true,
    showWatchlist: profile.showWatchlist !== false,
    showActivity: profile.showActivity !== false,
    allowWatchPartyInvites: profile.allowWatchPartyInvites !== false,
    allowTasteDiscovery: profile.allowTasteDiscovery === true,
  }
}

function requireDatabase() {
  if (!database) throw new Error('Dịch vụ tài khoản chưa được cấu hình.')
  return database
}

async function communityRequest<T>(url: string, init: RequestInit): Promise<T> {
  const currentUser = auth?.currentUser
  if (!currentUser) throw new Error('Bạn cần đăng nhập để tương tác với cộng đồng.')
  const token = await currentUser.getIdToken()
  const response = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) } })
  const payload = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(payload.error || 'Không thể cập nhật cộng đồng.')
  return payload
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
    allowTasteDiscovery: false,
  }
}

export async function ensureAccountProfile(user: User, preferredDisplayName?: string) {
  const db = requireDatabase()
  const snapshot = await get(ref(db, `publicProfiles/${user.uid}`))
  if (snapshot.exists()) {
    const existing = normalizePublicProfile(snapshot.val() as PublicProfile)
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
    [`users/${user.uid}/settings`]: { privacy: DEFAULT_PRIVACY, emailNotifications: true, personalizationEnabled: true, updatedAt: now },
  })
  return profile
}

export async function usernameAvailable(username: string, currentUid?: string) {
  if (!usernameIsValid(username)) return false
  if (!auth?.currentUser || !currentUid) return false
  const token = await auth.currentUser.getIdToken()
  const response = await fetch(`/api/public/profiles/lookup?username=${encodeURIComponent(username)}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  if (!response.ok) return false
  const payload = await response.json() as { profile?: PublicProfile | null }
  return !payload.profile || payload.profile.uid === currentUid
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
    favoriteGenres: (Array.isArray(next.favoriteGenres) ? next.favoriteGenres : []).slice(0, 8),
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
  const currentUser = auth?.currentUser
  const token = currentUser ? await currentUser.getIdToken() : null
  const response = await fetch(`/api/public/profiles/${encodeURIComponent(normalizeUsername(username))}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined, cache: 'no-store' })
  if (!response.ok) return null
  const payload = await response.json() as { private?: boolean; profile?: PublicProfile }
  return payload.private ? null : payload.profile ? normalizePublicProfile(payload.profile) : null
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
    [`publicProfiles/${uid}/allowTasteDiscovery`]: settings.privacy.allowTasteDiscovery,
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
  await set(activityRef, withoutUndefined({ ...activity, id, createdAt: Date.now() }))
}

export async function saveReview(profile: PublicProfile, input: Pick<SocialReview, 'movieSlug' | 'movieTitle' | 'poster' | 'rating' | 'content' | 'spoiler'>) {
  const content = input.content.trim().slice(0, 1200)
  if (content.length < 3) throw new Error('Đánh giá cần ít nhất 3 ký tự.')
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 10) throw new Error('Điểm đánh giá phải từ 1 đến 10.')
  return communityRequest<SocialReview>('/api/community/reviews', { method: 'POST', body: JSON.stringify({ ...input, content }) })
}

export async function deleteReview(uid: string, movieSlug: string) {
  await communityRequest(`/api/community/reviews/${encodeURIComponent(movieSlug)}`, { method: 'DELETE' })
}

export async function deleteReviewReply(actorUid: string, review: SocialReview, reply: ReviewReply) {
  if (actorUid !== reply.authorUid && actorUid !== review.authorUid) throw new Error('Bạn không có quyền xóa bình luận này.')
  await communityRequest(`/api/community/reviews/${encodeURIComponent(review.movieSlug)}/${encodeURIComponent(review.authorUid)}/replies/${encodeURIComponent(reply.id)}`, { method: 'DELETE' })
}

export async function toggleFollow(actor: PublicProfile, target: PublicProfile, following: boolean) {
  await communityRequest(`/api/community/follow/${encodeURIComponent(target.uid)}`, { method: 'PUT', body: JSON.stringify({ following }) })
}

const relationshipRecord = (profile: DirectoryProfile): FriendshipRecord => ({ uid: profile.uid, displayName: profile.displayName, username: profile.username, ...(profile.avatar ? { avatar: profile.avatar } : {}), createdAt: Date.now() })

export async function sendFriendRequest(actor: PublicProfile, target: DirectoryProfile) {
  if (actor.uid === target.uid) throw new Error('Bạn không thể tự kết bạn với chính mình.')
  const db = requireDatabase()
  const request = relationshipRecord(actor); const sent = relationshipRecord(target)
  await update(ref(db), {
    [`friendRequests/${target.uid}/${actor.uid}`]: request,
    [`sentFriendRequests/${actor.uid}/${target.uid}`]: sent,
  })
  const notificationRef = push(ref(db, `notifications/${target.uid}`))
  await set(notificationRef, { id: notificationRef.key, type: 'friend_request', actorUid: actor.uid, actorName: actor.displayName, actorUsername: actor.username, actorAvatar: actor.avatar || null, read: false, createdAt: Date.now() }).catch(() => undefined)
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
  }
  await update(ref(db), updates)
  if (accept) {
    const notificationRef = push(ref(db, `notifications/${requester.uid}`))
    await set(notificationRef, { id: notificationRef.key, type: 'friend_accepted', actorUid: actor.uid, actorName: actor.displayName, actorUsername: actor.username, actorAvatar: actor.avatar || null, read: false, createdAt: Date.now() }).catch(() => undefined)
  }
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
  await communityRequest(`/api/community/reviews/${encodeURIComponent(review.movieSlug)}/${encodeURIComponent(review.authorUid)}/like`, { method: 'PUT', body: JSON.stringify({ liked }) })
}

export async function addReviewReply(actor: PublicProfile, review: SocialReview, content: string) {
  return communityRequest<ReviewReply>(`/api/community/reviews/${encodeURIComponent(review.movieSlug)}/${encodeURIComponent(review.authorUid)}/replies`, { method: 'POST', body: JSON.stringify({ content }) })
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
