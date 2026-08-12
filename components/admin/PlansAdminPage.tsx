'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarClock, CheckCircle2, Clock3, History, Loader2, PackageOpen, RefreshCw, Save, ShieldCheck } from 'lucide-react'
import type { PaidPlan, PlanCatalogEntry, PlanPriceVersion } from '@/lib/monetization'
import { useAdminApi } from '@/hooks/useAdminApi'
import { AccessDenied, AdminLogin, AdminShell } from '@/components/admin/AdminShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useAdminStepUp } from '@/components/admin/AdminStepUpDialog'
import { useAdminReasonDialog } from '@/components/admin/AdminReasonDialog'

type PlanSnapshot = Record<PaidPlan, { current: PlanCatalogEntry; scheduled: PlanPriceVersion | null; history: PlanPriceVersion[] }>
const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`
const date = (value: number) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(value)
const localDateTime = (value: number) => new Date(value - new Date(value).getTimezoneOffset() * 60_000).toISOString().slice(0, 16)

export function PlansAdminPage() {
  const { user, loading: authLoading, logout, request, denied } = useAdminApi()
  const [plans, setPlans] = useState<PlanSnapshot | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan>('premium')
  const [monthlyPrice, setMonthlyPrice] = useState(39_000)
  const [annualPrice, setAnnualPrice] = useState(390_000)
  const [saleEnabled, setSaleEnabled] = useState(true)
  const [schedule, setSchedule] = useState(false)
  const [effectiveAt, setEffectiveAt] = useState(() => localDateTime(Date.now() + 60 * 60_000))
  const [reason, setReason] = useState('Cập nhật chiến lược giá')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const { approve, dialog: stepUpDialog } = useAdminStepUp()
  const { askReason, reasonDialog } = useAdminReasonDialog()

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true); setError(null)
    try { const payload = await request<{ plans: PlanSnapshot }>('/api/admin/plans'); setPlans(payload.plans) }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Không thể tải bảng giá.') }
    finally { setLoading(false) }
  }, [request, user])

  useEffect(() => { if (user) void load() }, [load, user])
  useEffect(() => {
    const current = plans?.[selectedPlan]?.current
    if (!current) return
    setMonthlyPrice(current.monthlyPrice); setAnnualPrice(current.annualPrice); setSaleEnabled(current.saleEnabled)
  }, [plans, selectedPlan])

  const saving = monthlyPrice * 12 - annualPrice
  const savingPercent = monthlyPrice > 0 ? saving / (monthlyPrice * 12) * 100 : 0

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const body = { monthlyPrice, annualPrice, saleEnabled, effectiveAt: schedule ? new Date(effectiveAt).getTime() : null, reason, confirmed: true }
    const approval = await approve({ action: 'plan_version_create', targetId: selectedPlan, payload: body, title: 'Phát hành phiên bản giá', summary: `${selectedPlan === 'ultra' ? 'Ultra' : 'Plus'} · ${money(monthlyPrice)}/tháng · ${money(annualPrice)}/năm${schedule ? ` · áp dụng ${date(body.effectiveAt!)}` : ' · áp dụng ngay'}` })
    if (!approval) return
    setLoading(true); setError(null); setNotice(null)
    try {
      await request(`/api/admin/plans/${selectedPlan}/versions`, { method: 'POST', headers: { 'X-Admin-Approval': approval.token }, body: approval.payloadJson })
      setNotice(schedule ? 'Đã lên lịch bảng giá mới.' : 'Đã áp dụng bảng giá mới.'); await load()
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Không thể lưu bảng giá.') }
    finally { setLoading(false) }
  }

  const cancelScheduled = async (planId: PaidPlan, version: PlanPriceVersion) => {
    const cancelReason = await askReason('Hủy lịch giá', 'Version giá đã publish không bị sửa; chỉ lịch tương lai được hủy.', 'Điều chỉnh kế hoạch kinh doanh')
    if (!cancelReason) return
    const body = { action: 'cancel', reason: cancelReason, confirmed: true }
    const approval = await approve({ action: 'plan_version_cancel', targetId: `${planId}:${version.id}`, payload: body, title: 'Hủy lịch giá tương lai', summary: `${planId === 'ultra' ? 'Ultra' : 'Plus'} · lịch ${date(version.effectiveAt)} · ${cancelReason}` })
    if (!approval) return
    setLoading(true); setError(null)
    try { await request(`/api/admin/plans/${planId}/versions/${version.id}`, { method: 'PATCH', headers: { 'X-Admin-Approval': approval.token }, body: approval.payloadJson }); setNotice('Đã hủy lịch giá.'); await load() }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Không thể hủy lịch.') }
    finally { setLoading(false) }
  }

  const current = plans?.[selectedPlan]?.current
  const history = useMemo(() => plans?.[selectedPlan]?.history || [], [plans, selectedPlan])
  const handleLogout = () => { void logout().catch(() => undefined) }
  if (authLoading) return <div className="flex min-h-screen items-center justify-center bg-bg"><Loader2 className="h-7 w-7 animate-spin text-accent" /></div>
  if (!user) return <AdminLogin />
  if (denied) return <AccessDenied message="Tài khoản này không có quyền quản trị bảng giá." onLogout={handleLogout} />

  return <AdminShell viewer={{ uid: user.uid, email: user.email }} refreshedAt={Date.now()} refreshing={loading} onRefresh={() => void load()} onLogout={handleLogout}>
    <main className="px-4 py-7 sm:px-6 xl:px-8"><div className="mx-auto max-w-shell">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-eyebrow text-accent-soft">Monetization catalog</p><h1 className="mt-3 text-title-1">Gói & giá</h1><p className="mt-2 max-w-2xl text-sm text-fg-secondary">Mỗi lần lưu tạo một phiên bản bất biến. Pricing, checkout và discount cùng dùng phiên bản đang hiệu lực.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />Làm mới</Button></div>
      {(error || notice) && <p className={cn('mt-5 rounded-xl border p-3 text-sm', error ? 'border-bad/25 bg-bad/10 text-bad' : 'border-ok/25 bg-ok/10 text-ok')}>{error || notice}</p>}
      <div className="mt-6 grid gap-4 md:grid-cols-2">{(['premium', 'ultra'] as PaidPlan[]).map((planId) => { const item = plans?.[planId]; return <button key={planId} onClick={() => setSelectedPlan(planId)} className={cn('rounded-xl border bg-surface-1 p-5 text-left shadow-card', selectedPlan === planId ? 'border-accent/45 ring-1 ring-accent/25' : 'border-white/[0.08]')}><div className="flex items-start justify-between"><PackageOpen className="h-5 w-5 text-accent-soft" /><span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', item?.current.saleEnabled ? 'bg-ok/10 text-ok' : 'bg-warn/10 text-warn')}>{item?.current.saleEnabled ? 'Đang bán' : 'Tạm dừng bán'}</span></div><h2 className="mt-4 font-display text-xl font-bold">{planId === 'ultra' ? 'CinePass Ultra' : 'CinePass Plus'}</h2><p className="mt-3 text-2xl font-bold">{money(item?.current.monthlyPrice || 0)} <span className="text-sm font-normal text-fg-muted">/tháng</span></p><p className="mt-1 text-sm text-fg-secondary">{money(item?.current.annualPrice || 0)} /năm</p>{item?.scheduled && <p className="mt-3 flex items-center gap-2 text-xs text-warn"><Clock3 className="h-3.5 w-3.5" />Có lịch mới lúc {date(item.scheduled.effectiveAt)}</p>}</button> })}</div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
        <form onSubmit={(event) => void submit(event)} className="rounded-xl border border-white/[0.08] bg-surface-1 p-6 shadow-card"><div className="flex items-center gap-3"><Save className="h-5 w-5 text-accent-soft" /><div><h2 className="font-semibold">Tạo phiên bản {selectedPlan === 'ultra' ? 'Ultra' : 'Plus'}</h2><p className="text-xs text-fg-muted">Hiện tại: {current ? `${money(current.monthlyPrice)} / ${money(current.annualPrice)}` : 'đang tải'}</p></div></div><div className="mt-6 space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="monthly-price">Giá tháng</Label><Input id="monthly-price" type="number" min={1000} max={100000000} value={monthlyPrice} onChange={(event) => setMonthlyPrice(Number(event.target.value))} /></div><div className="space-y-2"><Label htmlFor="annual-price">Giá năm</Label><Input id="annual-price" type="number" min={1000} max={100000000} value={annualPrice} onChange={(event) => setAnnualPrice(Number(event.target.value))} /></div></div><label className="flex items-center justify-between rounded-xl border border-white/[0.08] p-4 text-sm"><span><span className="block font-semibold">Cho phép bán</span><span className="mt-1 block text-xs text-fg-muted">Tắt sẽ chặn checkout và redeem công khai.</span></span><input type="checkbox" checked={saleEnabled} onChange={(event) => setSaleEnabled(event.target.checked)} className="h-5 w-5 accent-accent" /></label><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={schedule} onChange={(event) => setSchedule(event.target.checked)} className="h-4 w-4 accent-accent" />Lên lịch áp dụng</label>{schedule && <div className="space-y-2"><Label htmlFor="effective-at">Thời điểm áp dụng</Label><Input id="effective-at" type="datetime-local" value={effectiveAt} onChange={(event) => setEffectiveAt(event.target.value)} /></div>}<div className="space-y-2"><Label htmlFor="plan-reason">Lý do thay đổi</Label><Input id="plan-reason" value={reason} onChange={(event) => setReason(event.target.value.slice(0, 240))} /></div><div className="rounded-xl border border-accent/20 bg-accent/[0.06] p-4"><p className="text-xs text-fg-muted">Preview tiết kiệm năm</p><p className="mt-2 text-xl font-bold text-accent-soft">{money(saving)} · {savingPercent.toFixed(1)}%</p><p className="mt-2 text-xs text-fg-secondary">Bình quân {money(Math.round(annualPrice / 12))}/tháng</p></div><Button type="submit" disabled={loading || reason.trim().length < 3} className="h-12 w-full">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}Review và lưu</Button></div></form>
        <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-surface-1 shadow-card"><div className="flex items-center gap-3 border-b border-white/[0.08] p-5"><History className="h-5 w-5 text-fg-muted" /><div><h2 className="font-semibold">Lịch sử phiên bản</h2><p className="text-xs text-fg-muted">{history.length} phiên bản trong Firebase</p></div></div><div className="divide-y divide-white/[0.06]">{history.map((version) => <article key={version.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className={cn('rounded-full px-2 py-1 text-xs font-semibold', version.status === 'cancelled' ? 'bg-white/[0.06] text-fg-muted' : version.effectiveAt > Date.now() ? 'bg-warn/10 text-warn' : 'bg-ok/10 text-ok')}>{version.status === 'cancelled' ? 'Đã hủy' : version.effectiveAt > Date.now() ? 'Đã lên lịch' : 'Đã phát hành'}</span><span className="font-mono text-xs text-fg-muted">{version.id.slice(-8)}</span></div><p className="mt-3 font-semibold">{money(version.monthlyPrice)} / {money(version.annualPrice)}</p><p className="mt-1 text-xs text-fg-muted">Áp dụng {date(version.effectiveAt)} · {version.reason}</p></div>{version.status === 'published' && version.effectiveAt > Date.now() && <Button size="sm" variant="outline" className="text-bad" onClick={() => void cancelScheduled(selectedPlan, version)}><CalendarClock className="h-4 w-4" />Hủy lịch</Button>}</div></article>)}{!history.length && <div className="flex min-h-52 flex-col items-center justify-center text-center"><CheckCircle2 className="h-8 w-8 text-fg-muted" /><p className="mt-3 text-sm font-semibold">Đang dùng giá builtin</p><p className="mt-1 text-xs text-fg-muted">Lần lưu đầu tiên sẽ tạo version Firebase.</p></div>}</div></section>
      </div>
    </div></main>
    {stepUpDialog}
    {reasonDialog}
  </AdminShell>
}
