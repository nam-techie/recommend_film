'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, Clock3, Globe2, Laptop, Radio } from 'lucide-react'
import { AccountSession, SocialActivity } from '@/lib/account-types'
import { ActivityHeatmap } from '@/components/account/ActivityHeatmap'

const formatMoment = (time: number) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(time)
const formatDuration = (milliseconds: number) => {
  const minutes = Math.max(1, Math.round(milliseconds / 60_000))
  if (minutes < 60) return `${minutes} phút`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} giờ ${rest} phút` : `${hours} giờ`
}

export function AccountActivityPanel({ sessions, activities }: { sessions: AccountSession[]; activities: SocialActivity[] }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(timer) }, [])
  const ordered = useMemo(() => [...sessions].sort((a, b) => b.startedAt - a.startedAt), [sessions])
  const current = ordered.find((session) => !session.endedAt)
  const totalThisMonth = activities.filter((item) => now - item.createdAt <= 30 * 86_400_000).length

  return <div className="space-y-6">
    <header><p className="text-sm text-purple-300">Riêng tư · chỉ bạn nhìn thấy phiên đăng nhập</p><h1 className="mt-1 text-3xl font-bold">Hoạt động</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Theo dõi dấu ấn xem phim và các lần tài khoản online. CineMind chỉ lưu loại thiết bị, trình duyệt và múi giờ; không thu thập địa chỉ nhà hay GPS chính xác.</p></header>
    <div className="grid gap-3 sm:grid-cols-3">
      <Stat icon={Radio} label="Trạng thái" value={current ? 'Đang online' : 'Đã offline'} accent={Boolean(current)} />
      <Stat icon={Activity} label="Hoạt động 30 ngày" value={`${totalThisMonth} lần`} />
      <Stat icon={Globe2} label="Khu vực thiết bị" value={current?.timezone || ordered[0]?.timezone || 'Chưa xác định'} />
    </div>
    <ActivityHeatmap activities={activities} />
    <section>
      <div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">Lịch sử online</h2><p className="mt-1 text-xs text-slate-500">Tối đa 30 phiên gần nhất, gồm thời gian bắt đầu và kết thúc.</p></div></div>
      {ordered.length ? <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">{ordered.slice(0, 12).map((session, index) => {
        const end = session.endedAt || now
        const older = ordered[index + 1]
        const offlineGap = older?.endedAt && session.startedAt > older.endedAt ? session.startedAt - older.endedAt : 0
        return <div key={session.id} className="grid gap-3 border-b border-white/10 p-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="flex min-w-0 gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-300"><Laptop className="h-5 w-5" /></span><div className="min-w-0"><p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">{session.device === 'mobile' ? 'Điện thoại' : session.device === 'tablet' ? 'Máy tính bảng' : 'Máy tính'} · {session.browser}{!session.endedAt && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">ONLINE</span>}</p><p className="mt-1 text-xs text-slate-500">{session.timezone} · {session.locale}</p></div></div><div className="sm:text-right"><p className="text-xs text-slate-300">{formatMoment(session.startedAt)} → {session.endedAt ? formatMoment(session.endedAt) : 'hiện tại'}</p><p className="mt-1 text-[11px] text-slate-500">Online {formatDuration(end - session.startedAt)}{offlineGap ? ` · trước đó offline ${formatDuration(offlineGap)}` : ''}</p></div></div>
      })}</div> : <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center"><Clock3 className="mx-auto h-8 w-8 text-slate-600" /><p className="mt-3 text-sm text-slate-500">Phiên đầu tiên sẽ xuất hiện sau khi Database Rules mới được áp dụng.</p></div>}
    </section>
  </div>
}

function Stat({ icon: Icon, label, value, accent = false }: { icon: typeof Activity; label: string; value: string; accent?: boolean }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><Icon className={`mb-3 h-5 w-5 ${accent ? 'text-emerald-300' : 'text-purple-300'}`} /><p className="truncate text-lg font-bold text-white">{value}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div>
}
