'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Archive, BadgePercent, CalendarDays, Check, Copy, Loader2, Pause, Play, Plus, RefreshCw, ShieldCheck, Sparkles, TicketPercent, UserRound } from 'lucide-react'
import { AccessDenied, AdminLogin, AdminShell } from '@/components/admin/AdminShell'
import { useAdminStepUp } from '@/components/admin/AdminStepUpDialog'
import { useAdminReasonDialog } from '@/components/admin/AdminReasonDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { normalizeDiscountCode, PLAN_DEFINITIONS, type BillingCycle, type DiscountCode, type DiscountStatus, type PaidPlan } from '@/lib/monetization'
import { usePlanCatalog } from '@/hooks/usePlanCatalog'
import { useAdminApi } from '@/hooks/useAdminApi'

const formatCurrency = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`
const formatDate = (value: number) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(value)
const toLocalInput = (timestamp: number) => {
  const date = new Date(timestamp - new Date(timestamp).getTimezoneOffset() * 60_000)
  return date.toISOString().slice(0, 16)
}
const defaultEnd = () => Date.now() + 30 * 24 * 60 * 60_000

function randomCode() { return `CINE${crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase().slice(0, 7)}` }

function StatusBadge({ status }: { status: DiscountStatus }) {
  const label = status === 'active' ? 'Đang chạy' : status === 'paused' ? 'Tạm dừng' : 'Lưu trữ'
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', status === 'active' ? 'bg-ok/10 text-ok' : status === 'paused' ? 'bg-warn/10 text-warn' : 'bg-white/[0.06] text-fg-muted')}><span className={cn('h-1.5 w-1.5 rounded-full', status === 'active' ? 'bg-ok' : status === 'paused' ? 'bg-warn' : 'bg-fg-muted')} />{label}</span>
}

export function DiscountAdminPage() {
  const { user, loading: authLoading, logout, request, denied } = useAdminApi()
  const { approve, dialog: stepUpDialog } = useAdminStepUp()
  const { askReason, reasonDialog } = useAdminReasonDialog()
  const { plans: catalog } = usePlanCatalog()
  const [codes, setCodes] = useState<DiscountCode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [percent, setPercent] = useState(100)
  const [targetPlan, setTargetPlan] = useState<PaidPlan>('premium')
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const [maxRedemptions, setMaxRedemptions] = useState(1)
  const [startsAt, setStartsAt] = useState(() => toLocalInput(Date.now()))
  const [endsAt, setEndsAt] = useState(() => toLocalInput(defaultEnd()))
  const [targetUid, setTargetUid] = useState('')
  const [note, setNote] = useState('')
  const [reason, setReason] = useState('Tạo chiến dịch mã giảm giá')

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true); setError(null)
    try { const payload = await request<{ codes: DiscountCode[] }>('/api/admin/discount-codes'); setCodes(payload.codes || []) }
    catch (nextError) { if (!denied) setError(nextError instanceof Error ? nextError.message : 'Không thể tải dữ liệu.') }
    finally { setLoading(false) }
  }, [denied, request, user])

  useEffect(() => { if (user) void load() }, [load, user])

  const resetForm = () => {
    setCode(''); setPercent(100); setTargetPlan('premium'); setBillingCycle('monthly'); setMaxRedemptions(1)
    setStartsAt(toLocalInput(Date.now())); setEndsAt(toLocalInput(defaultEnd())); setTargetUid(''); setNote('')
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(null); setNotice(null)
    const body = { code, percent, targetPlan, billingCycle, maxRedemptions, startsAt: new Date(startsAt).getTime(), endsAt: new Date(endsAt).getTime(), targetUid, note, reason, confirmed: true }
    const approval = await approve({ action: 'discount_code_create', targetId: normalizeDiscountCode(code), payload: body, title: 'Tạo mã giảm giá', summary: `${normalizeDiscountCode(code)} · ${PLAN_DEFINITIONS[targetPlan].name} · giảm ${percent}% · ${reason}` })
    if (!approval) return
    setCreating(true)
    try {
      const payload = await request<{ code: DiscountCode }>('/api/admin/discount-codes', { method: 'POST', headers: { 'X-Admin-Approval': approval.token }, body: approval.payloadJson })
      setCodes((current) => [payload.code, ...current]); setNotice(`Đã tạo mã ${payload.code.code}.`); resetForm()
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Không thể tạo mã.') }
    finally { setCreating(false) }
  }

  const setStatus = async (item: DiscountCode, status: DiscountStatus) => {
    const actionReason = await askReason(`Xác nhận ${status === 'active' ? 'bật' : status === 'paused' ? 'tạm dừng' : 'lưu trữ'} mã`, `Mã giảm giá ${item.code}`, `Điều chỉnh trạng thái mã ${item.code}`)
    if (!actionReason) return
    const body = { status, reason: actionReason, confirmed: true }
    const approval = await approve({ action: 'discount_code_update', targetId: item.code, payload: body, title: 'Cập nhật mã giảm giá', summary: `${item.code} · ${status} · ${actionReason}` })
    if (!approval) return
    setUpdating(item.code); setError(null); setNotice(null)
    try {
      const payload = await request<{ code: DiscountCode }>(`/api/admin/discount-codes/${encodeURIComponent(item.code)}`, { method: 'PATCH', headers: { 'X-Admin-Approval': approval.token }, body: approval.payloadJson })
      setCodes((current) => current.map((entry) => entry.code === item.code ? payload.code : entry)); setNotice(`Đã cập nhật ${item.code}.`)
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Không thể cập nhật mã.') }
    finally { setUpdating(null) }
  }

  const stats = useMemo(() => ({ active: codes.filter((item) => item.status === 'active' && item.endsAt > Date.now()).length, uses: codes.reduce((sum, item) => sum + item.redemptionCount, 0), capacity: codes.reduce((sum, item) => sum + item.maxRedemptions, 0) }), [codes])
  const price = billingCycle === 'annual' ? catalog[targetPlan].annualPrice : catalog[targetPlan].monthlyPrice
  const finalPrice = Math.max(0, price - Math.floor(price * percent / 100))
  const handleLogout = () => { void logout().catch(() => undefined) }

  if (authLoading) return <div className="flex min-h-screen items-center justify-center bg-bg"><Loader2 className="h-7 w-7 animate-spin text-accent" /></div>
  if (!user) return <AdminLogin />
  if (denied) return <AccessDenied message="Tài khoản này không có quyền quản trị mã giảm giá." onLogout={handleLogout} />

  return <AdminShell viewer={{ uid: user.uid, email: user.email }} refreshedAt={Date.now()} refreshing={loading} onRefresh={() => void load()} onLogout={handleLogout}>
    <div className="px-4 py-7 sm:px-6 xl:px-8 xl:py-9"><div className="mx-auto max-w-shell">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="mb-3 flex items-center gap-2 text-eyebrow text-accent-soft"><TicketPercent className="h-4 w-4" />Monetization</div><h1 className="text-title-1">Mã giảm giá</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-fg-secondary">Tạo mã CinePass Plus hoặc CinePass Ultra. Mã giảm 100% có thể kích hoạt gói ngay để kiểm thử mà chưa cần cổng thanh toán.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading} className="h-11 self-start border-white/10"><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />Làm mới</Button></div>

      <div className="mt-7 grid gap-4 sm:grid-cols-3">{[
        { label: 'Mã đang chạy', value: stats.active, icon: BadgePercent }, { label: 'Lượt đã dùng', value: stats.uses, icon: Check }, { label: 'Tổng dung lượng', value: stats.capacity, icon: UserRound },
      ].map((stat) => <div key={stat.label} className="rounded-xl border border-white/[0.08] bg-surface-1 p-5 shadow-card"><stat.icon className="h-5 w-5 text-accent-soft" /><p className="mt-5 font-display text-2xl font-bold">{stat.value}</p><p className="mt-1 text-xs text-fg-muted">{stat.label}</p></div>)}</div>

      {(error || notice) && <div role={error ? 'alert' : 'status'} className={cn('mt-5 rounded-xl border p-3 text-sm', error ? 'border-bad/25 bg-bad/10 text-bad' : 'border-ok/25 bg-ok/10 text-ok')}>{error || notice}</div>}

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(320px,0.75fr)_minmax(0,1.25fr)]">
        <form onSubmit={(event) => void submit(event)} className="h-fit rounded-xl border border-white/[0.08] bg-surface-1 p-5 shadow-card sm:p-6">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent-soft"><Plus className="h-5 w-5" /></span><div><h2 className="text-sm font-semibold">Tạo mã mới</h2><p className="mt-1 text-xs text-fg-muted">Mỗi user chỉ dùng một lần</p></div></div>
          <div className="mt-6 space-y-5">
            <div className="space-y-2"><Label htmlFor="discount-code">Mã giảm giá</Label><div className="flex gap-2"><Input id="discount-code" value={code} onChange={(event) => setCode(normalizeDiscountCode(event.target.value))} maxLength={32} placeholder="NAMULTRA" className="h-11 font-mono uppercase" /><Button type="button" variant="outline" onClick={() => setCode(randomCode())} className="h-11 shrink-0 border-white/10"><Sparkles className="h-4 w-4" />Tạo mã</Button></div></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Gói nhận được</Label><Select value={targetPlan} onValueChange={(value) => setTargetPlan(value as PaidPlan)}><SelectTrigger aria-label="Gói nhận được"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="premium">CinePass Plus</SelectItem><SelectItem value="ultra">CinePass Ultra</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Thời hạn</Label><Select value={billingCycle} onValueChange={(value) => setBillingCycle(value as BillingCycle)}><SelectTrigger aria-label="Thời hạn"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">1 tháng</SelectItem><SelectItem value="annual">1 năm</SelectItem></SelectContent></Select></div></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="discount-percent">Phần trăm giảm</Label><Input id="discount-percent" type="number" min={1} max={100} value={percent} onChange={(event) => setPercent(Number(event.target.value))} className="h-11" /></div><div className="space-y-2"><Label htmlFor="discount-limit">Tổng lượt sử dụng</Label><Input id="discount-limit" type="number" min={1} max={1_000_000} value={maxRedemptions} onChange={(event) => setMaxRedemptions(Number(event.target.value))} className="h-11" /></div></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="discount-start">Bắt đầu</Label><Input id="discount-start" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="h-11" /></div><div className="space-y-2"><Label htmlFor="discount-end">Kết thúc</Label><Input id="discount-end" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="h-11" /></div></div>
            <div className="space-y-2"><Label htmlFor="discount-uid">Chỉ định Firebase UID <span className="font-normal text-fg-muted">(không bắt buộc)</span></Label><Input id="discount-uid" value={targetUid} onChange={(event) => setTargetUid(event.target.value.trim())} placeholder="Để trống nếu ai có mã cũng dùng được" className="h-11 font-mono" /></div>
            <div className="space-y-2"><Label htmlFor="discount-note">Ghi chú nội bộ</Label><textarea id="discount-note" value={note} onChange={(event) => setNote(event.target.value.slice(0, 240))} rows={3} placeholder="Ví dụ: Tặng bạn thân Ultra 1 năm" className="w-full rounded-md border border-input bg-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent" /></div>
            <div className="space-y-2"><Label htmlFor="discount-reason">Lý do thao tác</Label><Input id="discount-reason" value={reason} onChange={(event) => setReason(event.target.value.slice(0, 240))} minLength={3} maxLength={240} /></div>
            <div className="rounded-xl border border-accent/20 bg-accent/[0.06] p-4"><div className="flex items-center justify-between gap-3 text-sm"><span className="text-fg-secondary">Giá {PLAN_DEFINITIONS[targetPlan].name}</span><span className="font-mono font-semibold">{formatCurrency(price)}</span></div><div className="mt-2 flex items-center justify-between gap-3 text-sm"><span className="text-fg-secondary">Sau giảm {percent}%</span><span className="font-display text-xl font-bold text-accent-soft">{formatCurrency(finalPrice)}</span></div>{finalPrice === 0 && <p className="mt-2 flex items-center gap-2 text-xs text-ok"><ShieldCheck className="h-3.5 w-3.5" />User có thể kích hoạt ngay, không cần thanh toán.</p>}</div>
            <Button type="submit" disabled={creating || code.length < 3 || percent < 1 || percent > 100 || maxRedemptions < 1 || !startsAt || !endsAt || reason.trim().length < 3} className="h-12 w-full bg-accent-strong font-semibold hover:bg-accent">{creating ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Plus className="h-4 w-4" />Tạo mã giảm giá</>}</Button>
          </div>
        </form>

        <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-surface-1 shadow-card"><div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4"><div><h2 className="text-sm font-semibold">Danh sách mã</h2><p className="mt-1 text-xs text-fg-muted">{codes.length} chiến dịch</p></div><BadgePercent className="h-5 w-5 text-fg-muted" /></div>
          {loading && !codes.length ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div> : !codes.length ? <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center"><TicketPercent className="h-9 w-9 text-fg-muted" /><p className="mt-3 text-sm font-semibold">Chưa có mã giảm giá</p><p className="mt-1 text-xs text-fg-muted">Tạo mã 100% đầu tiên để thử nâng tài khoản.</p></div> : <div className="divide-y divide-white/[0.06]">{codes.map((item) => {
            const itemPrice = item.billingCycle === 'annual' ? catalog[item.targetPlan].annualPrice : catalog[item.targetPlan].monthlyPrice
            return <article key={item.code} className="p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => void navigator.clipboard.writeText(item.code)} title="Sao chép mã" className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-2.5 py-1.5 font-mono text-sm font-bold text-accent-soft hover:bg-accent/15">{item.code}<Copy className="h-3.5 w-3.5" /></button><StatusBadge status={item.status} /><span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-xs font-semibold text-fg-secondary">{PLAN_DEFINITIONS[item.targetPlan].name} · {item.billingCycle === 'annual' ? '1 năm' : '1 tháng'}</span></div><p className="mt-3 text-sm text-fg-secondary">Giảm <strong className="text-fg">{item.percent}%</strong> · {formatCurrency(itemPrice)} → <strong className="text-accent-soft">{formatCurrency(Math.max(0, itemPrice - Math.floor(itemPrice * item.percent / 100)))}</strong></p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-fg-muted"><span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{formatDate(item.startsAt)} – {formatDate(item.endsAt)}</span><span>{item.redemptionCount}/{item.maxRedemptions} lượt</span>{item.targetUid && <span className="font-mono">UID: {item.targetUid.slice(0, 8)}…</span>}</div>{item.note && <p className="mt-3 rounded-lg bg-white/[0.035] px-3 py-2 text-xs leading-5 text-fg-secondary">{item.note}</p>}</div><div className="flex shrink-0 gap-2">{item.status === 'active' && <Button size="sm" variant="outline" disabled={updating === item.code} onClick={() => void setStatus(item, 'paused')} className="border-white/10"><Pause className="h-3.5 w-3.5" />Dừng</Button>}{item.status === 'paused' && <Button size="sm" variant="outline" disabled={updating === item.code} onClick={() => void setStatus(item, 'active')} className="border-white/10"><Play className="h-3.5 w-3.5" />Bật</Button>}{item.status !== 'archived' && <Button size="icon" variant="ghost" disabled={updating === item.code} onClick={() => void setStatus(item, 'archived')} aria-label={`Lưu trữ ${item.code}`} className="h-9 w-9 text-fg-muted hover:text-bad"><Archive className="h-4 w-4" /></Button>}</div></div></article>
          })}</div>}
        </section>
      </div>
    </div></div>
    {stepUpDialog}
    {reasonDialog}
  </AdminShell>
}
