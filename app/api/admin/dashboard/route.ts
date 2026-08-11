import { NextResponse } from 'next/server'
import { buildMembershipBreakdown, dashboardDemoData, type AdminDashboardSnapshot } from '@/lib/admin-dashboard'
import { AdminAccessError, readAdminDatabasePath, requireAdmin } from '@/lib/server/firebase-admin'

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
    const [accounts, rooms, discounts] = await Promise.all([loadAccountSnapshot(), loadWatchPartySnapshot(), loadDiscountSnapshot()])
    const notices = [
      'Doanh thu, lượt xem và thanh toán đang dùng dữ liệu mẫu để duyệt giao diện.',
      ...(accounts.error ? [accounts.error] : []),
      ...(discounts.source === 'unavailable' ? ['Chưa đọc được mã giảm giá từ Firebase Admin.'] : []),
      ...(rooms.source === 'unavailable' ? ['Dịch vụ Xem Chung chưa phản hồi; số phòng tạm hiển thị 0.'] : []),
    ]

    const snapshot: AdminDashboardSnapshot = {
      generatedAt: Date.now(),
      viewer: { uid: identity.uid, email: identity.email || null },
      metrics: {
        revenueToday: dashboardDemoData.revenueToday,
        revenueMonth: dashboardDemoData.revenueMonth,
        totalUsers: accounts.memberships.total,
        totalViews: dashboardDemoData.totalViews,
        activeRooms: rooms.active,
        activeDiscounts: discounts.active,
      },
      sources: {
        revenue: 'demo', users: accounts.source, views: 'demo', rooms: rooms.source,
        discounts: discounts.source, payments: 'demo',
      },
      memberships: accounts.memberships,
      revenueSeries: [...dashboardDemoData.revenueSeries],
      popularMovies: [...dashboardDemoData.popularMovies],
      payments: { ...dashboardDemoData.payments },
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
