'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Archive, ExternalLink, Link2, Loader2, Pause, Play, RefreshCw, Save, ShieldAlert } from 'lucide-react'
import type { AffiliateLink, AffiliatePolicy } from '@/lib/affiliate'
import { AccessDenied, AdminLogin, AdminShell } from '@/components/admin/AdminShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAdminApi } from '@/hooks/useAdminApi'
import { cn } from '@/lib/utils'
import { useAdminStepUp } from '@/components/admin/AdminStepUpDialog'

type LinkWithStats = AffiliateLink & { stats: { impressions: number; clicks: number; ctr: number } }
type Payload = { links: LinkWithStats[]; policy: AffiliatePolicy }
const toLocal = (value: number) => new Date(value - new Date(value).getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
const formatDate = (value: number) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(value)

export function AffiliateAdminPage() {
  const { user, loading: authLoading, logout, request, denied } = useAdminApi()
  const [data, setData] = useState<Payload>({ links: [], policy: { enabled: false, updatedAt: 0 } })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | AffiliateLink['status']>('all')
  const [campaignName, setCampaignName] = useState('Shopee ưu đãi tuần này')
  const [productTitle, setProductTitle] = useState('Sản phẩm nổi bật trên Shopee')
  const [destinationUrl, setDestinationUrl] = useState('https://shopee.vn/')
  const [ctaLabel, setCtaLabel] = useState('Xem ưu đãi trên Shopee')
  const [weight, setWeight] = useState(1)
  const [startsAt, setStartsAt] = useState(() => toLocal(Date.now()))
  const [endsAt, setEndsAt] = useState(() => toLocal(Date.now() + 30 * 24 * 60 * 60_000))
  const [reason, setReason] = useState('Bổ sung chiến dịch affiliate')
  const { approve, dialog: stepUpDialog } = useAdminStepUp()

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true); setError(null)
    try { setData(await request<Payload>('/api/admin/affiliate-links')) }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Không thể tải kho affiliate.') }
    finally { setLoading(false) }
  }, [request, user])

  useEffect(() => { if (user) void load() }, [load, user])

  const visibleLinks = useMemo(() => data.links.filter((link) => {
    const matchesStatus = filter === 'all' || link.status === filter
    const needle = query.trim().toLocaleLowerCase('vi')
    return matchesStatus && (!needle || `${link.campaignName} ${link.productTitle} ${link.destinationUrl}`.toLocaleLowerCase('vi').includes(needle))
  }), [data.links, filter, query])
  const eligibleCount = data.links.filter((link) => link.status === 'active' && link.startsAt <= Date.now() && link.endsAt > Date.now()).length

  const createLink = async (event: FormEvent) => {
    event.preventDefault()
    const body = { campaignName, productTitle, destinationUrl, ctaLabel, weight, startsAt: new Date(startsAt).getTime(), endsAt: new Date(endsAt).getTime(), reason, confirmed: true }
    const approval = await approve({ action: 'affiliate_link_create', targetId: 'new', payload: body, title: 'Thêm link Shopee Affiliate', summary: `${campaignName} · trọng số ${weight} · chạy đến ${formatDate(body.endsAt)}` })
    if (!approval) return
    setLoading(true); setError(null); setNotice(null)
    try {
      await request('/api/admin/affiliate-links', { method: 'POST', headers: { 'X-Admin-Approval': approval.token }, body: approval.payloadJson })
      setNotice('Đã thêm link Shopee vào kho.'); await load()
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Không thể tạo affiliate link.') }
    finally { setLoading(false) }
  }

  const mutateLink = async (link: LinkWithStats, status: AffiliateLink['status']) => {
    const action = status === 'active' ? 'kích hoạt' : status === 'paused' ? 'tạm dừng' : 'lưu trữ'
    const actionReason = window.prompt(`Nhập lý do ${action} link:`, `Điều chỉnh trạng thái chiến dịch ${link.campaignName}`)?.trim()
    if (!actionReason) return
    const body = { status, reason: actionReason, confirmed: true }
    const approval = await approve({ action: 'affiliate_link_update', targetId: link.id, payload: body, title: `${action[0].toUpperCase()}${action.slice(1)} affiliate link`, summary: `${link.campaignName} · ${actionReason}` })
    if (!approval) return
    setLoading(true); setError(null)
    try { await request(`/api/admin/affiliate-links/${link.id}`, { method: 'PATCH', headers: { 'X-Admin-Approval': approval.token }, body: approval.payloadJson }); setNotice(`Đã ${action} link.`); await load() }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : `Không thể ${action} link.`) }
    finally { setLoading(false) }
  }

  const togglePolicy = async () => {
    const enabled = !data.policy.enabled
    const policyReason = window.prompt(`Nhập lý do ${enabled ? 'bật' : 'tắt'} affiliate toàn hệ thống:`, enabled ? 'Bắt đầu chiến dịch affiliate' : 'Tạm dừng khẩn cấp')?.trim()
    if (!policyReason) return
    const body = { enabled, reason: policyReason, confirmed: true }
    const approval = await approve({ action: 'affiliate_policy_update', targetId: 'affiliatePolicy', payload: body, title: `${enabled ? 'Bật' : 'Tắt'} affiliate toàn hệ thống`, summary: policyReason })
    if (!approval) return
    setLoading(true); setError(null)
    try { await request('/api/admin/affiliate-policy', { method: 'PATCH', headers: { 'X-Admin-Approval': approval.token }, body: approval.payloadJson }); setNotice(`Đã ${enabled ? 'bật' : 'tắt'} affiliate.`); await load() }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Không thể cập nhật công tắc affiliate.') }
    finally { setLoading(false) }
  }

  const handleLogout = () => { void logout().catch(() => undefined) }
  if (authLoading) return <div className="flex min-h-screen items-center justify-center bg-bg"><Loader2 className="h-7 w-7 animate-spin text-accent" /></div>
  if (!user) return <AdminLogin />
  if (denied) return <AccessDenied message="Tài khoản này không có quyền quản trị affiliate." onLogout={handleLogout} />

  return <AdminShell viewer={{ uid: user.uid, email: user.email }} refreshedAt={Date.now()} refreshing={loading} onRefresh={() => void load()} onLogout={handleLogout}>
    <main className="px-4 py-7 sm:px-6 xl:px-8"><div className="mx-auto max-w-shell space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-eyebrow text-accent-soft">Affiliate inventory</p><h1 className="mt-3 text-title-1">Shopee Affiliate</h1><p className="mt-2 max-w-2xl text-sm text-fg-secondary">Quản lý kho link, lịch chạy, trọng số chọn ngẫu nhiên và công tắc khẩn cấp.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />Làm mới</Button></div>
      {(error || notice) && <div className={cn('rounded-xl border px-4 py-3 text-sm', error ? 'border-danger/40 bg-danger/10 text-danger' : 'border-success/30 bg-success/10 text-success')}>{error || notice}</div>}
      <section className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-surface-1 p-5 md:flex-row md:items-center md:justify-between"><div className="flex items-center gap-3"><span className={cn('flex h-11 w-11 items-center justify-center rounded-xl', data.policy.enabled ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning')}><ShieldAlert className="h-5 w-5" /></span><div><p className="font-bold">Affiliate toàn hệ thống: {data.policy.enabled ? 'Đang bật' : 'Đang tắt'}</p><p className="text-sm text-fg-muted">{eligibleCount} link đang đủ điều kiện chạy</p></div></div><Button variant={data.policy.enabled ? 'destructive' : 'default'} onClick={() => void togglePolicy()} disabled={loading || (!data.policy.enabled && eligibleCount === 0)}>{data.policy.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{data.policy.enabled ? 'Tắt khẩn cấp' : 'Bật affiliate'}</Button></section>
      {data.policy.enabled && eligibleCount === 0 && <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">Cảnh báo: policy đang bật nhưng pool link hợp lệ đang rỗng. Runtime sẽ fail-open và cho xem phim ngay.</div>}
      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <form onSubmit={createLink} className="h-fit space-y-4 rounded-2xl border border-white/[0.08] bg-surface-1 p-5"><div><h2 className="text-lg font-bold">Thêm link mới</h2><p className="mt-1 text-xs text-fg-muted">URL chỉ nhận HTTPS trên shopee.vn và không thể đổi sau khi tạo.</p></div>
          <Field label="Tên chiến dịch"><Input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} required minLength={3} maxLength={80} /></Field>
          <Field label="Tên sản phẩm"><Input value={productTitle} onChange={(event) => setProductTitle(event.target.value)} required minLength={3} maxLength={120} /></Field>
          <Field label="URL Shopee"><Input type="url" value={destinationUrl} onChange={(event) => setDestinationUrl(event.target.value)} required /></Field>
          <Field label="Nhãn CTA"><Input value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} required minLength={3} maxLength={60} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Trọng số"><Input type="number" value={weight} min={1} max={100} onChange={(event) => setWeight(Number(event.target.value))} required /></Field><div className="rounded-xl border border-accent/25 bg-accent/[0.07] p-3 text-xs text-fg-secondary"><p className="font-bold text-fg">Preview</p><p className="mt-1 line-clamp-2">{productTitle}</p><span className="mt-2 inline-flex rounded-full bg-[#ee4d2d] px-3 py-1 font-bold text-white">{ctaLabel}</span></div></div>
          <Field label="Bắt đầu"><Input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required /></Field><Field label="Kết thúc"><Input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} required /></Field>
          <Field label="Lý do"><Input value={reason} onChange={(event) => setReason(event.target.value)} required minLength={3} maxLength={240} /></Field>
          <Button type="submit" className="w-full" disabled={loading}><Save className="h-4 w-4" />Thêm vào kho</Button>
        </form>
        <section className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm chiến dịch, sản phẩm hoặc URL…" className="flex-1" /><select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="min-h-11 rounded-xl border border-white/[0.1] bg-surface-2 px-3 text-sm"><option value="all">Tất cả</option><option value="active">Đang chạy</option><option value="paused">Tạm dừng</option><option value="archived">Lưu trữ</option></select></div>
          <div className="space-y-3">{visibleLinks.map((link) => <article key={link.id} className="rounded-2xl border border-white/[0.08] bg-surface-1 p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Link2 className="h-4 w-4 text-accent-soft" /><h3 className="font-bold">{link.campaignName}</h3><span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold uppercase', link.status === 'active' ? 'bg-success/15 text-success' : link.status === 'paused' ? 'bg-warning/15 text-warning' : 'bg-white/[0.07] text-fg-muted')}>{link.status}</span></div><p className="mt-2 text-sm text-fg-secondary">{link.productTitle}</p><a href={link.destinationUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex max-w-full items-center gap-1 truncate text-xs text-accent-soft hover:underline">{link.destinationUrl}<ExternalLink className="h-3 w-3 shrink-0" /></a><p className="mt-3 text-xs text-fg-muted">{formatDate(link.startsAt)} → {formatDate(link.endsAt)} · trọng số {link.weight}</p></div><div className="grid grid-cols-3 gap-2 text-center"><Metric label="Impression" value={link.stats.impressions} /><Metric label="Click" value={link.stats.clicks} /><Metric label="CTR" value={`${link.stats.ctr}%`} /></div></div><div className="mt-4 flex flex-wrap gap-2">{link.status === 'paused' && <Button size="sm" variant="outline" onClick={() => void mutateLink(link, 'active')} disabled={loading}><Play className="h-3.5 w-3.5" />Kích hoạt</Button>}{link.status === 'active' && <Button size="sm" variant="outline" onClick={() => void mutateLink(link, 'paused')} disabled={loading}><Pause className="h-3.5 w-3.5" />Tạm dừng</Button>}{link.status !== 'archived' && <Button size="sm" variant="ghost" onClick={() => void mutateLink(link, 'archived')} disabled={loading}><Archive className="h-3.5 w-3.5" />Lưu trữ</Button>}</div></article>)}{!visibleLinks.length && <div className="rounded-2xl border border-dashed border-white/[0.12] p-10 text-center text-sm text-fg-muted">Chưa có link phù hợp bộ lọc.</div>}</div>
        </section>
      </div>
    </div></main>
    {stepUpDialog}
  </AdminShell>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div> }
function Metric({ label, value }: { label: string; value: string | number }) { return <div className="min-w-20 rounded-xl bg-black/20 px-3 py-2"><p className="text-base font-bold">{value}</p><p className="text-[10px] uppercase tracking-wide text-fg-muted">{label}</p></div> }
