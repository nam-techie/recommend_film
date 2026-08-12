export type DashboardDataSource = 'live' | 'empty' | 'derived' | 'unavailable'

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
    uniqueViewers: number
    watchHours: number
    completionRate: number
    concurrentViewers: number
    onlineNow: number
    peakOnline: number
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
  analyticsSince: number | null
  popularMovies: Array<{ slug: string; title: string; genre: string; qualifiedViews: number; watchHours: number; completionRate: number }>
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
