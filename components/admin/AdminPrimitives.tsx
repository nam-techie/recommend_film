'use client'

import type { HTMLAttributes, ReactNode } from 'react'
import { AlertTriangle, Database, Inbox, Loader2, ShieldAlert, WifiOff, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AdminPage({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <main id="admin-main" tabIndex={-1} className={cn('px-4 py-7 sm:px-6 xl:px-8 xl:py-9', className)} {...props} />
}

export function AdminPageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
    <div className="min-w-0">
      {eyebrow && <p className="text-eyebrow text-accent-soft">{eyebrow}</p>}
      <h1 className={cn('text-title-1', eyebrow && 'mt-3')}>{title}</h1>
      {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-fg-secondary">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </header>
}

export function AdminToolbar({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-6 flex flex-col gap-3 border-y border-white/[0.08] bg-surface-1/60 px-4 py-4 sm:flex-row sm:items-end', className)} {...props} />
}

export function AdminSection({ title, description, actions, className, children }: { title?: string; description?: string; actions?: ReactNode; className?: string; children: ReactNode }) {
  return <section className={cn('border border-white/[0.08] bg-surface-1 shadow-card', className)}>
    {(title || description || actions) && <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
      <div>{title && <h2 className="text-sm font-semibold">{title}</h2>}{description && <p className="mt-1 text-xs leading-5 text-fg-muted">{description}</p>}</div>
      {actions}
    </div>}
    {children}
  </section>
}

export function MetricCard({ label, value, detail, icon: Icon, tone = 'neutral' }: { label: string; value: ReactNode; detail?: string; icon: LucideIcon; tone?: 'neutral' | 'accent' | 'ok' | 'warn' }) {
  const tones = { neutral: 'bg-surface-2 text-fg-secondary', accent: 'bg-accent/12 text-accent-soft', ok: 'bg-ok/10 text-ok', warn: 'bg-warn/10 text-warn' }
  return <article className="border-t border-white/[0.1] bg-surface-1 px-5 py-5">
    <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-fg-secondary">{label}</p><span className={cn('flex h-9 w-9 items-center justify-center rounded-md', tones[tone])}><Icon className="h-4 w-4" /></span></div>
    <p className="mt-4 font-display text-2xl font-bold tabular-nums tracking-tight">{value}</p>
    {detail && <p className="mt-2 text-xs leading-5 text-fg-muted">{detail}</p>}
  </article>
}

export type AdminDataState = 'real' | 'empty' | 'unavailable'
export function DataSourceIndicator({ state, since }: { state: AdminDataState; since?: number | null }) {
  const config = state === 'real'
    ? { label: 'Dữ liệu vận hành', className: 'border-ok/25 bg-ok/10 text-ok', dot: 'bg-ok' }
    : state === 'empty'
      ? { label: 'Chưa có dữ liệu', className: 'border-info/25 bg-info/10 text-info-soft', dot: 'bg-info' }
      : { label: 'Nguồn dữ liệu gián đoạn', className: 'border-warn/25 bg-warn/10 text-warn', dot: 'bg-warn' }
  return <span className={cn('inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold', config.className)}><span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />{config.label}{since ? ` · từ ${new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' }).format(since)}` : ''}</span>
}

export function FormField({ label, description, htmlFor, children }: { label: string; description?: string; htmlFor?: string; children: ReactNode }) {
  return <div className="space-y-2"><label htmlFor={htmlFor} className="block text-sm font-semibold">{label}</label>{children}{description && <p className="text-xs leading-5 text-fg-muted">{description}</p>}</div>
}

export function AdminState({ kind, title, description }: { kind: 'loading' | 'empty' | 'error' | 'denied' | 'unavailable'; title: string; description?: string }) {
  const Icon = kind === 'loading' ? Loader2 : kind === 'empty' ? Inbox : kind === 'error' ? AlertTriangle : kind === 'denied' ? ShieldAlert : WifiOff
  return <div className="flex min-h-52 flex-col items-center justify-center px-6 py-10 text-center"><span className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-2 text-fg-muted"><Icon className={cn('h-5 w-5', kind === 'loading' && 'animate-spin', kind === 'error' && 'text-bad', kind === 'unavailable' && 'text-warn')} /></span><h3 className="mt-4 text-sm font-semibold">{title}</h3>{description && <p className="mt-2 max-w-md text-sm leading-6 text-fg-muted">{description}</p>}</div>
}

export function AdminTable({ caption, children }: { caption: string; children: ReactNode }) {
  return <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><caption className="sr-only">{caption}</caption>{children}</table></div>
}

export function AdminSkeletonRows({ rows = 5 }: { rows?: number }) {
  return <div aria-label="Đang tải dữ liệu" className="divide-y divide-white/[0.06]">{Array.from({ length: rows }).map((_, index) => <div key={index} className="grid grid-cols-4 gap-4 px-5 py-4"><span className="skeleton h-4 rounded" /><span className="skeleton h-4 rounded" /><span className="skeleton h-4 rounded" /><span className="skeleton h-4 rounded" /></div>)}</div>
}

export function EmptyDataNotice() {
  return <AdminState kind="empty" title="Chưa bắt đầu thu thập dữ liệu xem" description="CineMind sẽ hiển thị số liệu từ thời điểm analytics server được bật. Không sử dụng dữ liệu mẫu hoặc backfill từ lịch sử resume." />
}

export function SystemSourceNote({ children }: { children: ReactNode }) {
  return <div className="flex gap-3 border-l-2 border-info bg-info/[0.05] px-4 py-3 text-sm leading-6 text-fg-secondary"><Database className="mt-0.5 h-4 w-4 shrink-0 text-info" />{children}</div>
}
