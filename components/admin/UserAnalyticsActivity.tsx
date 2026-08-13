'use client'

import { Button } from '@/components/ui/button'
import type { AdminSensitiveTimelineItem, AdminUserInsights, LegacyWatchHistoryItem } from '@/lib/admin-user-insights'

const date = (value: number | null | undefined) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(value) : '—'

export function UserAnalyticsActivity({ insights, timeline, legacyHistory, busy, canOpen, onOpenTimeline, onOpenLegacy }: {
  insights: AdminUserInsights | null
  timeline: AdminSensitiveTimelineItem[] | null
  legacyHistory: LegacyWatchHistoryItem[] | null
  busy: boolean
  canOpen: boolean
  onOpenTimeline: () => void
  onOpenLegacy: () => void
}) {
  const verified = timeline?.filter((item) => item.reliability === 'verified') || []
  const estimated = timeline?.filter((item) => item.reliability === 'estimated_embed') || []
  return <div className="mt-6 space-y-5">
    <section className="border border-white/[0.08] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">Analytics đã xác minh · 30 ngày</h3><p className="mt-1 text-xs text-fg-muted">Chỉ HLS native và Watch Party có heartbeat server; không trộn dữ liệu resume cũ.</p></div>{insights?.collectionStartedAt && <span className="rounded-full border border-ok/25 bg-ok/10 px-3 py-1 text-xs text-ok">Thu thập từ {date(insights.collectionStartedAt)}</span>}</div>
      {insights ? <><div className="mt-4 grid gap-3 sm:grid-cols-2">{[['Trạng thái', insights.online ? 'Đang online' : `Offline · ${date(insights.lastSeen)}`], ['Qualified views', String(insights.qualifiedViews)], ['Giờ xem đã xác minh', String(insights.watchHours)], ['Completion', `${insights.completionRate}%`]].map(([label, value]) => <div key={label} className="rounded-md bg-surface-2 p-3"><p className="text-xs text-fg-muted">{label}</p><p className="mt-1 text-sm font-semibold tabular-nums">{value}</p></div>)}</div>
        {insights.collectionState === 'not_collecting' && <p className="mt-4 rounded-lg border border-warn/25 bg-warn/10 p-3 text-sm text-warn">Chưa từng thu thập playback session. Google Authenticator chỉ cấp quyền xem, không biến lịch sử resume thành analytics.</p>}
        <div className="mt-5 border-t border-white/[0.08] pt-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="text-sm font-semibold">Timeline nhạy cảm</h4><p className="mt-1 text-xs text-fg-muted">Cần lý do, MFA và audit cho mỗi lần mở.</p></div><Button variant="outline" onClick={onOpenTimeline} disabled={busy || !canOpen}>Mở timeline 90 ngày</Button></div>
          {timeline && <div className="mt-4 space-y-5"><div><h5 className="text-xs font-semibold uppercase tracking-wide text-ok">HLS / Watch Party đã xác minh</h5><div className="mt-2 max-h-64 divide-y divide-white/[0.07] overflow-y-auto">{verified.map((item) => <div key={item.sessionId} className="py-3"><div className="flex justify-between gap-3"><p className="text-sm font-semibold">{item.movieTitle}</p><span className="text-xs tabular-nums text-fg-muted">{Math.round(item.activeSeconds / 60)} phút</span></div><p className="mt-1 text-xs text-fg-muted">{item.episodeName || item.movieSlug} · {date(item.startedAt)} · {item.source === 'watch_party' ? 'Xem chung' : 'Solo'}</p></div>)}{!verified.length && <p className="py-4 text-sm text-fg-muted">Chưa có session đã xác minh trong 90 ngày.</p>}</div></div>
            <div><h5 className="text-xs font-semibold uppercase tracking-wide text-warn">Player nhúng · ước tính</h5><p className="mt-1 text-xs text-fg-muted">Chỉ đo thời gian trang hiển thị; không tính KPI, AI hoặc thẻ chia sẻ.</p><div className="mt-2 max-h-48 divide-y divide-white/[0.07] overflow-y-auto">{estimated.map((item) => <div key={item.sessionId} className="py-3"><p className="text-sm font-semibold">{item.movieTitle}</p><p className="mt-1 text-xs text-fg-muted">{item.episodeName || item.movieSlug} · khoảng {Math.round(item.activeSeconds / 60)} phút</p></div>)}{!estimated.length && <p className="py-3 text-sm text-fg-muted">Chưa có phiên player nhúng.</p>}</div></div></div>}
        </div></> : <p className="mt-3 text-sm text-fg-muted">Đang tải insights…</p>}
    </section>
    <section className="border border-white/[0.08] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Lịch sử tiếp tục xem cũ</h3><p className="mt-1 text-xs text-fg-muted">Dữ liệu client ghi để resume; số phút chỉ là ước tính và không được cộng KPI.</p></div><Button variant="outline" onClick={onOpenLegacy} disabled={busy || !canOpen}>Mở lịch sử cũ</Button></div>{legacyHistory && <div className="mt-4 max-h-72 divide-y divide-white/[0.07] overflow-y-auto">{legacyHistory.map((item) => <div key={`${item.movieSlug}:${item.episodeId}`} className="py-3"><div className="flex justify-between gap-3"><p className="text-sm font-semibold">{item.movieTitle}</p><span className="text-xs text-fg-muted">{Math.round(item.percentage)}%</span></div><p className="mt-1 text-xs text-fg-muted">{item.episodeName} · cập nhật {date(item.updatedAt)} · estimate {Math.round(item.clientEstimatedSeconds / 60)} phút</p></div>)}{!legacyHistory.length && <p className="py-4 text-sm text-fg-muted">Không có dữ liệu resume trong 90 ngày.</p>}</div>}</section>
  </div>
}
