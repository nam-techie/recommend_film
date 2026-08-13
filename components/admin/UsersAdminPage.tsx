'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Ban, CalendarClock, ChevronLeft, ChevronRight, KeyRound, Loader2, RefreshCw, Search, ShieldCheck, UserCog, Users } from 'lucide-react'
import type { AdminUserSummary, EntitlementAdminAction } from '@/lib/admin-users'
import type { MonetizationAuditLog } from '@/lib/server/audit'
import { useAdminApi } from '@/hooks/useAdminApi'
import { AccessDenied, AdminLogin, AdminShell } from '@/components/admin/AdminShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormField } from '@/components/admin/AdminPrimitives'
import type { AdminSensitiveTimelineItem, AdminUserInsights } from '@/lib/admin-user-insights'
import { cn } from '@/lib/utils'
import { useAdminStepUp } from '@/components/admin/AdminStepUpDialog'

const date = (value: number | null | undefined) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(value) : '—'
const planName = (plan: string) => plan === 'ultra' ? 'Ultra' : plan === 'premium' ? 'Plus' : 'CinePass'

export function UsersAdminPage() {
  const { user, loading: authLoading, logout, request, denied } = useAdminApi()
  const [usersList, setUsersList] = useState<AdminUserSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState<string | null>(null)
  const [cursorStack, setCursorStack] = useState<Array<string | null>>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [selected, setSelected] = useState<AdminUserSummary | null>(null)
  const [audits, setAudits] = useState<MonetizationAuditLog[]>([])
  const [reason, setReason] = useState('Hỗ trợ tài khoản theo yêu cầu')
  const [entitlementAction, setEntitlementAction] = useState<'grant' | 'replace' | 'extend' | 'cancel'>('grant')
  const [plan, setPlan] = useState<'premium' | 'ultra'>('premium')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [busy, setBusy] = useState(false)
  const [loadedAt, setLoadedAt] = useState<number | null>(null)
  const [detailTab, setDetailTab] = useState<'overview' | 'activity' | 'preferences' | 'plan' | 'audit'>('overview')
  const [insights, setInsights] = useState<AdminUserInsights | null>(null)
  const [timeline, setTimeline] = useState<AdminSensitiveTimelineItem[] | null>(null)
  const { approve, dialog: stepUpDialog } = useAdminStepUp()

  const load = useCallback(async (pageCursor: string | null = cursor) => {
    if (!user) return
    setLoading(true); setError(null)
    try {
      const payload = await request<{ users: AdminUserSummary[]; nextCursor: string | null }>(`/api/admin/users?limit=50${pageCursor ? `&cursor=${encodeURIComponent(pageCursor)}` : ''}`)
      setUsersList(payload.users); setNextCursor(payload.nextCursor); setLoadedAt(Date.now())
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Không thể tải người dùng.') }
    finally { setLoading(false) }
  }, [cursor, request, user])

  useEffect(() => { if (user) void load(null) }, [user, load])

  const lookup = async (event: FormEvent) => {
    event.preventDefault()
    if (!query.trim()) { setCursor(null); setCursorStack([]); await load(null); return }
    setLoading(true); setError(null)
    try { const payload = await request<{ user: AdminUserSummary }>(`/api/admin/users/lookup?query=${encodeURIComponent(query.trim())}`); setUsersList([payload.user]); setNextCursor(null) }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Không tìm thấy người dùng.') }
    finally { setLoading(false) }
  }

  const openDetail = async (item: AdminUserSummary) => {
    setSelected(item); setAudits([]); setInsights(null); setTimeline(null); setError(null); setDetailTab('overview')
    try { const payload = await request<{ user: AdminUserSummary; audits: MonetizationAuditLog[] }>(`/api/admin/users/${encodeURIComponent(item.uid)}`); setSelected(payload.user); setAudits(payload.audits) }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Không thể tải chi tiết.') }
  }

  const updateSelected = (next: AdminUserSummary) => { setSelected(next); setUsersList((items) => items.map((item) => item.uid === next.uid ? next : item)) }

  useEffect(() => {
    if (!selected || (detailTab !== 'activity' && detailTab !== 'preferences') || insights) return
    void request<AdminUserInsights>(`/api/admin/users/${encodeURIComponent(selected.uid)}/insights?range=30d`).then(setInsights).catch((next) => setError(next instanceof Error ? next.message : 'Không thể tải insights.'))
  }, [detailTab, insights, request, selected])

  const loadSensitiveTimeline = async () => {
    if (!selected || reason.trim().length < 3) return
    const body = { reason, days: 90 }
    const approval = await approve({ action: 'analytics_sensitive_read', targetId: selected.uid, payload: body, title: 'Mở timeline xem phim nhạy cảm', summary: `${selected.email || selected.uid} · 90 ngày · ${reason}` })
    if (!approval) return
    setBusy(true); setError(null)
    try { const payload = await request<{ items: AdminSensitiveTimelineItem[] }>(`/api/admin/users/${encodeURIComponent(selected.uid)}/timeline`, { method: 'POST', headers: { 'X-Admin-Approval': approval.token }, body: approval.payloadJson }); setTimeline(payload.items) }
    catch (next) { setError(next instanceof Error ? next.message : 'Không thể tải timeline.') }
    finally { setBusy(false) }
  }

  const setDisabled = async () => {
    if (!selected || reason.trim().length < 3) return
    const body = { disabled: !selected.disabled, reason, confirmed: true }
    const approval = await approve({ action: 'user_status_update', targetId: selected.uid, payload: body, title: `${selected.disabled ? 'Mở khóa' : 'Khóa'} tài khoản`, summary: `${selected.email || selected.uid} · ${reason}` })
    if (!approval) return
    setBusy(true); setError(null); setNotice(null)
    try {
      const payload = await request<{ user: AdminUserSummary; disconnectStatus: string }>(`/api/admin/users/${encodeURIComponent(selected.uid)}/status`, { method: 'PATCH', headers: { 'X-Admin-Approval': approval.token }, body: approval.payloadJson })
      updateSelected(payload.user); setNotice(payload.disconnectStatus === 'unavailable' ? 'Đã khóa tài khoản; Watch Party có thể chỉ ngắt khi kết nối lại.' : 'Đã cập nhật trạng thái tài khoản.')
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Không thể cập nhật tài khoản.') }
    finally { setBusy(false) }
  }

  const revokeSessions = async () => {
    if (!selected || reason.trim().length < 3) return
    const body = { reason, confirmed: true }
    const approval = await approve({ action: 'user_sessions_revoke', targetId: selected.uid, payload: body, title: 'Thu hồi toàn bộ phiên', summary: `${selected.email || selected.uid} · người dùng sẽ phải đăng nhập lại.` })
    if (!approval) return
    setBusy(true); setError(null)
    try { await request(`/api/admin/users/${encodeURIComponent(selected.uid)}/revoke-sessions`, { method: 'POST', headers: { 'X-Admin-Approval': approval.token }, body: approval.payloadJson }); setNotice('Đã thu hồi phiên đăng nhập.') }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Không thể thu hồi phiên.') }
    finally { setBusy(false) }
  }

  const mutateEntitlement = async () => {
    if (!selected || reason.trim().length < 3) return
    const body: EntitlementAdminAction = entitlementAction === 'cancel'
      ? { action: 'cancel', reason }
      : entitlementAction === 'extend'
        ? { action: 'extend', billingCycle, reason }
        : { action: entitlementAction, plan, billingCycle, reason }
    const requestBody = { ...body, confirmed: true }
    const approval = await approve({ action: 'user_entitlement_update', targetId: selected.uid, payload: requestBody, title: 'Xác nhận thay đổi gói', summary: `${selected.email || selected.uid} · ${entitlementAction === 'cancel' ? 'Hạ về CinePass ngay' : `${planName(entitlementAction === 'extend' ? selected.entitlement.plan : plan)} / ${billingCycle === 'annual' ? '1 năm' : '1 tháng'}`}` })
    if (!approval) return
    setBusy(true); setError(null)
    try {
      const payload = await request<{ entitlement: AdminUserSummary['entitlement'] }>(`/api/admin/users/${encodeURIComponent(selected.uid)}/entitlement`, { method: 'PATCH', headers: { 'X-Admin-Approval': approval.token }, body: approval.payloadJson })
      updateSelected({ ...selected, entitlement: payload.entitlement }); setNotice('Đã cập nhật gói tài khoản.')
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Không thể cập nhật gói.') }
    finally { setBusy(false) }
  }

  const shownUsers = useMemo(() => usersList, [usersList])
  const handleLogout = () => { void logout().catch(() => undefined) }
  if (authLoading) return <div className="flex min-h-screen items-center justify-center bg-bg"><Loader2 className="h-7 w-7 animate-spin text-accent" /></div>
  if (!user) return <AdminLogin />
  if (denied) return <AccessDenied message="Tài khoản này không có quyền quản trị người dùng." onLogout={handleLogout} />

  return <AdminShell viewer={{ uid: user.uid, email: user.email }} refreshedAt={loadedAt || Date.now()} refreshing={loading} onRefresh={() => void load()} onLogout={handleLogout}>
    <main className="px-4 py-7 sm:px-6 xl:px-8"><div className="mx-auto max-w-shell">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-eyebrow text-accent-soft">Identity & entitlement</p><h1 className="mt-3 text-title-1">Người dùng</h1><p className="mt-2 text-sm text-fg-secondary">Danh sách từ Firebase Authentication, ghép với hồ sơ và gói CinePass hiện tại.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />Làm mới</Button></div>
      <form onSubmit={(event) => void lookup(event)} className="mt-6 flex max-w-2xl gap-2"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm chính xác theo Firebase UID hoặc email" className="h-11" /><Button type="submit" variant="outline" className="h-11"><Search className="h-4 w-4" />Tìm</Button></form>
      {(error || notice) && <p role={error ? 'alert' : 'status'} className={cn('mt-4 rounded-xl border p-3 text-sm', error ? 'border-bad/25 bg-bad/10 text-bad' : 'border-ok/25 bg-ok/10 text-ok')}>{error || notice}</p>}
      <section className="mt-5 overflow-hidden rounded-xl border border-white/[0.08] bg-surface-1 shadow-card">
        <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-white/[0.08] text-xs uppercase tracking-wide text-fg-muted"><tr><th className="px-5 py-4">Tài khoản</th><th className="px-5 py-4">Provider</th><th className="px-5 py-4">Gói</th><th className="px-5 py-4">Hết hạn</th><th className="px-5 py-4">Trạng thái</th><th className="px-5 py-4" /></tr></thead><tbody className="divide-y divide-white/[0.06]">{shownUsers.map((item) => <tr key={item.uid} className="hover:bg-white/[0.025]"><td className="px-5 py-4"><p className="font-semibold">{item.displayName || 'Thành viên'}</p><p className="mt-1 max-w-56 truncate text-xs text-fg-muted">{item.email || item.uid}</p></td><td className="px-5 py-4 text-fg-secondary">{item.providers.join(', ') || 'anonymous'}</td><td className="px-5 py-4 font-semibold text-accent-soft">{planName(item.entitlement.plan)}</td><td className="px-5 py-4 text-fg-secondary">{date(item.entitlement.expiresAt)}</td><td className="px-5 py-4"><span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', item.disabled ? 'bg-bad/10 text-bad' : 'bg-ok/10 text-ok')}>{item.disabled ? 'Đã khóa' : 'Hoạt động'}</span></td><td className="px-5 py-4 text-right"><Button size="sm" variant="outline" onClick={() => void openDetail(item)}><UserCog className="h-4 w-4" />Quản lý</Button></td></tr>)}</tbody></table></div>
        {!shownUsers.length && !loading && <div className="flex min-h-48 flex-col items-center justify-center text-center"><Users className="h-9 w-9 text-fg-muted" /><p className="mt-3 text-sm font-semibold">Không có tài khoản</p></div>}
        <div className="flex items-center justify-end gap-2 border-t border-white/[0.08] p-4"><Button size="sm" variant="outline" disabled={!cursorStack.length || loading} onClick={() => { const stack = [...cursorStack]; const previous = stack.pop() ?? null; setCursorStack(stack); setCursor(previous); void load(previous) }}><ChevronLeft className="h-4 w-4" />Trước</Button><Button size="sm" variant="outline" disabled={!nextCursor || loading || Boolean(query.trim())} onClick={() => { setCursorStack((items) => [...items, cursor]); setCursor(nextCursor); void load(nextCursor) }}>Sau<ChevronRight className="h-4 w-4" /></Button></div>
      </section>
    </div></main>
    {stepUpDialog}
    <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null) }}>{selected && <DialogContent className="left-auto right-0 top-0 h-[100dvh] w-full max-w-3xl translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-none border-y-0 border-r-0 border-l border-white/10 bg-surface-1 p-0 sm:rounded-none"><div className="p-6"><DialogHeader><p className="text-eyebrow text-accent-soft">Chi tiết người dùng</p><DialogTitle className="mt-2 text-2xl">{selected.displayName || selected.email || 'Thành viên'}</DialogTitle><DialogDescription className="break-all font-mono text-xs text-fg-muted">{selected.uid}</DialogDescription></DialogHeader>
      <div role="tablist" aria-label="Chi tiết tài khoản" className="mt-6 flex gap-1 overflow-x-auto border-b border-white/[0.08]">{([['overview','Tổng quan'],['activity','Hoạt động'],['preferences','Sở thích'],['plan','Gói'],['audit','Audit']] as const).map(([id, label]) => <button type="button" role="tab" aria-selected={detailTab === id} key={id} onClick={() => setDetailTab(id)} className={cn('min-h-11 shrink-0 border-b-2 px-3 text-sm font-semibold', detailTab === id ? 'border-accent text-accent-soft' : 'border-transparent text-fg-muted hover:text-fg')}>{label}</button>)}</div>
      {detailTab === 'overview' && <><div className="mt-6 grid gap-3 sm:grid-cols-2">{[['Email', selected.email || '—'], ['Gói', planName(selected.entitlement.plan)], ['Tạo lúc', date(selected.createdAt)], ['Đăng nhập cuối', date(selected.lastSignInAt)]].map(([label, value]) => <div key={label} className="rounded-lg bg-white/[0.035] p-4"><p className="text-xs text-fg-muted">{label}</p><p className="mt-1 truncate text-sm font-semibold">{value}</p></div>)}</div>
      <div className="mt-6 space-y-2"><Label htmlFor="admin-user-reason">Lý do thao tác</Label><Input id="admin-user-reason" value={reason} onChange={(event) => setReason(event.target.value.slice(0, 240))} className="h-11" /></div>
      <div className="mt-5 flex flex-wrap gap-2"><Button variant={selected.disabled ? 'outline' : 'destructive'} disabled={busy || selected.protectedAdmin} onClick={() => void setDisabled()}>{selected.disabled ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}{selected.disabled ? 'Mở khóa' : 'Khóa tài khoản'}</Button><Button variant="outline" disabled={busy} onClick={() => void revokeSessions()}><KeyRound className="h-4 w-4" />Thu hồi phiên</Button></div></>}
      {detailTab === 'activity' && <div className="mt-6 border border-white/[0.08] p-5"><h3 className="font-semibold">Hoạt động tổng hợp · 30 ngày</h3>{insights ? <><div className="mt-4 grid gap-3 sm:grid-cols-2">{[['Trạng thái', insights.online ? 'Đang online' : `Offline · ${date(insights.lastSeen)}`], ['Qualified views', String(insights.qualifiedViews)], ['Giờ xem', String(insights.watchHours)], ['Completion', `${insights.completionRate}%`]].map(([label, value]) => <div key={label} className="rounded-md bg-surface-2 p-3"><p className="text-xs text-fg-muted">{label}</p><p className="mt-1 text-sm font-semibold tabular-nums">{value}</p></div>)}</div><div className="mt-5 border-t border-white/[0.08] pt-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="text-sm font-semibold">Timeline tựa phim · dữ liệu nhạy cảm</h4><p className="mt-1 text-xs text-fg-muted">Yêu cầu analytics.read_sensitive, MFA, lý do và audit cho mỗi lần mở.</p></div><Button variant="outline" onClick={() => void loadSensitiveTimeline()} disabled={busy || reason.trim().length < 3}>Mở timeline 90 ngày</Button></div>{timeline && <div className="mt-4 max-h-72 divide-y divide-white/[0.07] overflow-y-auto">{timeline.map((item) => <div key={item.sessionId} className="py-3"><div className="flex justify-between gap-3"><p className="text-sm font-semibold">{item.movieTitle}</p><span className="text-xs tabular-nums text-fg-muted">{Math.round(item.activeSeconds / 60)} phút</span></div><p className="mt-1 text-xs text-fg-muted">{item.episodeName || item.movieSlug} · {date(item.startedAt)} · {item.source === 'watch_party' ? 'Xem chung' : 'Solo'}</p></div>)}{!timeline.length && <p className="py-4 text-sm text-fg-muted">Không có session trong 90 ngày.</p>}</div>}</div></> : <p className="mt-3 text-sm text-fg-muted">Đang tải insights…</p>}</div>}
      {detailTab === 'preferences' && <div className="mt-6 border border-white/[0.08] p-5"><h3 className="font-semibold">Sở thích & cá nhân hóa</h3>{insights ? <><p className="mt-2 text-sm text-fg-secondary">{insights.personalizationEnabled ? insights.eligibleForPersonalization ? 'Đã đủ tín hiệu để cá nhân hóa.' : 'Đã bật nhưng chưa đủ 3 phim và 60 phút xem hợp lệ.' : 'Người dùng đã tắt cá nhân hóa.'}</p><div className="mt-4 flex flex-wrap gap-2">{insights.topGenres.map((item) => <span key={item.genre} className="rounded-full border border-white/[0.1] bg-surface-2 px-3 py-2 text-xs">{item.genre} · {Math.round(item.score * 100)}%</span>)}{!insights.topGenres.length && <span className="text-sm text-fg-muted">Cold start dùng favorite genres, watchlist và biên tập.</span>}</div></> : <p className="mt-2 text-sm text-fg-muted">Đang tính user features…</p>}</div>}
      {detailTab === 'plan' && <section className="mt-6 border border-white/[0.08] bg-bg/40 p-5"><div className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-accent-soft" /><h3 className="font-semibold">Quản lý gói</h3></div><div className="mt-4 grid gap-4 sm:grid-cols-3"><FormField label="Thao tác" description="Chọn hành động áp dụng cho entitlement hiện tại."><Select value={entitlementAction} onValueChange={(value) => setEntitlementAction(value as typeof entitlementAction)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="grant">Cấp gói</SelectItem><SelectItem value="replace">Đổi gói</SelectItem><SelectItem value="extend">Gia hạn</SelectItem><SelectItem value="cancel">Hủy gói</SelectItem></SelectContent></Select></FormField><FormField label="Gói mới" description={entitlementAction === 'extend' ? 'Gia hạn giữ nguyên gói hiện tại.' : entitlementAction === 'cancel' ? 'Hủy sẽ đưa account về CinePass.' : undefined}><Select disabled={entitlementAction === 'extend' || entitlementAction === 'cancel'} value={plan} onValueChange={(value) => setPlan(value as typeof plan)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="premium">CinePass Plus</SelectItem><SelectItem value="ultra">CinePass Ultra</SelectItem></SelectContent></Select></FormField><FormField label="Chu kỳ" description={entitlementAction === 'cancel' ? 'Không áp dụng khi hủy gói.' : undefined}><Select disabled={entitlementAction === 'cancel'} value={billingCycle} onValueChange={(value) => setBillingCycle(value as typeof billingCycle)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">1 tháng</SelectItem><SelectItem value="annual">1 năm</SelectItem></SelectContent></Select></FormField></div><div className="mt-5 grid gap-3 border-l-2 border-info bg-info/[0.05] p-4 sm:grid-cols-2"><div><p className="text-xs text-fg-muted">Hiện tại</p><p className="mt-1 font-semibold">{planName(selected.entitlement.plan)} · hết hạn {date(selected.entitlement.expiresAt)}</p></div><div><p className="text-xs text-fg-muted">Sau thao tác</p><p className="mt-1 font-semibold">{entitlementAction === 'cancel' ? 'CinePass · áp dụng ngay' : `${planName(entitlementAction === 'extend' ? selected.entitlement.plan : plan)} · ${billingCycle === 'annual' ? 'thêm 1 năm' : 'thêm 1 tháng'}`}</p></div></div><div className="mt-4 flex justify-end"><Button variant={entitlementAction === 'cancel' ? 'destructive' : 'default'} disabled={busy || reason.trim().length < 3} onClick={() => void mutateEntitlement()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCog className="h-4 w-4" />}{entitlementAction === 'cancel' ? 'Xác nhận hủy gói' : 'Xác nhận thay đổi'}</Button></div></section>}
      {detailTab === 'audit' && <section className="mt-6"><h3 className="font-semibold">Audit gần đây</h3><div className="mt-3 space-y-2">{audits.map((audit) => <div key={audit.id} className="rounded-lg border border-white/[0.06] p-3 text-xs"><div className="flex justify-between gap-3"><span className="font-semibold">{audit.action}</span><span className="text-fg-muted">{date(audit.createdAt)}</span></div><p className="mt-1 text-fg-secondary">{audit.reason}</p></div>)}{!audits.length && <p className="text-sm text-fg-muted">Chưa có audit.</p>}</div></section>}
    </div></DialogContent>}</Dialog>
  </AdminShell>
}
