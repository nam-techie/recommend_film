'use client'

import { useMemo } from 'react'
import { SocialActivity } from '@/lib/account-types'
import { cn } from '@/lib/utils'

const DAY = 86_400_000
const dayKey = (value: number) => {
  const date = new Date(value)
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

export function ActivityHeatmap({ activities, weeks = 18 }: { activities: SocialActivity[]; weeks?: number }) {
  const { days, total } = useMemo(() => {
    const counts = activities.reduce<Record<string, number>>((result, item) => {
      const key = dayKey(item.createdAt)
      result[key] = (result[key] || 0) + 1
      return result
    }, {})
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const mondayOffset = (today.getDay() + 6) % 7
    const start = new Date(today.getTime() - (mondayOffset + (weeks - 1) * 7) * DAY)
    const values = Array.from({ length: weeks * 7 }, (_, index) => {
      const date = new Date(start.getTime() + index * DAY)
      return { date, count: date > today ? -1 : counts[dayKey(date.getTime())] || 0 }
    })
    return { days: values, total: values.reduce((sum, day) => sum + Math.max(0, day.count), 0) }
  }, [activities, weeks])

  return <section className="rounded-2xl border border-white/10 bg-[#0b0e18] p-4 sm:p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold text-white">Dấu ấn xem phim</h3><p className="mt-1 text-xs text-slate-500">{total} hoạt động trong {weeks} tuần gần nhất</p></div><div className="flex items-center gap-1 text-[10px] text-slate-500"><span>Ít</span>{[0, 1, 2, 3, 4].map((level) => <span key={level} className={cn('h-3 w-3 rounded-[3px]', level === 0 ? 'bg-white/[0.055]' : level === 1 ? 'bg-purple-950' : level === 2 ? 'bg-purple-800' : level === 3 ? 'bg-fuchsia-600' : 'bg-fuchsia-300')} />)}<span>Nhiều</span></div></div>
    <div className="overflow-x-auto pb-1"><div className="grid w-max grid-flow-col grid-rows-7 gap-1" role="img" aria-label={`Biểu đồ ${total} hoạt động trong ${weeks} tuần`}>
      {days.map(({ date, count }) => {
        const level = count <= 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 5 ? 3 : 4
        const label = new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
        return <span key={date.toISOString()} title={count < 0 ? '' : `${label}: ${count} hoạt động`} className={cn('h-3.5 w-3.5 rounded-[3px] ring-1 ring-inset ring-white/[0.035]', count < 0 ? 'bg-transparent ring-0' : level === 0 ? 'bg-white/[0.055]' : level === 1 ? 'bg-purple-950' : level === 2 ? 'bg-purple-800' : level === 3 ? 'bg-fuchsia-600' : 'bg-fuchsia-300')} />
      })}
    </div></div>
  </section>
}
