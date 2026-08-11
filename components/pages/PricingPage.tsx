'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Crown, Sparkles, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePlanCatalog } from '@/hooks/usePlanCatalog'
import type { AccountPlan, BillingCycle } from '@/lib/monetization'
import { cn } from '@/lib/utils'

const formatCurrency = (value: number) => value === 0 ? 'Miễn phí' : `${new Intl.NumberFormat('vi-VN').format(value)}đ`
const planIcons = { normal: Sparkles, premium: Zap, ultra: Crown }

export function PricingPage() {
  const [cycle, setCycle] = useState<BillingCycle>('monthly')
  const { plans, loading, error } = usePlanCatalog()
  const planIds: AccountPlan[] = ['normal', 'premium', 'ultra']

  return <main className="min-h-[calc(100vh-72px)] bg-bg px-4 py-14 sm:px-6 lg:py-20"><div className="mx-auto max-w-6xl">
    <div className="mx-auto max-w-2xl text-center"><p className="text-eyebrow text-accent-soft">CineMind membership</p><h1 className="mt-3 text-title-1">Chọn trải nghiệm xem của bạn</h1><p className="mt-4 text-sm leading-6 text-fg-secondary">CinePass để bắt đầu, CinePass Plus để xem thoải mái hơn và CinePass Ultra để loại bỏ hoàn toàn nội dung tài trợ.</p></div>
    <div className="mx-auto mt-7 flex w-fit rounded-full border border-white/10 bg-surface-1 p-1"><button type="button" onClick={() => setCycle('monthly')} className={cn('rounded-full px-5 py-2 text-sm font-semibold transition', cycle === 'monthly' ? 'bg-accent-strong text-white' : 'text-fg-muted hover:text-fg')}>Theo tháng</button><button type="button" onClick={() => setCycle('annual')} className={cn('rounded-full px-5 py-2 text-sm font-semibold transition', cycle === 'annual' ? 'bg-accent-strong text-white' : 'text-fg-muted hover:text-fg')}>Theo năm · tiết kiệm</button></div>
    {error && <p role="alert" className="mx-auto mt-5 max-w-2xl rounded-xl border border-warn/25 bg-warn/10 p-3 text-center text-sm text-warn">Đang hiển thị giá dự phòng. Đăng ký tạm thời bị khóa cho tới khi bảng giá kết nối lại.</p>}
    <div className="mt-10 grid gap-5 lg:grid-cols-3">{planIds.map((planId) => {
      const plan = plans[planId]
      const Icon = planIcons[planId]
      const price = cycle === 'annual' ? plan.annualPrice : plan.monthlyPrice
      const highlighted = planId === 'ultra'
      const unavailable = planId !== 'normal' && !plan.saleEnabled
      return <article key={planId} className={cn('relative flex flex-col rounded-2xl border bg-surface-1 p-6 shadow-card', highlighted ? 'border-accent/50 shadow-[0_0_50px_rgba(168,85,247,0.12)]' : 'border-white/[0.08]')}>
        {highlighted && <span className="absolute -top-3 right-5 rounded-full bg-accent-strong px-3 py-1 text-xs font-bold text-white">Mở khóa toàn bộ</span>}
        <span className={cn('flex h-11 w-11 items-center justify-center rounded-xl', highlighted ? 'bg-accent/20 text-accent-soft' : 'bg-white/[0.06] text-fg-secondary')}><Icon className="h-5 w-5" /></span>
        <h2 className="mt-5 font-display text-2xl font-bold">{plan.name}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-fg-secondary">{plan.description}</p>
        <div className="mt-5"><span className="font-display text-3xl font-bold">{formatCurrency(price)}</span>{price > 0 && <span className="ml-1 text-sm text-fg-muted">/{cycle === 'annual' ? 'năm' : 'tháng'}</span>}</div>
        {unavailable && <p className="mt-2 text-xs font-semibold text-warn">Tạm dừng đăng ký</p>}
        <ul className="mt-6 flex-1 space-y-3">{plan.highlights.map((feature) => <li key={feature} className="flex gap-3 text-sm text-fg-secondary"><Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" />{feature}</li>)}</ul>
        {planId === 'normal' ? <Button asChild variant="outline" className="mt-7 h-12 border-white/10"><Link href="/">Tiếp tục miễn phí</Link></Button> : unavailable ? <Button disabled className="mt-7 h-12">{loading ? 'Đang tải giá…' : 'Tạm dừng bán'}</Button> : <Button asChild className={cn('mt-7 h-12 font-semibold', highlighted && 'bg-accent-strong hover:bg-accent')}><Link href={`/checkout?plan=${planId}&cycle=${cycle}`}>Chọn {plan.name}</Link></Button>}
      </article>
    })}</div>
    <p className="mt-7 text-center text-xs text-fg-muted">Thanh toán thật chưa được bật. Mã giảm 100% do admin tạo có thể kích hoạt gói ngay để kiểm thử.</p>
  </div></main>
}
