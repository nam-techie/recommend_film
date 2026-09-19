'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Activity, BarChart3, CheckCircle2, Clock3, Eye, Loader2, RefreshCw, Users } from 'lucide-react'
import { AccessDenied, AdminLogin, AdminShell } from '@/components/admin/AdminShell'
import { AdminPage, AdminPageHeader, AdminSection, AdminState, DataSourceIndicator, MetricCard } from '@/components/admin/AdminPrimitives'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAdminLivePresence } from '@/hooks/useAdminLivePresence'
import { useAdminApi } from '@/hooks/useAdminApi'
import type { AnalyticsHealth, AnalyticsOverview } from '@/lib/analytics'
import { analyticsCompletionRate } from '@/lib/analytics'

const number = new Intl.NumberFormat('vi-VN')

export function AnalyticsAdminPage() {
  const { user, loading: authLoading, logout, request, denied } = useAdminApi()
  const live = useAdminLivePresence(request, Boolean(user))
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [data, setData] = useState<AnalyticsOverview | null>(null)
  const [health, setHealth] = useState<AnalyticsHealth | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadedAt, setLoadedAt] = useState<number | null>(null)
  const loadVersion = useRef(0)
  const load = useCallback(async () => {
    if (!user) return
    const version = ++loadVersion.current
    setLoading(true); setError(null)
    try { const [overview, healthState] = await Promise.all([request<AnalyticsOverview>(`/api/admin/analytics/overview?range=${range}`), request<AnalyticsHealth>('/api/admin/analytics/health')]); if (version !== loadVersion.current) return; setData(overview); setHealth(healthState); setLoadedAt(Date.now()) }
    catch (next) { if (version === loadVersion.current) setError(next instanceof Error ? next.message : 'Không thể tải analytics.') }
    finally { if (version === loadVersion.current) setLoading(false) }
  }, [range, request, user])
  useEffect(() => { if (user) void load(); return () => { loadVersion.current += 1 } }, [load, user])
  useEffect(() => { if (live.data && !live.error) setData(previous => previous ? { ...previous, peakOnline: Math.max(previous.peakOnline, live.data!.onlineNow) } : previous) }, [live.data, live.error])
  const handleLogout = () => void logout().catch(() => undefined)
  if (authLoading) return <AdminState kind="loading" title="Đang kiểm tra quyền analytics" />
  if (!user) return <AdminLogin />
  if (denied) return <AccessDenied message="Tài khoản thiếu quyền analytics.read." onLogout={handleLogout} />
  const hasData = Boolean(data?.since)

  return <AdminShell viewer={{ uid: user.uid, email: user.email }} refreshedAt={loadedAt || Date.now()} refreshing={loading} onRefresh={() => void load()} onLogout={handleLogout}>
    <AdminPage><div className="mx-auto max-w-shell">
      <AdminPageHeader eyebrow="Nội dung" title="Phân tích nội dung" description="Lượt xem và giờ xem theo khoảng ngày đã chọn. Trạng thái trực tuyến bên dưới là số liệu hiện tại, độc lập với lịch sử xem phim." actions={<><Select value={range} onValueChange={(value) => setRange(value as typeof range)}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7d">7 ngày</SelectItem><SelectItem value="30d">30 ngày</SelectItem><SelectItem value="90d">90 ngày</SelectItem></SelectContent></Select><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />Làm mới</Button></>} />
      <section className="mt-5 overflow-hidden rounded-lg border border-white/[0.08]">
        <div className="border-b border-white/[0.08] px-5 py-4"><h2 className="font-semibold">Trực tuyến lúc này</h2><p className="mt-1 text-xs text-fg-muted">Tự cập nhật mỗi 15 giây · mỗi tài khoản chỉ tính một lần, kể cả tài khoản admin · không tính khách chưa đăng nhập.</p><p role="status" className="mt-2 text-xs text-fg-secondary">{live.error ? 'Mất kết nối cập nhật. Các số trực tuyến tạm ẩn cho đến khi kết nối lại.' : live.data ? `Cập nhật lúc ${new Date(live.data.generatedAt).toLocaleTimeString('vi-VN')}` : 'Đang kết nối dữ liệu trực tuyến…'}</p></div>
        <div className="grid gap-px bg-white/[0.08] md:grid-cols-3">
          <MetricCard label="Online" value={live.data && !live.error ? number.format(live.data.onlineNow) : '—'} detail="Có heartbeat trong 90 giây, kể cả tab nền" icon={Users} tone="ok" />
          <MetricCard label="Đang tương tác" value={live.data && !live.error ? number.format(live.data.interactingNow) : '—'} detail="Tab hiển thị và có thao tác trong 60 giây" icon={Activity} tone="ok" />
          <MetricCard label="Đang xem phim" value={live.data && !live.error ? number.format(live.data.concurrentViewers) : '—'} detail="Player đang phát, hiển thị hoặc PiP; heartbeat ≤60 giây" icon={Eye} tone="ok" />
        </div>
      </section>
      <div className="mt-8"><h2 className="mb-3 font-semibold">Hiệu suất nội dung · {range.slice(0, -1)} ngày</h2><DataSourceIndicator state={error ? 'unavailable' : hasData ? 'real' : 'empty'} since={data?.since} /></div>
      {error && <p role="alert" className="mt-4 border border-bad/25 bg-bad/10 px-4 py-3 text-sm text-bad">{error}</p>}
      {loading && !data ? <AdminState kind="loading" title="Đang tổng hợp playback session" /> : data && <>
        <div className="mt-5 grid gap-px overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Qualified views" value={number.format(data.totals.qualifiedViews)} detail="≥30 giây active playback" icon={Eye} />
          <MetricCard label="Người xem theo phim / ngày" value={number.format(data.totals.uniqueViewers)} detail="Một account / phim / ngày" icon={Users} />
          <MetricCard label="Giờ xem" value={number.format(Math.round(data.totals.activeSeconds / 36) / 100)} detail="Không cộng pause hoặc seek" icon={Clock3} />
          <MetricCard label="Completion" value={`${analyticsCompletionRate(data.totals)}%`} detail="Qualified view đạt ngưỡng hoàn thành" icon={CheckCircle2} />
          <MetricCard label="Đỉnh online ghi nhận" value={number.format(Math.max(data.peakOnline, live.error ? 0 : live.data?.onlineNow || 0))} detail="Mẫu admin / cron; chỉ tính nguồn heartbeat mới" icon={BarChart3} />
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,.6fr)]">
          <AdminSection title="Được xem nhiều" description={`${range} · xếp theo qualified views`}>
            {data.topMovies.length ? <div className="divide-y divide-white/[0.07]">{data.topMovies.map((movie, index) => <article key={movie.slug} className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4"><span className="text-xs font-bold tabular-nums text-fg-muted">{String(index + 1).padStart(2, '0')}</span><div className="min-w-0"><h3 className="truncate text-sm font-semibold">{movie.title}</h3><p className="mt-1 truncate text-xs text-fg-muted">{movie.genres.join(' · ') || 'Chưa phân loại'} · {Math.round(movie.activeSeconds / 36) / 100} giờ</p></div><div className="text-right"><p className="text-sm font-semibold tabular-nums">{number.format(movie.qualifiedViews)}</p><p className="text-xs text-fg-muted">{analyticsCompletionRate(movie)}% hoàn thành</p></div></article>)}</div> : <AdminState kind="empty" title="Chưa có phim đủ điều kiện xếp hạng" />}
          </AdminSection>
          <AdminSection title="Top thể loại" description="Từ metadata snapshot của playback session">
            {data.topGenres.length ? <div className="divide-y divide-white/[0.07]">{data.topGenres.map((genre) => <div key={genre.genre} className="px-5 py-4"><div className="flex justify-between gap-3"><span className="text-sm font-semibold">{genre.genre}</span><span className="text-sm tabular-nums">{number.format(genre.qualifiedViews)}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, genre.qualifiedViews / Math.max(data.topGenres[0]?.qualifiedViews || 1, 1) * 100)}%` }} /></div></div>)}</div> : <AdminState kind="empty" title="Chưa có dữ liệu thể loại" />}
          </AdminSection>
        </div>
      </>}
    </div></AdminPage>
  </AdminShell>
}
