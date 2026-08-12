'use client'

import Link from 'next/link'
import { Crown, Loader2, RefreshCw, Sparkles, Users, Video, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEntitlement } from '@/hooks/useEntitlement'
import { PLAN_DEFINITIONS } from '@/lib/monetization'

const icons = { normal: Sparkles, premium: Zap, ultra: Crown }
const sourceLabels = { default: 'Gói miễn phí', discount: 'Mã giảm giá', payment: 'Thanh toán', admin_gift: 'Admin cấp tặng', github_star: 'GitHub Star pilot' }

export function AccountPlanCard() {
  const { entitlement, capabilities, loading, error, refresh } = useEntitlement()
  if (loading && !entitlement) return <div className="flex min-h-28 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035]"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
  const plan = entitlement?.plan || 'normal'
  const definition = PLAN_DEFINITIONS[plan]
  const Icon = icons[plan]
  const expiry = entitlement?.expiresAt && plan !== 'normal'
    ? `Có hiệu lực đến ${new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long' }).format(entitlement.expiresAt)}`
    : entitlement?.status === 'expired' ? 'Gói trả phí đã hết hạn · đang dùng CinePass' : entitlement?.status === 'cancelled' ? 'Gói trả phí đã hủy · đang dùng CinePass' : 'Tài khoản miễn phí mặc định'
  const watchBenefit = capabilities?.moviesPerDay == null ? 'Xem phim không giới hạn' : `${capabilities.moviesPerDay} phim/ngày · ${capabilities.episodesPerMoviePerDay} tập/phim`
  const roomBenefit = capabilities?.canCreateRoom ? `Tạo phòng tối đa ${capabilities.roomMaxMembers} người` : 'Tham gia phòng ở chế độ xem'

  return <section className="rounded-2xl border border-accent/20 bg-gradient-to-r from-accent/[0.09] via-white/[0.03] to-transparent p-5">
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent-soft"><Icon className="h-5 w-5" /></span><div><p className="text-xs font-semibold uppercase tracking-wider text-accent-soft">Gói hiện tại</p><h2 className="mt-1 font-display text-xl font-bold">{definition.name}</h2><p className="mt-1 text-xs text-fg-muted">{expiry}</p><p className="mt-1 text-xs font-medium text-fg-secondary">{sourceLabels[entitlement?.source || 'default']}{entitlement?.billingCycle ? ` · ${entitlement.billingCycle === 'annual' ? '1 năm' : '1 tháng'}` : ''}</p></div></div>
        <div className="mt-5 grid gap-2 text-sm text-fg-secondary sm:grid-cols-2"><p className="flex items-center gap-2 rounded-xl bg-black/15 px-3 py-2"><Video className="h-4 w-4 text-accent-soft" />{watchBenefit}</p><p className="flex items-center gap-2 rounded-xl bg-black/15 px-3 py-2"><Users className="h-4 w-4 text-accent-soft" />{roomBenefit}</p></div>
        {error && <p className="mt-3 text-xs text-bad">{error}</p>}
      </div>
      <div className="flex shrink-0 gap-2"><Button type="button" size="icon" variant="outline" aria-label="Làm mới thông tin gói" onClick={() => void refresh()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button><Button asChild variant={plan === 'ultra' ? 'outline' : 'default'}><Link href="/pricing">{plan === 'normal' ? 'Nâng cấp gói' : plan === 'premium' ? 'Xem Ultra' : 'Xem quyền lợi'}</Link></Button></div>
    </div>
  </section>
}
