'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { onValue, ref, update } from 'firebase/database'
import { useAuth } from '@/components/auth/AuthProvider'
import { AccountNotification, AccountSettings, DEFAULT_PRIVACY, PublicProfile, WatchlistMovie, WatchlistStatus } from '@/lib/account-types'
import { database } from '@/lib/firebase'
import { ensureAccountProfile, profileFromAuthUser, removeWatchlistMovie, saveSettings, setWatchlistMovie, writeActivity } from '@/lib/account-service'

function accountLoadError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  if (code.includes('permission-denied')) return 'Firebase đang từ chối dữ liệu hồ sơ. Hãy cập nhật Database Rules rồi thử lại.'
  if (code.includes('network') || code.includes('unavailable')) return 'Không thể kết nối dữ liệu tài khoản. Hãy kiểm tra mạng rồi thử lại.'
  return 'Không tải được dữ liệu hồ sơ. Thông tin Google tạm thời vẫn được hiển thị.'
}

export function useAccount() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [settings, setSettings] = useState<AccountSettings>({ privacy: DEFAULT_PRIVACY, emailNotifications: true, updatedAt: 0 })
  const [watchlist, setWatchlist] = useState<Record<string, WatchlistMovie>>({})
  const [notifications, setNotifications] = useState<AccountNotification[]>([])
  const [loading, setLoading] = useState(Boolean(user))
  const [error, setError] = useState<string | null>(null)
  const [retryVersion, setRetryVersion] = useState(0)

  useEffect(() => {
    if (!user || !database) { setProfile(null); setWatchlist({}); setNotifications([]); setError(database ? null : 'Dịch vụ tài khoản chưa được cấu hình.'); setLoading(false); return }
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
      onValue(ref(database, `watchlists/${user.uid}`), (snapshot) => { if (active) setWatchlist(snapshot.val() || {}) }, () => undefined),
      onValue(ref(database, `notifications/${user.uid}`), (snapshot) => { if (active) setNotifications(Object.values((snapshot.val() || {}) as Record<string, AccountNotification>).sort((a, b) => b.createdAt - a.createdAt)) }, () => undefined),
    )
    return () => { active = false; window.clearTimeout(timeout); unsubscribers.forEach((unsubscribe) => unsubscribe()) }
  }, [retryVersion, user])

  const updateSettings = useCallback(async (next: AccountSettings) => { if (!user || !database) return; setSettings(next); await saveSettings(user.uid, next); const publicUpdates: Record<string, unknown> = {}; publicUpdates[`publicWatchlists/${user.uid}`] = next.privacy.showWatchlist ? watchlist : null; if (!next.privacy.showRecentMovies) publicUpdates[`publicRecent/${user.uid}`] = null; await update(ref(database), publicUpdates) }, [user, watchlist])
  const setMovieStatus = useCallback(async (movie: Omit<WatchlistMovie, 'status' | 'addedAt' | 'updatedAt'>, status: WatchlistStatus | null) => { if (!user || !database) throw new Error('Bạn cần đăng nhập để lưu phim.'); if (status) { const value = await setWatchlistMovie(user.uid, movie, status); if (settings.privacy.showWatchlist) await update(ref(database), { [`publicWatchlists/${user.uid}/${movie.movieSlug}`]: value }); if (profile) await writeActivity(user.uid, { actorUid: user.uid, actorName: profile.displayName, actorUsername: profile.username, actorAvatar: profile.avatar, type: status === 'completed' ? 'completed' : 'watchlist', movieSlug: movie.movieSlug, movieTitle: movie.title, poster: movie.poster }) } else { await removeWatchlistMovie(user.uid, movie.movieSlug); await update(ref(database), { [`publicWatchlists/${user.uid}/${movie.movieSlug}`]: null }) } }, [profile, settings.privacy.showWatchlist, user])
  const markNotificationsRead = useCallback(async (id?: string) => { if (!user || !database) return; if (id) await update(ref(database), { [`notifications/${user.uid}/${id}/read`]: true }); else { const changes = Object.fromEntries(notifications.filter((item) => !item.read).map((item) => [`notifications/${user.uid}/${item.id}/read`, true])); if (Object.keys(changes).length) await update(ref(database), changes) } }, [notifications, user])
  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications])
  const retry = useCallback(() => setRetryVersion((value) => value + 1), [])

  return { profile, settings, watchlist, notifications, unreadCount, loading, error, degraded: Boolean(error), retry, updateSettings, setMovieStatus, markNotificationsRead }
}
