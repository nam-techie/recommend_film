'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { onDisconnect, onValue, ref, serverTimestamp, set, update } from 'firebase/database'
import { useAuth } from '@/components/auth/AuthProvider'
import { AccountNotification, AccountSettings, DEFAULT_PRIVACY, FriendPresence, FriendRequest, FriendshipRecord, LibraryWatchStatus, PublicProfile, WatchlistMovie, WatchlistStatus } from '@/lib/account-types'
import { database } from '@/lib/firebase'
import { cancelFriendRequest, ensureAccountProfile, normalizeLibraryItem, profileFromAuthUser, removeFriend, removeWatchlistMovie, respondFriendRequest, saveSettings, sendFriendRequest, setUserBlocked, setWatchlistMovie, updateMovieLibrary as saveMovieLibrary, writeActivity } from '@/lib/account-service'
import { inviteFriendToRoom } from '@/lib/social-api'

function accountLoadError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  if (code.includes('permission-denied')) return 'Firebase đang từ chối dữ liệu hồ sơ. Hãy cập nhật Database Rules rồi thử lại.'
  if (code.includes('network') || code.includes('unavailable')) return 'Không thể kết nối dữ liệu tài khoản. Hãy kiểm tra mạng rồi thử lại.'
  return 'Không tải được dữ liệu hồ sơ. Thông tin Google tạm thời vẫn được hiển thị.'
}

export function useAccount() {
  const { user, getIdToken } = useAuth()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [settings, setSettings] = useState<AccountSettings>({ privacy: DEFAULT_PRIVACY, emailNotifications: true, updatedAt: 0 })
  const [watchlist, setWatchlist] = useState<Record<string, WatchlistMovie>>({})
  const [notifications, setNotifications] = useState<AccountNotification[]>([])
  const [friends, setFriends] = useState<Record<string, FriendshipRecord>>({})
  const [friendRequests, setFriendRequests] = useState<Record<string, FriendRequest>>({})
  const [sentFriendRequests, setSentFriendRequests] = useState<Record<string, FriendRequest>>({})
  const [friendPresence, setFriendPresence] = useState<Record<string, FriendPresence>>({})
  const [loading, setLoading] = useState(Boolean(user))
  const [error, setError] = useState<string | null>(null)
  const [retryVersion, setRetryVersion] = useState(0)

  useEffect(() => {
    if (!user || !database) { setProfile(null); setWatchlist({}); setNotifications([]); setFriends({}); setFriendRequests({}); setSentFriendRequests({}); setError(database ? null : 'Dịch vụ tài khoản chưa được cấu hình.'); setLoading(false); return }
    let active = true
    const unsubscribers: Array<() => void> = []
    const fallbackProfile = profileFromAuthUser(user)
    setLoading(true)
    setError(null)

    const failGracefully = (reason: unknown) => {
      if (!active) return
      setProfile((current) => current || fallbackProfile)
      setError(accountLoadError(reason))
      setLoading(false)
    }
    const timeout = window.setTimeout(() => failGracefully(new Error('account-timeout')), 7000)

    void ensureAccountProfile(user)
      .then((ensuredProfile) => {
        if (!active) return
        setProfile(ensuredProfile)
        setLoading(false)
        window.clearTimeout(timeout)
      })
      .catch(failGracefully)

    unsubscribers.push(
      onValue(ref(database, `publicProfiles/${user.uid}`), (snapshot) => {
        if (!active) return
        if (snapshot.exists()) {
          setProfile(snapshot.val() as PublicProfile)
          setError(null)
        }
        setLoading(false)
        window.clearTimeout(timeout)
      }, failGracefully),
      onValue(ref(database, `users/${user.uid}/settings`), (snapshot) => { if (active && snapshot.exists()) setSettings({ ...snapshot.val(), privacy: { ...DEFAULT_PRIVACY, ...snapshot.val().privacy } }) }, () => undefined),
      onValue(ref(database, `watchlists/${user.uid}`), (snapshot) => { if (active) setWatchlist(Object.fromEntries(Object.entries((snapshot.val() || {}) as Record<string, WatchlistMovie>).map(([slug, item]) => [slug, normalizeLibraryItem(item)]))) }, () => undefined),
      onValue(ref(database, `notifications/${user.uid}`), (snapshot) => { if (active) setNotifications(Object.values((snapshot.val() || {}) as Record<string, AccountNotification>).sort((a, b) => b.createdAt - a.createdAt)) }, () => undefined),
      onValue(ref(database, `friendships/${user.uid}`), (snapshot) => { if (active) setFriends(snapshot.val() || {}) }, () => undefined),
      onValue(ref(database, `friendRequests/${user.uid}`), (snapshot) => { if (active) setFriendRequests(snapshot.val() || {}) }, () => undefined),
      onValue(ref(database, `sentFriendRequests/${user.uid}`), (snapshot) => { if (active) setSentFriendRequests(snapshot.val() || {}) }, () => undefined),
    )
    return () => { active = false; window.clearTimeout(timeout); unsubscribers.forEach((unsubscribe) => unsubscribe()) }
  }, [retryVersion, user])

  useEffect(() => {
    if (!user || !database) return
    let connectionRef: ReturnType<typeof ref> | null = null
    const unsubscribe = onValue(ref(database, '.info/connected'), (snapshot) => {
      if (snapshot.val() !== true) return
      connectionRef = ref(database!, `presenceConnections/${user.uid}/${crypto.randomUUID()}`)
      const lastSeenRef = ref(database!, `presenceLastSeen/${user.uid}`)
      void onDisconnect(connectionRef).remove()
        .then(() => onDisconnect(lastSeenRef).set(serverTimestamp()))
        .then(() => set(connectionRef!, true))
        .catch(() => undefined)
    })
    return () => {
      unsubscribe()
      if (connectionRef) void set(connectionRef, null).catch(() => undefined)
      void set(ref(database!, `presenceLastSeen/${user.uid}`), Date.now()).catch(() => undefined)
    }
  }, [user])

  useEffect(() => {
    if (!database) return
    const unsubscribers = Object.keys(friends).flatMap((friendUid) => [
      onValue(ref(database!, `presenceConnections/${friendUid}`), (snapshot) => setFriendPresence((current) => ({ ...current, [friendUid]: { online: snapshot.exists(), lastSeen: current[friendUid]?.lastSeen || 0 } })), () => undefined),
      onValue(ref(database!, `presenceLastSeen/${friendUid}`), (snapshot) => setFriendPresence((current) => ({ ...current, [friendUid]: { online: current[friendUid]?.online || false, lastSeen: Number(snapshot.val() || 0) } })), () => undefined),
    ])
    setFriendPresence((current) => Object.fromEntries(Object.entries(current).filter(([uid]) => Boolean(friends[uid]))))
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [friends])

  const updateSettings = useCallback(async (next: AccountSettings) => { if (!user || !database) return; setSettings(next); await saveSettings(user.uid, next); const publicUpdates: Record<string, unknown> = {}; publicUpdates[`publicWatchlists/${user.uid}`] = next.privacy.showWatchlist ? watchlist : null; if (!next.privacy.showRecentMovies) publicUpdates[`publicRecent/${user.uid}`] = null; await update(ref(database), publicUpdates) }, [user, watchlist])
  const setMovieStatus = useCallback(async (movie: Omit<WatchlistMovie, 'status' | 'addedAt' | 'updatedAt'>, status: WatchlistStatus | null) => { if (!user || !database) throw new Error('Bạn cần đăng nhập để lưu phim.'); if (status) { const value = await setWatchlistMovie(user.uid, movie, status); if (settings.privacy.showWatchlist) await update(ref(database), { [`publicWatchlists/${user.uid}/${movie.movieSlug}`]: value }); if (profile) await writeActivity(user.uid, { actorUid: user.uid, actorName: profile.displayName, actorUsername: profile.username, actorAvatar: profile.avatar, type: status === 'completed' ? 'completed' : 'watchlist', movieSlug: movie.movieSlug, movieTitle: movie.title, poster: movie.poster }) } else { await removeWatchlistMovie(user.uid, movie.movieSlug); await update(ref(database), { [`publicWatchlists/${user.uid}/${movie.movieSlug}`]: null }) } }, [profile, settings.privacy.showWatchlist, user])
  const updateMovieLibrary = useCallback(async (movie: Omit<WatchlistMovie, 'status' | 'favorite' | 'watchLater' | 'watchStatus' | 'addedAt' | 'updatedAt'>, patch: { favorite?: boolean; watchLater?: boolean; watchStatus?: LibraryWatchStatus }) => {
    if (!user || !database) throw new Error('Bạn cần đăng nhập để lưu phim.')
    const value = await saveMovieLibrary(user.uid, movie, patch)
    if (settings.privacy.showWatchlist) await update(ref(database), { [`publicWatchlists/${user.uid}/${movie.movieSlug}`]: value })
    if (profile && value) await writeActivity(user.uid, { actorUid: user.uid, actorName: profile.displayName, actorUsername: profile.username, actorAvatar: profile.avatar, type: value.watchStatus === 'completed' ? 'completed' : 'watchlist', movieSlug: movie.movieSlug, movieTitle: movie.title, poster: movie.poster })
    return value
  }, [profile, settings.privacy.showWatchlist, user])
  const markNotificationsRead = useCallback(async (id?: string) => { if (!user || !database) return; if (id) await update(ref(database), { [`notifications/${user.uid}/${id}/read`]: true }); else { const changes = Object.fromEntries(notifications.filter((item) => !item.read).map((item) => [`notifications/${user.uid}/${item.id}/read`, true])); if (Object.keys(changes).length) await update(ref(database), changes) } }, [notifications, user])
  const requestFriend = useCallback(async (target: PublicProfile) => { if (!profile) throw new Error('Hồ sơ chưa sẵn sàng.'); await sendFriendRequest(profile, target) }, [profile])
  const cancelFriend = useCallback(async (targetUid: string) => { if (!user) return; await cancelFriendRequest(user.uid, targetUid) }, [user])
  const answerFriend = useCallback(async (request: FriendRequest, accept: boolean) => { if (!profile) return; await respondFriendRequest(profile, request, accept) }, [profile])
  const unfriend = useCallback(async (friendUid: string) => { if (!user) return; await removeFriend(user.uid, friendUid) }, [user])
  const blockUser = useCallback(async (targetUid: string, blocked = true) => { if (!user) return; await setUserBlocked(user.uid, targetUid, blocked) }, [user])
  const inviteFriend = useCallback(async (friend: FriendshipRecord, roomId: string, _movieSlug?: string) => { const token = await getIdToken(); if (!token) throw new Error('Bạn cần đăng nhập để mời bạn bè.'); const result = await inviteFriendToRoom(roomId, friend.uid, token); if (result.emailStatus === 'failed') throw new Error('Đã gửi trong ứng dụng, nhưng email chưa gửi được.'); return result }, [getIdToken])
  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications])
  const retry = useCallback(() => setRetryVersion((value) => value + 1), [])

  return { profile, settings, watchlist, notifications, friends, friendRequests, sentFriendRequests, friendPresence, unreadCount, loading, error, degraded: Boolean(error), retry, updateSettings, setMovieStatus, updateMovieLibrary, markNotificationsRead, requestFriend, cancelFriend, answerFriend, unfriend, blockUser, inviteFriend }
}
