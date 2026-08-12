'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, Film, Plus, RefreshCw, Rocket, RotateCcw, Search, Trash2 } from 'lucide-react'
import { AccessDenied, AdminLogin, AdminShell } from '@/components/admin/AdminShell'
import { AdminPage, AdminPageHeader, AdminSection, AdminState, AdminToolbar, DataSourceIndicator, FormField } from '@/components/admin/AdminPrimitives'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAdminApi } from '@/hooks/useAdminApi'
import { useAdminStepUp } from '@/components/admin/AdminStepUpDialog'
import type { FeaturedCollectionSummary, FeaturedCollectionVersion, FeaturedPlacement } from '@/lib/content'

type MovieSearchRow = { slug: string; title: string; originalTitle: string; poster: string; thumbnail: string; year: number | null }
type ContentResponse = { collections: FeaturedCollectionSummary[]; versions: FeaturedCollectionVersion[] }

export function ContentAdminPage() {
  const { user, loading: authLoading, logout, request, denied } = useAdminApi()
  const [data, setData] = useState<ContentResponse>({ collections: [], versions: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loadedAt, setLoadedAt] = useState<number | null>(null)
  const [title, setTitle] = useState('Phim nổi bật')
  const [placement, setPlacement] = useState<FeaturedPlacement>('featured_rail')
  const [reason, setReason] = useState('Cập nhật collection biên tập')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MovieSearchRow[]>([])
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([])
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [preview, setPreview] = useState<FeaturedCollectionVersion | null>(null)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')
  const { approve, dialog } = useAdminStepUp()

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true); setError(null)
    try { setData(await request<ContentResponse>('/api/admin/content/featured')); setLoadedAt(Date.now()) }
    catch (next) { setError(next instanceof Error ? next.message : 'Không thể tải nội dung.') }
    finally { setLoading(false) }
  }, [request, user])
  useEffect(() => { if (user) void load() }, [load, user])

  const search = async (event: FormEvent) => {
    event.preventDefault(); if (query.trim().length < 2) return
    setLoading(true); setError(null)
    try { const payload = await request<{ items: MovieSearchRow[] }>(`/api/admin/content/search?q=${encodeURIComponent(query.trim())}`); setResults(payload.items) }
    catch (next) { setError(next instanceof Error ? next.message : 'Không thể tìm phim.') }
    finally { setLoading(false) }
  }

  const createDraft = async () => {
    if (!selectedSlugs.length || reason.trim().length < 3) return
    setLoading(true); setError(null); setNotice(null)
    try {
      await request('/api/admin/content/featured', { method: 'POST', body: JSON.stringify({ title, placement, movieSlugs: selectedSlugs, reason, startsAt: startsAt ? new Date(startsAt).getTime() : null, endsAt: endsAt ? new Date(endsAt).getTime() : null }) })
      setNotice('Đã lưu draft mới. Hãy preview và xác thực MFA trước khi publish.'); await load()
    } catch (next) { setError(next instanceof Error ? next.message : 'Không thể tạo draft.') }
    finally { setLoading(false) }
  }

  const publish = async (collection: FeaturedCollectionSummary) => {
    if (!collection.draftVersionId) return
    const body = { versionId: collection.draftVersionId, reason }
    const approval = await approve({ action: 'content_publish', targetId: collection.id, payload: body, title: 'Xuất bản collection', summary: `${collection.title} · ${reason}` })
    if (!approval) return
    setLoading(true); setError(null)
    try { await request(`/api/admin/content/featured/${encodeURIComponent(collection.id)}/publish`, { method: 'POST', headers: { 'X-Admin-Approval': approval.token }, body: approval.payloadJson }); setNotice('Collection đã được publish và cập nhật public projection.'); await load() }
    catch (next) { setError(next instanceof Error ? next.message : 'Không thể publish.') }
    finally { setLoading(false) }
  }

  const rollback = async (collection: FeaturedCollectionSummary, version: FeaturedCollectionVersion) => {
    setLoading(true); setError(null)
    try { await request(`/api/admin/content/featured/${encodeURIComponent(collection.id)}/rollback`, { method: 'POST', body: JSON.stringify({ versionId: version.id, reason }) }); setNotice(`Đã tạo draft rollback từ version ${version.id.slice(0, 8)}.`); await load() }
    catch (next) { setError(next instanceof Error ? next.message : 'Không thể tạo rollback draft.') }
    finally { setLoading(false) }
  }

  const unpublish = async (collection: FeaturedCollectionSummary) => {
    const body = { reason }
    const approval = await approve({ action: 'content_unpublish', targetId: collection.id, payload: body, title: 'Gỡ collection khỏi homepage', summary: `${collection.title} · ${reason}` })
    if (!approval) return
    setLoading(true); setError(null)
    try { await request(`/api/admin/content/featured/${encodeURIComponent(collection.id)}/unpublish`, { method: 'POST', headers: { 'X-Admin-Approval': approval.token }, body: approval.payloadJson }); setNotice('Đã gỡ collection và cập nhật public projection.'); await load() }
    catch (next) { setError(next instanceof Error ? next.message : 'Không thể unpublish.') }
    finally { setLoading(false) }
  }

  const versionsById = useMemo(() => new Map(data.versions.map((version) => [version.id, version])), [data.versions])
  const handleLogout = () => void logout().catch(() => undefined)
  if (authLoading) return <AdminState kind="loading" title="Đang kiểm tra quyền quản trị" />
  if (!user) return <AdminLogin />
  if (denied) return <AccessDenied message="Tài khoản thiếu quyền content.manage." onLogout={handleLogout} />

  return <AdminShell viewer={{ uid: user.uid, email: user.email }} refreshedAt={loadedAt || Date.now()} refreshing={loading} onRefresh={() => void load()} onLogout={handleLogout}>
    <AdminPage><div className="mx-auto max-w-shell">
      <AdminPageHeader eyebrow="Nội dung" title="Phim & biên tập" description="Collection biên tập được quản lý độc lập với bảng xếp hạng được xem nhiều. Published version là snapshot bất biến." actions={<><DataSourceIndicator state={data.collections.length ? 'real' : 'empty'} /><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />Làm mới</Button></>} />
      {(error || notice) && <p role={error ? 'alert' : 'status'} className={`mt-4 border px-4 py-3 text-sm ${error ? 'border-bad/25 bg-bad/10 text-bad' : 'border-ok/25 bg-ok/10 text-ok'}`}>{error || notice}</p>}

      <AdminSection className="mt-6" title="Tạo draft collection" description="Tìm phim từ provider; metadata sẽ được snapshot khi lưu draft.">
        <div className="p-5">
          <div className="grid gap-4 lg:grid-cols-2"><FormField label="Tên collection" htmlFor="content-title"><Input id="content-title" value={title} onChange={(event) => setTitle(event.target.value)} /></FormField><FormField label="Vị trí"><Select value={placement} onValueChange={(value) => setPlacement(value as FeaturedPlacement)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="hero">Hero trang chủ</SelectItem><SelectItem value="featured_rail">Rail phim nổi bật</SelectItem></SelectContent></Select></FormField></div>
          <form onSubmit={search}><AdminToolbar className="-mx-5 mt-5"><FormField label="Tìm phim theo tên" htmlFor="content-search"><Input id="content-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nhập ít nhất 2 ký tự" /></FormField><Button type="submit" variant="outline" disabled={loading || query.trim().length < 2}><Search className="h-4 w-4" />Tìm</Button></AdminToolbar></form>
          {results.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{results.map((movie) => { const active = selectedSlugs.includes(movie.slug); return <button type="button" key={movie.slug} aria-pressed={active} onClick={() => setSelectedSlugs((items) => active ? items.filter((slug) => slug !== movie.slug) : [...items, movie.slug])} className={`flex min-h-16 items-center gap-3 rounded-md border p-3 text-left ${active ? 'border-accent/40 bg-accent/10' : 'border-white/[0.08] bg-surface-2 hover:border-white/[0.18]'}`}><span className="flex h-10 w-10 items-center justify-center rounded bg-black/30"><Film className="h-4 w-4 text-fg-muted" /></span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{movie.title}</span><span className="mt-1 block text-xs text-fg-muted">{movie.year || '—'} · {movie.slug}</span></span></button> })}</div>}
          <div className="mt-5 grid gap-4 sm:grid-cols-2"><FormField label="Bắt đầu (tùy chọn)" htmlFor="content-start"><Input id="content-start" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></FormField><FormField label="Kết thúc (tùy chọn)" htmlFor="content-end"><Input id="content-end" type="datetime-local" value={endsAt} min={startsAt} onChange={(event) => setEndsAt(event.target.value)} /></FormField></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"><FormField label="Lý do chỉnh sửa" htmlFor="content-reason" description="Được lưu vào audit; publish sẽ yêu cầu MFA."><Input id="content-reason" value={reason} onChange={(event) => setReason(event.target.value.slice(0, 240))} /></FormField><Button onClick={() => void createDraft()} disabled={loading || selectedSlugs.length === 0 || reason.trim().length < 3 || Boolean(startsAt && endsAt && new Date(endsAt) <= new Date(startsAt))}><Plus className="h-4 w-4" />Lưu draft ({selectedSlugs.length})</Button></div>
        </div>
      </AdminSection>

      <AdminSection className="mt-5" title="Collection & lịch xuất bản" description="Analytics chỉ gợi ý ứng viên; không tự thay collection biên tập.">
        {data.collections.length ? <div className="divide-y divide-white/[0.07]">{data.collections.map((collection) => { const draft = collection.draftVersionId ? versionsById.get(collection.draftVersionId) : null; const published = collection.publishedVersionId ? versionsById.get(collection.publishedVersionId) : null; const rollbackVersion = data.versions.filter((version) => version.collectionId === collection.id && version.status === 'archived').sort((a, b) => b.createdAt - a.createdAt)[0]; return <article key={collection.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{collection.title}</h3><span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-fg-muted">{collection.placement === 'hero' ? 'Hero' : 'Featured rail'}</span></div><p className="mt-2 text-sm text-fg-secondary">Draft: {draft?.movies.length || 0} phim · Published: {published?.movies.length || 0} phim</p><p className="mt-1 text-xs text-fg-muted">Version draft {collection.draftVersionId?.slice(0, 8) || '—'} · cập nhật {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(collection.updatedAt)}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => draft && setPreview(draft)} disabled={!draft}><Eye className="h-4 w-4" />Preview draft</Button>{rollbackVersion && <Button variant="outline" onClick={() => void rollback(collection, rollbackVersion)} disabled={loading}><RotateCcw className="h-4 w-4" />Rollback</Button>}{published && <Button variant="destructive" onClick={() => void unpublish(collection)} disabled={loading}><Trash2 className="h-4 w-4" />Gỡ</Button>}<Button onClick={() => void publish(collection)} disabled={!draft || loading || draft.id === published?.id}><Rocket className="h-4 w-4" />Publish</Button></div></article> })}</div> : <AdminState kind="empty" title="Chưa có collection biên tập" description="Tạo draft đầu tiên; homepage hiện vẫn dùng fallback provider." />}
      </AdminSection>
    </div></AdminPage>
    <Dialog open={Boolean(preview)} onOpenChange={(open) => { if (!open) setPreview(null) }}><DialogContent className="max-w-5xl border-white/[0.1] bg-surface-1"><DialogHeader><DialogTitle>Preview draft · {preview?.title}</DialogTitle><DialogDescription>Snapshot nội dung trước publish; chuyển viewport để kiểm tra hierarchy.</DialogDescription></DialogHeader><div className="flex gap-2"><Button size="sm" variant={previewMode === 'desktop' ? 'default' : 'outline'} onClick={() => setPreviewMode('desktop')}>Desktop</Button><Button size="sm" variant={previewMode === 'mobile' ? 'default' : 'outline'} onClick={() => setPreviewMode('mobile')}>Mobile</Button></div><div className={`mx-auto overflow-hidden rounded-xl border border-white/[0.1] bg-[#080911] p-4 ${previewMode === 'mobile' ? 'w-[360px]' : 'w-full'}`}><p className="mb-4 text-lg font-bold">{preview?.title}</p><div className={`grid gap-3 ${previewMode === 'mobile' ? 'grid-cols-2' : 'grid-cols-5'}`}>{preview?.movies.map((movie) => <article key={movie.slug} className="min-w-0"><div className="aspect-[2/3] rounded-lg bg-white/[0.06] bg-cover bg-center" style={{ backgroundImage: movie.poster ? `url(${movie.poster})` : undefined }} /><p className="mt-2 truncate text-sm font-semibold">{movie.title}</p><p className="text-xs text-fg-muted">{movie.year || '—'}</p></article>)}</div></div></DialogContent></Dialog>
    {dialog}
  </AdminShell>
}
