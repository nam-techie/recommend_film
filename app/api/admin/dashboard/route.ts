import { NextResponse } from 'next/server'
import { buildMembershipBreakdown, type AdminDashboardSnapshot } from '@/lib/admin-dashboard'
import { AdminAccessError, readAdminDatabasePath, requireAdmin } from '@/lib/server/firebase-admin'
import { getAnalyticsOverview } from '@/lib/server/analytics'
import { analyticsCompletionRate } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

type ProfileMap = Record<string, unknown>
type EntitlementMap = Record<string, { plan?: string; expiresAt?: number }>
type DiscountMap = Record<string, { status?: string; startsAt?: number; endsAt?: number; redemptionCount?: number; maxRedemptions?: number }>

async function loadAccountSnapshot() {
  try {
    const [profiles, entitlements] = await Promise.all([
      readAdminDatabasePath<ProfileMap>('publicProfiles'),
      readAdminDatabasePath<EntitlementMap>('monetization/entitlements'),
    ])
    const profileUids = Object.keys(profiles || {})
    const now = Date.now()
    const activePlans = Object.fromEntries(Object.entries(entitlements || {})
      .filter(([, value]) => !value.expiresAt || value.expiresAt > now)
      .map(([uid, value]) => [uid, value.plan || 'normal']))
    return { memberships: buildMembershipBreakdown(profileUids, activePlans), source: 'live' as const, error: null }
  } catch {
    return { memberships: buildMembershipBreakdown([]), source: 'unavailable' as const, error: 'Firebase Admin chưa có quyền đọc Realtime Database.' }
  }
}

async function loadWatchPartySnapshot() {
  const base = (process.env.WATCH_PARTY_INTERNAL_URL || process.env.NEXT_PUBLIC_WATCH_PARTY_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:4001' : '')).replace(/\/$/, '')
  if (!base) return { active: 0, participants: 0, source: 'unavailable' as const }
  try {
    const response = await fetch(`${base}/api/rooms?limit=100`, { cache: 'no-store', signal: AbortSignal.timeout(2500) })
    if (!response.ok) throw new Error('watch party unavailable')
    const payload = await response.json() as { rooms?: Array<{ memberCount?: number; connectedCount?: number }> }
    const rooms = payload.rooms || []
    return {
      active: rooms.length,
      participants: rooms.reduce((total, room) => total + (room.connectedCount ?? room.memberCount ?? 0), 0),
      source: 'live' as const,
    }
  } catch {
    return { active: 0, participants: 0, source: 'unavailable' as const }
  }
}

async function loadDiscountSnapshot() {
  try {
    const discounts = await readAdminDatabasePath<DiscountMap>('monetization/discountCodes')
    const now = Date.now()
    const values = Object.values(discounts || {})
    const active = values.filter((item) => item.status === 'active' && (item.startsAt || 0) <= now && (item.endsAt || 0) > now).length
    const redemptions = values.reduce((total, item) => total + (item.redemptionCount || 0), 0)
    const capacity = values.reduce((total, item) => total + (item.maxRedemptions || 0), 0)
    return { active, redemptions, conversionRate: capacity ? Math.round(redemptions / capacity * 1000) / 10 : 0, source: 'live' as const }
  } catch {
    return { active: 0, redemptions: 0, conversionRate: 0, source: 'unavailable' as const }
  }
}

export async function GET(request: Request) {
  try {
    const identity = await requireAdmin(request)
    const [accounts, rooms, discounts, analytics] = await Promise.all([loadAccountSnapshot(), loadWatchPartySnapshot(), loadDiscountSnapshot(), getAnalyticsOverview('30d')])
    const analyticsSource = analytics.since ? 'live' as const : 'empty' as const
    const notices = [
      'Doanh thu và thanh toán tạm thời không khả dụng trong nhánh non-payment.',
      analytics.since ? `Analytics được thu thập từ ${new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(analytics.since)}; không backfill từ watchProgressV2.` : 'Chưa có playback session hợp lệ; dashboard không hiển thị dữ liệu xem giả.',
      ...(accounts.error ? [accounts.error] : []),
      ...(discounts.source === 'unavailable' ? ['Chưa đọc được mã giảm giá từ Firebase Admin.'] : []),
      ...(rooms.source === 'unavailable' ? ['Dịch vụ Xem Chung chưa phản hồi; số phòng tạm hiển thị 0.'] : []),
    ]

    const snapshot: AdminDashboardSnapshot = {
      generatedAt: Date.now(),
      viewer: { uid: identity.uid, email: identity.email || null },
      metrics: {
        revenueToday: 0,
        revenueMonth: 0,
        totalUsers: accounts.memberships.total,
        totalViews: analytics.totals.qualifiedViews,
        uniqueViewers: analytics.totals.uniqueViewers,
        watchHours: Math.round(analytics.totals.activeSeconds / 36) / 100,
        completionRate: analyticsCompletionRate(analytics.totals),
        concurrentViewers: analytics.concurrentViewers,
        onlineNow: analytics.onlineNow,
        peakOnline: analytics.peakOnline,
        activeRooms: rooms.active,
        activeDiscounts: discounts.active,
      },
      sources: {
        revenue: 'unavailable', users: accounts.source, views: analyticsSource, rooms: rooms.source,
        discounts: discounts.source, payments: 'unavailable',
      },
      memberships: accounts.memberships,
      revenueSeries: [],
      analyticsSince: analytics.since,
      popularMovies: analytics.topMovies.slice(0, 5).map((movie) => ({ slug: movie.slug, title: movie.title, genre: movie.genres[0] || 'Chưa phân loại', qualifiedViews: movie.qualifiedViews, watchHours: Math.round(movie.activeSeconds / 36) / 100, completionRate: analyticsCompletionRate(movie) })),
      payments: { successful: 0, failed: 0, pending: 0 },
      discounts: { active: discounts.active, redemptions: discounts.redemptions, conversionRate: discounts.conversionRate },
      rooms: { active: rooms.active, participants: rooms.participants },
      health: [
        { name: 'Firebase Authentication', status: 'operational', detail: 'ID token và quyền admin hợp lệ' },
        { name: 'Realtime Database', status: accounts.source === 'live' ? 'operational' : 'degraded', detail: accounts.source === 'live' ? 'Đọc dữ liệu tài khoản thành công' : 'Kiểm tra service account' },
        { name: 'Watch Party API', status: rooms.source === 'live' ? 'operational' : 'degraded', detail: rooms.source === 'live' ? `${rooms.active} phòng đang hoạt động` : 'Không kết nối được dịch vụ' },
        { name: 'Hệ thống gói tài khoản', status: accounts.source === 'live' ? 'operational' : 'degraded', detail: 'CinePass, CinePass Plus và CinePass Ultra' },
      ],
      notices,
    }
    return NextResponse.json(snapshot, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof AdminAccessError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('admin_dashboard_failed', { message: error instanceof Error ? error.message : 'unknown' })
    return NextResponse.json({ error: 'Không thể tải dashboard quản trị.' }, { status: 500 })
  }
}
