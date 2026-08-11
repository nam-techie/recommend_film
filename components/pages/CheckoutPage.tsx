'use client'

import { FormEvent, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { BadgePercent, CheckCircle2, CreditCard, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePlanCatalog } from '@/hooks/usePlanCatalog'
import { useEntitlement } from '@/hooks/useEntitlement'
import { normalizeDiscountCode, type BillingCycle, type DiscountQuote, type PaidPlan } from '@/lib/monetization'

const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`

export function CheckoutPage() {
  const params = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { plans: catalog, loading: catalogLoading, error: catalogError } = usePlanCatalog()
  const { refresh: refreshEntitlement } = useEntitlement()
  const plan: PaidPlan = params.get('plan') === 'ultra' ? 'ultra' : 'premium'
  const cycle: BillingCycle = params.get('cycle') === 'annual' ? 'annual' : 'monthly'
  const [code, setCode] = useState('')
  const [quote, setQuote] = useState<DiscountQuote | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const selectedPlan = catalog[plan]
  const originalPrice = useMemo(() => cycle === 'annual' ? selectedPlan.annualPrice : selectedPlan.monthlyPrice, [cycle, selectedPlan])

  const authorizedRequest = async (path: string, planVersionId?: string) => {
    if (!user) throw new Error('Bạn cần đăng nhập trước khi dùng mã.')
    const token = await user.getIdToken()
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code, plan, billingCycle: cycle, ...(planVersionId ? { planVersionId } : {}) }),
    })
    const payload = await response.json().catch(() => ({}))
    if (response.status === 409 && payload.code === 'PRICE_CHANGED' && payload.quote) setQuote(payload.quote)
    if (!response.ok) throw new Error(payload.error || 'Không thể kiểm tra mã giảm giá.')
    return payload
  }

  const applyCode = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(null); setQuote(null)
    try { const payload = await authorizedRequest('/api/discounts/quote'); setQuote(payload.quote) }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Không thể kiểm tra mã.') }
    finally { setLoading(false) }
  }

  const redeem = async () => {
    setLoading(true); setError(null)
    try {
      if (!quote) throw new Error('Hãy áp dụng lại mã giảm giá trước khi kích hoạt.')
      const payload = await authorizedRequest('/api/discounts/redeem', quote.planVersionId)
      await refreshEntitlement()
      setSuccess(true)
      window.setTimeout(() => router.push(`/account?upgrade=success&plan=${payload.entitlement.plan}`), 900)
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Không thể kích hoạt gói.') }
    finally { setLoading(false) }
  }

  const returnUrl = encodeURIComponent(`/checkout?plan=${plan}&cycle=${cycle}`)
  return <main className="min-h-screen bg-bg px-4 py-10 sm:px-6"><div className="mx-auto grid max-w-5xl overflow-hidden rounded-2xl border border-white/[0.08] bg-surface-1 shadow-card lg:grid-cols-[0.9fr_1.1fr]">
    <section className="bg-gradient-to-br from-black via-[#100b17] to-[#261039] p-6 sm:p-9">
      <Link href="/pricing" className="text-sm text-fg-secondary hover:text-fg">← Quay lại bảng giá</Link>
      <p className="mt-10 text-sm font-semibold text-accent-soft">Đăng ký {selectedPlan.name}</p>
      <h1 className="mt-2 font-display text-4xl font-bold">{money(originalPrice)} <span className="text-base font-normal text-fg-muted">/{cycle === 'annual' ? 'năm' : 'tháng'}</span></h1>
      <p className="mt-3 text-sm text-fg-secondary">{selectedPlan.description}</p>
      <ul className="mt-8 space-y-3">{selectedPlan.highlights.map((feature) => <li key={feature} className="flex gap-3 text-sm text-fg-secondary"><CheckCircle2 className="h-4 w-4 shrink-0 text-ok" />{feature}</li>)}</ul>
    </section>
    <section className="p-6 sm:p-9">
      <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent-soft"><CreditCard className="h-5 w-5" /></span><div><h2 className="font-semibold">Thông tin thanh toán</h2><p className="mt-0.5 text-xs text-fg-muted">Bước thử nghiệm mã giảm giá</p></div></div>
      {authLoading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div> : !user ? <div className="mt-8 rounded-xl border border-warn/25 bg-warn/10 p-5"><p className="text-sm text-warn">Bạn cần đăng nhập để mã được ghi nhận đúng một lần cho tài khoản.</p><Button asChild className="mt-4"><Link href={`/login?returnUrl=${returnUrl}`}>Đăng nhập để tiếp tục</Link></Button></div> : <>
        <div className="mt-7 rounded-xl border border-white/[0.08] bg-bg/60 p-4"><p className="text-xs text-fg-muted">Tài khoản</p><p className="mt-1 truncate text-sm font-semibold">{user.email || user.uid}</p></div>
        <form onSubmit={(event) => void applyCode(event)} className="mt-6"><label htmlFor="checkout-code" className="text-sm font-semibold">Mã giảm giá</label><div className="mt-2 flex gap-2"><Input id="checkout-code" value={code} onChange={(event) => { setCode(normalizeDiscountCode(event.target.value)); setQuote(null) }} placeholder="Nhập mã của bạn" className="h-12 font-mono uppercase" /><Button type="submit" variant="outline" disabled={loading || code.length < 3} className="h-12 shrink-0 border-white/10">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgePercent className="h-4 w-4" />}Áp dụng</Button></div></form>
        {(error || catalogError) && <p role="alert" className="mt-4 rounded-lg border border-bad/25 bg-bad/10 p-3 text-sm text-bad">{error || catalogError}</p>}
        {success && <p role="status" className="mt-4 flex items-center gap-2 rounded-lg border border-ok/25 bg-ok/10 p-3 text-sm text-ok"><ShieldCheck className="h-4 w-4" />Kích hoạt thành công. Đang mở tài khoản…</p>}
        <div className="mt-7 space-y-3 border-t border-white/[0.08] pt-6 text-sm"><div className="flex justify-between text-fg-secondary"><span>Tạm tính</span><span>{money(originalPrice)}</span></div>{quote && <div className="flex justify-between text-ok"><span>Mã {quote.code} ({quote.percent}%)</span><span>−{money(quote.discountAmount)}</span></div>}<div className="flex justify-between border-t border-white/[0.08] pt-4 text-base font-bold"><span>Tổng cộng</span><span>{money(quote?.finalAmount ?? originalPrice)}</span></div></div>
        {!catalogLoading && !selectedPlan.saleEnabled ? <Button disabled className="mt-6 h-12 w-full"><LockKeyhole className="h-4 w-4" />Gói đang tạm dừng bán</Button> : quote?.canActivateWithoutPayment ? <Button onClick={() => void redeem()} disabled={loading || success} className="mt-6 h-12 w-full bg-accent-strong font-semibold hover:bg-accent">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}Kích hoạt {selectedPlan.name} miễn phí</Button> : <Button disabled className="mt-6 h-12 w-full"><LockKeyhole className="h-4 w-4" />Thanh toán sẽ được kết nối sau</Button>}
        <p className="mt-4 text-center text-xs leading-5 text-fg-muted">Hiện chỉ mã giảm 100% kích hoạt ngay. Mã giảm một phần sẽ chờ SePay/VNPAY/MoMo ở giai đoạn thanh toán.</p>
      </>}
    </section>
  </div></main>
}
