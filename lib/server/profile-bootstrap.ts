import 'server-only'

import { getAuth, type DecodedIdToken } from 'firebase-admin/auth'
import { getDatabase } from 'firebase-admin/database'
import { AdminAccessError, getFirebaseAdminApp } from '@/lib/server/firebase-admin'
import { DEFAULT_PRIVACY, type AccountSettings, type PublicProfile } from '@/lib/account-types'

function cleanUsername(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 16) || 'member'
}

export async function ensureServerProfile(identity: DecodedIdToken) {
  const db = getDatabase(getFirebaseAdminApp())
  const existing = await db.ref(`publicProfiles/${identity.uid}`).get()
  if (existing.exists()) return existing.val() as PublicProfile
  const user = await getAuth(getFirebaseAdminApp()).getUser(identity.uid)
  const now = Date.now()
  const base = cleanUsername(user.displayName || user.email?.split('@')[0] || 'member')
  let username = `${base}_${identity.uid.slice(0, 5).toLowerCase()}`.slice(0, 24)
  let reserved = await db.ref(`usernames/${username}`).transaction((current) => current || identity.uid, undefined, false)
  if (!reserved.committed || reserved.snapshot.val() !== identity.uid) {
    username = `member_${identity.uid.slice(0, 10).toLowerCase()}`
    reserved = await db.ref(`usernames/${username}`).transaction((current) => current || identity.uid, undefined, false)
    if (!reserved.committed || reserved.snapshot.val() !== identity.uid) throw new AdminAccessError(409, 'Không thể tạo username duy nhất.')
  }
  const createdAt = user.metadata.creationTime ? Date.parse(user.metadata.creationTime) : now
  const profile: PublicProfile = {
    uid: identity.uid,
    username,
    displayName: user.displayName || user.email?.split('@')[0] || 'Thành viên',
    ...(user.photoURL ? { avatar: user.photoURL } : {}),
    bio: '', favoriteGenres: [], createdAt: Number.isFinite(createdAt) ? createdAt : now, updatedAt: now,
    isPublic: true, showRecentMovies: false, showWatchlist: true, showActivity: true, allowWatchPartyInvites: true, allowTasteDiscovery: false,
  }
  await db.ref().update({
    [`publicProfiles/${identity.uid}`]: profile,
    [`usernames/${username}`]: identity.uid,
    [`users/${identity.uid}/settings`]: { privacy: DEFAULT_PRIVACY, emailNotifications: true, personalizationEnabled: true, updatedAt: now },
  })
  return profile
}

export async function updateServerSettings(uid: string, raw: unknown) {
  const db = getDatabase(getFirebaseAdminApp())
  const input = (raw || {}) as Partial<AccountSettings>
  const privacy = { ...DEFAULT_PRIVACY, ...(input.privacy || {}) }
  for (const [key, value] of Object.entries(privacy)) if (typeof value !== 'boolean') throw new AdminAccessError(400, `Thiết lập ${key} không hợp lệ.`)
  const settings: AccountSettings = { privacy, emailNotifications: input.emailNotifications !== false, personalizationEnabled: input.personalizationEnabled !== false, updatedAt: Date.now() }
  const updates: Record<string, unknown> = {
    [`users/${uid}/settings`]: settings,
    [`publicProfiles/${uid}/isPublic`]: privacy.profilePublic,
    [`publicProfiles/${uid}/showRecentMovies`]: privacy.showRecentMovies,
    [`publicProfiles/${uid}/showWatchlist`]: privacy.showWatchlist,
    [`publicProfiles/${uid}/showActivity`]: privacy.showActivity,
    [`publicProfiles/${uid}/allowWatchPartyInvites`]: privacy.allowWatchPartyInvites,
    [`publicProfiles/${uid}/allowTasteDiscovery`]: privacy.allowTasteDiscovery,
    [`publicProfiles/${uid}/updatedAt`]: settings.updatedAt,
  }
  if (!privacy.showWatchlist) updates[`publicWatchlists/${uid}`] = null
  if (!privacy.showRecentMovies) updates[`publicRecent/${uid}`] = null
  await db.ref().update(updates)
  return settings
}
