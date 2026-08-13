'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Loader2, RefreshCw, RotateCcw, ShieldBan, ShieldCheck } from 'lucide-react'
import { useAdminStepUp } from '@/components/admin/AdminStepUpDialog'
import { FormField } from '@/components/admin/AdminPrimitives'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { EntitlementGrant, EntitlementGrantState } from '@/lib/entitlement-grants'
import type { AccountEntitlement, BillingCycle, PaidPlan } from '@/lib/monetization'

type Request = <T>(path: string, init?: RequestInit) => Promise<T>

const planLabel = (plan: string) => plan === 'ultra' ? 'Ultra' : plan === 'premium' ? 'Plus' : 'CinePass'
const date = (value?: number | null) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(value) : 'Không thời hạn'

export function EntitlementGrantAdminPanel({ uid, request, onProjection }: { uid: string; request: Request; onProjection: (value: AccountEntitlement) => void }) {
  const { approve, dialog } = useAdminStepUp()
  const [state, setState] = useState<EntitlementGrantState | null>(null)
  const [projection, setProjection] = useState<AccountEntitlement | null>(null)
  const [plan, setPlan] = useState<PaidPlan>('premium')
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual')
  const [reason, setReason] = useState('')
  const [caseId, setCaseId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'shadow' | 'enabled'>('shadow')
  const [shadowMatches, setShadowMatches] = useState<boolean | null>(null)

  const load = useCallback(async () => {
    setBusy(true); setError(null)
    try {
      const payload = await request<{ state: EntitlementGrantState; entitlement: AccountEntitlement; mode: 'shadow' | 'enabled'; shadowComparison?: { matches: boolean } }>(`/api/admin/users/${encodeURIComponent(uid)}/entitlement-grants`)
      setState(payload.state); setProjection(payload.entitlement); setMode(payload.mode); setShadowMatches(payload.shadowComparison?.matches ?? null)
    } catch (next) { setError(next instanceof Error ? next.message : 'Không thể tải grant ledger.') }
    finally { setBusy(false) }
  }, [request, uid])

  useEffect(() => { void load() }, [load])

  const mutate = async (payload: Record<string, unknown>, title: string, destructive = false) => {
    if (!state || reason.trim().length < 3) return
    const body = { ...payload, idempotencyKey: crypto.randomUUID().replace(/-/g, ''), reason: reason.trim(), ...(caseId.trim() ? { caseId: caseId.trim() } : {}), expectedRevision: state.revision, confirmed: true }
    const action = payload.action === 'restrict' || payload.action === 'unrestrict' ? 'entitlement_restriction_update' : 'entitlement_grant_update'
    const approval = await approve({ action, targetId: uid, payload: body, title, summary: destructive ? 'Thao tác có hiệu lực ngay và được ghi audit.' : 'Grant mới được xếp sau quyền lợi hiện có.' })
    if (!approval) return
    setBusy(true); setError(null)
    try {
      const result = await request<{ state: EntitlementGrantState; entitlement: AccountEntitlement }>(`/api/admin/users/${encodeURIComponent(uid)}/entitlement-grants`, { method: 'PATCH', headers: { 'X-Admin-Approval': approval.token }, body: approval.payloadJson })
      setState(result.state); setProjection(result.entitlement); onProjection(result.entitlement); setReason(''); setCaseId('')
    } catch (next) { setError(next instanceof Error ? next.message : 'Không thể cập nhật quyền lợi.') }
    finally { setBusy(false) }
  }

  const grants = state ? Object.values(state.grants).sort((a, b) => b.createdAt - a.createdAt) : []
  return <section className="mt-6 space-y-5 rounded-xl border border-white/[0.08] bg-bg/40 p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">Grant quyền lợi V2</h3><p className="mt-1 text-xs text-fg-muted">Mỗi nguồn quyền lợi được giữ riêng; không xóa nhầm grant thanh toán.</p></div><Button size="sm" variant="outline" onClick={() => void load()} disabled={busy}><RefreshCw className={busy ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />Tải lại</Button></div>
    {mode === 'shadow' && <div className="rounded-lg border border-warn/30 bg-warn/10 p-4 text-sm text-warn">Shadow mode đang bật: chỉ so sánh projection, mọi thao tác ghi V2 bị khóa cho đến khi payment/discount dùng chung entitlement service. Kết quả hiện tại: {shadowMatches === null ? 'chưa so sánh' : shadowMatches ? 'khớp' : 'LỆCH — cần điều tra'}.</div>}
{projection && <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-surface-2 p-3"><p className="text-xs text-fg-muted">Gói hiệu lực</p><p className="mt-1 font-semibold">{planLabel(projection.plan)}</p></div><div className="rounded-lg bg-surface-2 p-3"><p className="text-xs text-fg-muted">Hết hạn</p><p className="mt-1 font-semibold">{date(projection.expiresAt)}</p></div><div className="rounded-lg bg-surface-2 p-3"><p className="text-xs text-fg-muted">Revision</p><p className="mt-1 font-semibold tabular-nums">{state?.revision ?? 0}</p></div></div>}
    {state?.restriction?.active && <div className="flex items-start gap-3 rounded-lg border border-bad/30 bg-bad/10 p-4 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 text-bad" /><div><p className="font-semibold text-bad">Đang tạm khóa quyền lợi</p><p className="mt-1 text-fg-secondary">{state.restriction.reason}</p></div></div>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><FormField label="Gói"><Select value={plan} onValueChange={(value) => setPlan(value as PaidPlan)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="premium">Plus</SelectItem><SelectItem value="ultra">Ultra</SelectItem></SelectContent></Select></FormField><FormField label="Chu kỳ"><Select value={billingCycle} onValueChange={(value) => setBillingCycle(value as BillingCycle)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">1 tháng</SelectItem><SelectItem value="annual">1 năm</SelectItem></SelectContent></Select></FormField><FormField label="Lý do"><Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Tối thiểu 3 ký tự" /></FormField><FormField label="Case / evidence"><Input value={caseId} onChange={(event) => setCaseId(event.target.value)} placeholder="Tùy chọn" /></FormField></div>
    <div className="flex flex-wrap gap-2"><Button disabled={mode !== 'enabled' || busy || reason.trim().length < 3} onClick={() => void mutate({ action: 'grant', plan, billingCycle, source: 'admin', scheduleAfterExisting: true }, 'Cấp grant mới')}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Cấp và xếp sau gói hiện có</Button>{state?.restriction?.active ? <Button variant="outline" disabled={mode !== 'enabled' || busy || reason.trim().length < 3} onClick={() => void mutate({ action: 'unrestrict' }, 'Gỡ tạm khóa quyền lợi', true)}><ShieldCheck className="h-4 w-4" />Gỡ tạm khóa</Button> : <Button variant="destructive" disabled={mode !== 'enabled' || busy || reason.trim().length < 3 || !caseId.trim()} onClick={() => void mutate({ action: 'restrict' }, 'Tạm khóa quyền lợi để điều tra', true)}><ShieldBan className="h-4 w-4" />Tạm khóa gian lận</Button>}</div>
    {error && <p role="alert" className="text-sm text-bad">{error}</p>}
    <div className="space-y-2"><h4 className="text-sm font-semibold">Các grant theo nguồn</h4>{grants.map((grant: EntitlementGrant) => <div key={grant.id} className="grid gap-3 rounded-lg border border-white/[0.07] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div><p className="text-sm font-semibold">{planLabel(grant.plan)} · {grant.source} · {grant.status}</p><p className="mt-1 text-xs text-fg-muted">{date(grant.startsAt)} → {date(grant.endsAt)} · {grant.id.slice(0, 8)}</p></div><div className="flex gap-2">{grant.source !== 'payment' && ['active','scheduled'].includes(grant.status) && <Button size="sm" variant="outline" disabled={mode !== 'enabled' || busy || reason.trim().length < 3} onClick={() => void mutate({ action: 'extend', grantId: grant.id, billingCycle }, 'Gia hạn grant cụ thể')}>Gia hạn</Button>}{grant.status === 'revoked' ? <Button size="sm" variant="outline" disabled={mode !== 'enabled' || busy || reason.trim().length < 3} onClick={() => void mutate({ action: 'restore', grantId: grant.id }, 'Khôi phục grant', true)}><RotateCcw className="h-4 w-4" />Khôi phục</Button> : grant.source !== 'payment' && grant.status !== 'expired' && <Button size="sm" variant="destructive" disabled={mode !== 'enabled' || busy || reason.trim().length < 3 || !caseId.trim()} onClick={() => void mutate({ action: 'revoke', grantId: grant.id }, 'Thu hồi đúng grant', true)}>Thu hồi</Button>}</div></div>)}{!grants.length && <p className="text-sm text-fg-muted">Chưa có grant.</p>}</div>
    {dialog}
  </section>
}
