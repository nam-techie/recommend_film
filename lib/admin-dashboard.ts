export type DashboardDataSource = 'live' | 'demo' | 'derived' | 'unavailable'

export interface MembershipBreakdown {
  normal: number
  premium: number
  ultra: number
  total: number
}

export interface AdminDashboardSnapshot {
  generatedAt: number
  viewer: { uid: string; email: string | null }
  metrics: {
    revenueToday: number
    revenueMonth: number
    totalUsers: number
    totalViews: number
    activeRooms: number
    activeDiscounts: number
  }
  sources: {
    revenue: DashboardDataSource
    users: DashboardDataSource
    views: DashboardDataSource
    rooms: DashboardDataSource
    discounts: DashboardDataSource
    payments: DashboardDataSource
  }
  memberships: MembershipBreakdown
  revenueSeries: Array<{ label: string; value: number }>
  popularMovies: Array<{ title: string; genre: string; views: number; growth: number }>
  payments: { successful: number; failed: number; pending: number }
  discounts: { active: number; redemptions: number; conversionRate: number }
  rooms: { active: number; participants: number }
  health: Array<{ name: string; status: 'operational' | 'degraded' | 'planned'; detail: string }>
  notices: string[]
}

export function buildMembershipBreakdown(profileUids: string[], entitlementPlans: Record<string, string> = {}): MembershipBreakdown {
  return profileUids.reduce<MembershipBreakdown>((result, uid) => {
    const plan = entitlementPlans[uid]
    if (plan === 'ultra' || plan === 'vip') result.ultra += 1
    else if (plan === 'premium') result.premium += 1
    else result.normal += 1
    result.total += 1
    return result
  }, { normal: 0, premium: 0, ultra: 0, total: 0 })
}

export const dashboardDemoData = {
  revenueToday: 1_248_000,
  revenueMonth: 28_560_000,
  totalViews: 12_840,
  activeDiscounts: 6,
  revenueSeries: [
    { label: 'T2', value: 2_800_000 },
    { label: 'T3', value: 3_450_000 },
    { label: 'T4', value: 3_180_000 },
    { label: 'T5', value: 4_720_000 },
    { label: 'T6', value: 5_100_000 },
    { label: 'T7', value: 6_450_000 },
    { label: 'CN', value: 7_280_000 },
  ],
  popularMovies: [
    { title: 'Nghịch Thiên Tà Thần', genre: 'Hoạt hình', views: 4_890, growth: 18 },
    { title: 'Đấu Phá Thương Khung', genre: 'Hành động', views: 4_120, growth: 12 },
    { title: 'Tiên Nghịch', genre: 'Phiêu lưu', views: 3_760, growth: 9 },
    { title: 'Thôn Phệ Tinh Không', genre: 'Khoa học viễn tưởng', views: 3_180, growth: 7 },
  ],
  payments: { successful: 184, failed: 11, pending: 8 },
  discounts: { active: 6, redemptions: 92, conversionRate: 18.4 },
} as const
