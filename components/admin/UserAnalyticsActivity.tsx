'use client'

import type { OnlinePresence } from '@/lib/online-presence'
import { Button } from '@/components/ui/button'
import type { AdminSensitiveTimelineItem, AdminUserInsights, LegacyWatchHistoryItem } from '@/lib/admin-user-insights'

const date = (value: number | null | undefined) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(value) : '—'

export function UserAnalyticsActivity({ presence, presenceUnavailable, insightsError, insights, timeline, legacyHistory, busy, canOpen, onOpenTimeline, onOpenLegacy }: {
  presence: OnlinePresence | null
  presenceUnavailable: boolean
  insightsError: string | null
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
    <section className="rounded-lg border border-white/[0.08] p-5">
      <h3 className="font-semibold">Kết nối & tương tác hiện tại</h3>
      <p className="mt-1 text-xs leading-relaxed text-fg-muted">Online là còn liên lạc với server. Đang tương tác là có thao tác trên tab hiển thị trong 60 giây; không đồng nghĩa với đang xem phim.</p>
      <p role="status" className="mt-4 text-sm font-semibold">{presenceUnavailable ? 'Không thể cập nhật trạng thái. Đang thử kết nối lại…' : !presence ? 'Đang tải trạng thái kết nối…' : presence.online ? presence.interacting ? 'Online · đang tương tác' : 'Online · không có tương tác gần đây' : presence.lastSeen ? 'Offline' : 'Chưa ghi nhận phiên kết nối'}</p>
      {presence && !presenceUnavailable && <>
        <dl className="mt-4 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-fg-muted">Phiên hiện tại bắt đầu</dt><dd className="mt-1 tabular-nums">{date(presence.onlineSince)}</dd></div>
          <div><dt className="text-xs text-fg-muted">Lần liên lạc cuối</dt><dd className="mt-1 tabular-nums">{date(presence.lastSeen)}</dd></div>
          <div><dt className="text-xs text-fg-muted">Tab / thiết bị còn kết nối</dt><dd className="mt-1 tabular-nums">{presence.connections}</dd></div>
          <div><dt className="text-xs text-fg-muted">Dữ liệu cập nhật lúc</dt><dd className="mt-1 tabular-nums">{new Date(presence.generatedAt).toLocaleTimeString('vi-VN')}</dd></div>
        </dl>
        <div className="mt-5 border-t border-white/[0.08] pt-5"><h4 className="text-sm font-semibold">Các phiên kết nối gần đây</h4><p className="mt-1 text-xs leading-relaxed text-fg-muted">Tối đa 50 phiên trong 30 ngày, mỗi tab / thiết bị là một phiên. Thời lượng tính đến heartbeat cuối; các phiên có thể trùng thời gian. Không suy diễn từ ngày đăng nhập cũ.</p>
          {presence.sessions.length ? <div className="mt-3 max-h-80 overflow-auto"><table className="w-full text-left text-xs"><thead className="text-fg-muted"><tr><th className="py-3 pr-4 font-medium">Bắt đầu</th><th className="py-3 pr-4 font-medium">Kết thúc / liên lạc cuối</th><th className="py-3 font-medium">Thời lượng</th></tr></thead><tbody className="divide-y divide-white/[0.08]">{presence.sessions.map(session => <tr key={session.id}><td className="whitespace-nowrap py-3 pr-4 align-top tabular-nums">{date(session.startedAt)}</td><td className="py-3 pr-4"><p className="whitespace-nowrap tabular-nums">{date(session.endedAt || session.lastHeartbeatAt)}</p><p className="mt-1 text-fg-muted">{session.online ? 'Đang kết nối' : session.endReason === 'timeout' ? 'Hết heartbeat · mốc liên lạc cuối' : 'Đã rời trang / đăng xuất'}</p></td><td className="whitespace-nowrap py-3 align-top tabular-nums">{Math.floor(session.seconds / 60)} phút {session.seconds % 60} giây</td></tr>)}</tbody></table></div> : <p className="mt-3 text-sm text-fg-muted">Chưa có phiên từ bộ ghi nhận mới. Người dùng cần mở lại hoặc tải lại trang sau khi cập nhật.</p>}
        </div>
      </>}
    </section>
    <section className="border border-white/[0.08] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">Analytics đã xác minh · 30 ngày</h3><p className="mt-1 text-xs text-fg-muted">Chỉ HLS native và Watch Party có heartbeat server; không trộn dữ liệu resume cũ.</p></div>{insights?.collectionStartedAt && <span className="rounded-full border border-ok/25 bg-ok/10 px-3 py-1 text-xs text-ok">Thu thập từ {date(insights.collectionStartedAt)}</span>}</div>
      {insights ? <><div className="mt-4 grid gap-3 sm:grid-cols-2">{[['Qualified views', String(insights.qualifiedViews)], ['Giờ xem đã xác minh', String(insights.watchHours)], ['Completion', `${insights.completionRate}%`]].map(([label, value]) => <div key={label} className="rounded-md bg-surface-2 p-3"><p className="text-xs text-fg-muted">{label}</p><p className="mt-1 text-sm font-semibold tabular-nums">{value}</p></div>)}</div>
        {insights.collectionState === 'not_collecting' && <p className="mt-4 rounded-lg border border-warn/25 bg-warn/10 p-3 text-sm text-warn">Hệ thống chưa ghi nhận phiên xem phim được xác minh. Trạng thái online ở trên được thu thập riêng, nên tài khoản online vẫn có thể có 0 lượt xem.</p>}
        <div className="mt-5 border-t border-white/[0.08] pt-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="text-sm font-semibold">Timeline nhạy cảm</h4><p className="mt-1 text-xs text-fg-muted">Cần lý do, MFA và audit cho mỗi lần mở.</p></div><Button variant="outline" onClick={onOpenTimeline} disabled={busy || !canOpen}>Mở timeline 90 ngày</Button></div>
          {timeline && <div className="mt-4 space-y-5"><div><h5 className="text-xs font-semibold uppercase tracking-wide text-ok">HLS / Watch Party đã xác minh</h5><div className="mt-2 max-h-64 divide-y divide-white/[0.07] overflow-y-auto">{verified.map((item) => <div key={item.sessionId} className="py-3"><div className="flex justify-between gap-3"><p className="text-sm font-semibold">{item.movieTitle}</p><span className="text-xs tabular-nums text-fg-muted">{Math.round(item.activeSeconds / 60)} phút</span></div><p className="mt-1 text-xs text-fg-muted">{item.episodeName || item.movieSlug} · {date(item.startedAt)} · {item.source === 'watch_party' ? 'Xem chung' : 'Solo'}</p></div>)}{!verified.length && <p className="py-4 text-sm text-fg-muted">Chưa có session đã xác minh trong 90 ngày.</p>}</div></div>
            <div><h5 className="text-xs font-semibold uppercase tracking-wide text-warn">Player nhúng · ước tính</h5><p className="mt-1 text-xs text-fg-muted">Chỉ đo thời gian trang hiển thị; không tính KPI, AI hoặc thẻ chia sẻ.</p><div className="mt-2 max-h-48 divide-y divide-white/[0.07] overflow-y-auto">{estimated.map((item) => <div key={item.sessionId} className="py-3"><p className="text-sm font-semibold">{item.movieTitle}</p><p className="mt-1 text-xs text-fg-muted">{item.episodeName || item.movieSlug} · khoảng {Math.round(item.activeSeconds / 60)} phút</p></div>)}{!estimated.length && <p className="py-3 text-sm text-fg-muted">Chưa có phiên player nhúng.</p>}</div></div></div>}
        </div></> : <p className="mt-3 text-sm text-fg-muted">{insightsError || 'Đang tải dữ liệu xem phim…'}</p>}
    </section>
    <section className="border border-white/[0.08] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Lịch sử tiếp tục xem cũ</h3><p className="mt-1 text-xs text-fg-muted">Dữ liệu client ghi để resume; số phút chỉ là ước tính và không được cộng KPI.</p></div><Button variant="outline" onClick={onOpenLegacy} disabled={busy || !canOpen}>Mở lịch sử cũ</Button></div>{legacyHistory && <div className="mt-4 max-h-72 divide-y divide-white/[0.07] overflow-y-auto">{legacyHistory.map((item) => <div key={`${item.movieSlug}:${item.episodeId}`} className="py-3"><div className="flex justify-between gap-3"><p className="text-sm font-semibold">{item.movieTitle}</p><span className="text-xs text-fg-muted">{Math.round(item.percentage)}%</span></div><p className="mt-1 text-xs text-fg-muted">{item.episodeName} · cập nhật {date(item.updatedAt)} · estimate {Math.round(item.clientEstimatedSeconds / 60)} phút</p></div>)}{!legacyHistory.length && <p className="py-4 text-sm text-fg-muted">Không có dữ liệu resume trong 90 ngày.</p>}</div>}</section>
  </div>
}
