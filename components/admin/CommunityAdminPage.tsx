'use client'

import { useCallback, useEffect, useState } from 'react'
import { EyeOff, Flag, Loader2, RefreshCw, RotateCcw, Trash2 } from 'lucide-react'
import { AccessDenied, AdminLogin, AdminShell } from '@/components/admin/AdminShell'
import { AdminPage, AdminPageHeader, AdminSection, AdminState, DataSourceIndicator, FormField } from '@/components/admin/AdminPrimitives'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAdminApi } from '@/hooks/useAdminApi'
import { useAdminStepUp } from '@/components/admin/AdminStepUpDialog'
import type { ModerationCase, ModerationStatus } from '@/lib/community'

export function CommunityAdminPage() {
  const { user, loading: authLoading, logout, request, denied } = useAdminApi()
  const [items, setItems] = useState<ModerationCase[]>([])
  const [status, setStatus] = useState<ModerationStatus | 'all'>('open')
  const [reason, setReason] = useState('Xử lý báo cáo cộng đồng')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadedAt, setLoadedAt] = useState<number | null>(null)
  const { approve, dialog } = useAdminStepUp()
  const load = useCallback(async () => {
    if (!user) return
    setLoading(true); setError(null)
    try { const payload = await request<{ items: ModerationCase[] }>(`/api/admin/community/cases${status === 'all' ? '' : `?status=${status}`}`); setItems(payload.items); setLoadedAt(Date.now()) }
    catch (next) { setError(next instanceof Error ? next.message : 'Không thể tải moderation queue.') }
    finally { setLoading(false) }
  }, [request, status, user])
  useEffect(() => { if (user) void load() }, [load, user])
  const moderate = async (item: ModerationCase, action: 'hide' | 'restore' | 'remove' | 'dismiss') => {
    const body = { action, status: action === 'dismiss' ? 'dismissed' : 'resolved', reason }
    const approval = await approve({ action: 'community_moderate', targetId: item.id, payload: body, title: 'Xác nhận kiểm duyệt', summary: `${action} · ${item.targetType}:${item.targetId} · ${reason}` })
    if (!approval) return
    setLoading(true); setError(null)
    try { await request(`/api/admin/community/cases/${encodeURIComponent(item.id)}`, { method: 'PATCH', headers: { 'X-Admin-Approval': approval.token }, body: approval.payloadJson }); await load() }
    catch (next) { setError(next instanceof Error ? next.message : 'Không thể xử lý báo cáo.') }
    finally { setLoading(false) }
  }
  const handleLogout = () => void logout().catch(() => undefined)
  if (authLoading) return <AdminState kind="loading" title="Đang kiểm tra quyền moderation" />
  if (!user) return <AdminLogin />
  if (denied) return <AccessDenied message="Tài khoản thiếu quyền community.moderate." onLogout={handleLogout} />
  return <AdminShell viewer={{ uid: user.uid, email: user.email }} refreshedAt={loadedAt || Date.now()} refreshing={loading} onRefresh={() => void load()} onLogout={handleLogout}>
    <AdminPage><div className="mx-auto max-w-shell"><AdminPageHeader eyebrow="Cộng đồng" title="Hàng đợi kiểm duyệt" description="Ẩn, khôi phục hoặc xóa projection cộng đồng. Mọi hành động trừng phạt yêu cầu MFA, lý do và audit." actions={<><DataSourceIndicator state={error ? 'unavailable' : items.length ? 'real' : 'empty'} /><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />Làm mới</Button></>} />
      <div className="mt-6 grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)]"><FormField label="Trạng thái"><Select value={status} onValueChange={(value) => setStatus(value as typeof status)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả</SelectItem><SelectItem value="open">Mới</SelectItem><SelectItem value="in_review">Đang xử lý</SelectItem><SelectItem value="resolved">Đã xử lý</SelectItem><SelectItem value="dismissed">Bỏ qua</SelectItem></SelectContent></Select></FormField><FormField label="Lý do kiểm duyệt" htmlFor="moderation-reason"><Input id="moderation-reason" value={reason} onChange={(event) => setReason(event.target.value.slice(0, 240))} /></FormField></div>
      {error && <p role="alert" className="mt-4 border border-bad/25 bg-bad/10 px-4 py-3 text-sm text-bad">{error}</p>}
      <AdminSection className="mt-5" title="Báo cáo" description="Evidence snapshot được giữ trong case; public feed chỉ đọc nội dung published.">{loading && !items.length ? <AdminState kind="loading" title="Đang tải moderation queue" /> : items.length ? <div className="divide-y divide-white/[0.07]">{items.map((item) => <article key={item.id} className="grid gap-4 px-5 py-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center"><div><div className="flex flex-wrap items-center gap-2"><Flag className="h-4 w-4 text-warn" /><h3 className="font-semibold">{item.targetType}:{item.targetId}</h3><span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-fg-muted">{item.status}</span></div><p className="mt-2 text-sm text-fg-secondary">{item.reason}{item.details ? ` · ${item.details}` : ''}</p><p className="mt-2 text-xs text-fg-muted">Reporter {item.reporterUid} · {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(item.createdAt)}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => void moderate(item, 'hide')} disabled={loading || reason.trim().length < 3}><EyeOff className="h-4 w-4" />Ẩn</Button><Button size="sm" variant="outline" onClick={() => void moderate(item, 'restore')} disabled={loading || reason.trim().length < 3}><RotateCcw className="h-4 w-4" />Khôi phục</Button><Button size="sm" variant="destructive" onClick={() => void moderate(item, 'remove')} disabled={loading || reason.trim().length < 3}><Trash2 className="h-4 w-4" />Xóa</Button><Button size="sm" variant="ghost" onClick={() => void moderate(item, 'dismiss')} disabled={loading || reason.trim().length < 3}>Bỏ qua</Button></div></article>)}</div> : <AdminState kind="empty" title="Không có báo cáo phù hợp" />}</AdminSection>
    </div></AdminPage>{dialog}
  </AdminShell>
}
