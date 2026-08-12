'use client'

import { useCallback, useEffect, useState } from 'react'
import { Inbox, Loader2, RefreshCw } from 'lucide-react'
import { useAdminApi } from '@/hooks/useAdminApi'
import { useAdminStepUp } from '@/components/admin/AdminStepUpDialog'
import { AccessDenied, AdminLogin, AdminShell } from '@/components/admin/AdminShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { FeedbackPriority, FeedbackStatus, UserFeedback } from '@/lib/feedback'

export function FeedbackAdminPage() {
  const { user, loading: authLoading, logout, request, denied } = useAdminApi()
  const { approve, dialog } = useAdminStepUp()
  const [items, setItems] = useState<UserFeedback[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<UserFeedback | null>(null)
  const [reply, setReply] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const load = useCallback(async () => { if (!user) return; setLoading(true); try { setItems((await request<{ items: UserFeedback[] }>('/api/admin/feedback')).items) } catch (next) { setError(next instanceof Error ? next.message : 'Không thể tải góp ý.') } finally { setLoading(false) } }, [request, user])
  useEffect(() => { if (user) void load() }, [load, user])
  useEffect(() => {
    if (!selected?.screenshot || !user) { setScreenshotUrl(null); return }
    let nextUrl: string | null = null
    void user.getIdToken().then((token) => fetch(`/api/admin/feedback/${selected.id}/screenshot`, { headers: { Authorization: `Bearer ${token}` } })).then((response) => { if (!response.ok) throw new Error(); return response.blob() }).then((blob) => { nextUrl = URL.createObjectURL(blob); setScreenshotUrl(nextUrl) }).catch(() => setScreenshotUrl(null))
    return () => { if (nextUrl) URL.revokeObjectURL(nextUrl) }
  }, [selected?.id, selected?.screenshot, user])
  const filteredItems = items.filter((item) => (statusFilter === 'all' || item.status === statusFilter) && (categoryFilter === 'all' || item.category === categoryFilter))
  const mutate = async (status: FeedbackStatus, priority: FeedbackPriority) => {
    if (!selected) return
    const body = { status, priority, adminNote: note, publicReply: reply, reason: `Xử lý góp ý ${selected.id}`, expectedRevision: selected.revision, confirmed: true }
    const approval = await approve({ action: 'feedback_update', targetId: selected.id, payload: body, title: 'Xác nhận cập nhật góp ý', summary: `${status} · ${priority}` })
    if (!approval) return
    try { const payload = await request<{ item: UserFeedback }>(`/api/admin/feedback/${selected.id}`, { method: 'PATCH', headers: { 'X-Admin-Approval': approval.token }, body: approval.payloadJson }); setSelected(payload.item); setItems((rows) => rows.map((row) => row.id === payload.item.id ? payload.item : row)) } catch (next) { setError(next instanceof Error ? next.message : 'Không thể cập nhật.') }
  }
  if (authLoading) return <div className="flex min-h-screen items-center justify-center bg-bg"><Loader2 className="h-7 w-7 animate-spin" /></div>
  if (!user) return <AdminLogin />
  if (denied) return <AccessDenied message="Bạn không có quyền support.manage." onLogout={() => void logout()} />
  return <AdminShell viewer={{ uid: user.uid, email: user.email }} refreshedAt={Date.now()} refreshing={loading} onRefresh={() => void load()} onLogout={() => void logout()}><main className="px-4 py-7 sm:px-6 xl:px-8"><div className="mx-auto max-w-shell"><div className="flex items-end justify-between gap-4"><div><p className="text-eyebrow text-accent-soft">Chăm sóc khán giả</p><h1 className="mt-3 text-title-1">Hòm thư góp ý</h1></div><Button variant="outline" onClick={() => void load()}><RefreshCw className="h-4 w-4" />Làm mới</Button></div>{error && <p role="alert" className="mt-4 text-sm text-bad">{error}</p>}<div className="mt-4 flex flex-wrap gap-2"><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Mọi trạng thái</SelectItem>{['new','triaged','planned','resolved','dismissed'].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select><Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Mọi phân loại</SelectItem>{['movie','improvement','ui_ux','content','correction','bug','other'].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,.75fr)]"><section className="overflow-hidden rounded-xl border border-white/10 bg-surface-1"><div className="divide-y divide-white/[0.07]">{filteredItems.map((item) => <button key={item.id} onClick={() => { setSelected(item); setReply(item.publicReply || ''); setNote(item.adminNote || '') }} className="block w-full p-4 text-left hover:bg-white/[0.035]"><div className="flex justify-between gap-3"><p className="font-semibold">{item.category} · {item.status}</p><span className="text-xs text-fg-muted">{new Date(item.createdAt).toLocaleDateString('vi-VN')}</span></div><p className="mt-2 line-clamp-2 text-sm text-fg-secondary">{item.message}</p><p className="mt-2 text-xs text-fg-muted">{item.email} · {item.pagePath}</p></button>)}{!filteredItems.length && !loading && <div className="py-16 text-center"><Inbox className="mx-auto h-8 w-8 text-fg-muted" /><p className="mt-3 text-sm text-fg-muted">Chưa có góp ý.</p></div>}</div></section>{selected && <aside className="h-fit rounded-xl border border-white/10 bg-surface-1 p-5"><h2 className="font-semibold">Chi tiết góp ý</h2><p className="mt-3 whitespace-pre-wrap text-sm text-fg-secondary">{selected.message}</p>{selected.screenshot && screenshotUrl && <img src={screenshotUrl} alt="Ảnh góp ý" className="mt-4 aspect-video w-full rounded-lg object-cover object-top" />}<div className="mt-4 grid grid-cols-2 gap-3"><Select value={selected.status} onValueChange={(status) => setSelected({ ...selected, status: status as FeedbackStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['new','triaged','planned','resolved','dismissed'].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select><Select value={selected.priority} onValueChange={(priority) => setSelected({ ...selected, priority: priority as FeedbackPriority })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['low','normal','high','urgent'].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú nội bộ" className="mt-3 min-h-24 w-full rounded-md border border-white/10 bg-bg p-3 text-sm" /><Input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Phản hồi ngắn cho user" className="mt-3" /><Button className="mt-4 w-full" onClick={() => void mutate(selected.status, selected.priority)}>Lưu và thông báo user</Button></aside>}</div></div></main>{dialog}</AdminShell>
}
