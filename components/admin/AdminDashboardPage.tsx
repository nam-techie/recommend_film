'use client'

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  BadgePercent,
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clapperboard,
  CreditCard,
  Eye,
  EyeOff,
  Film,
  HeartHandshake,
  LayoutDashboard,
  Link2,
  Loader2,
  LockKeyhole,
  LogOut,
  Menu,
  MessageCircleMore,
  PackageOpen,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { AdminDashboardSnapshot, DashboardDataSource } from '@/lib/admin-dashboard'
import { auth } from '@/lib/firebase'
import { TotpMultiFactorGenerator, getMultiFactorResolver, type MultiFactorResolver } from 'firebase/auth'

const formatNumber = new Intl.NumberFormat('vi-VN')
const formatCurrency = (value: number) => `${formatNumber.format(value)}đ`

const navigation: Array<{ label: string; icon: LucideIcon; href?: string; soon?: boolean }> = [
  { label: 'Tổng quan', icon: LayoutDashboard, href: '/admin' },
  { label: 'Người dùng', icon: Users, href: '/admin/users' },
  { label: 'Gói & giá', icon: PackageOpen, href: '/admin/plans' },
  { label: 'Mã giảm giá', icon: BadgePercent, href: '/admin/discounts' },
  { label: 'Shopee Affiliate', icon: Link2, href: '/admin/affiliate' },
  { label: 'Bảo mật', icon: ShieldCheck, href: '/admin/security' },
  { label: 'Đơn hàng', icon: CreditCard, soon: true },
  { label: 'Phim & nội dung', icon: Film, soon: true },
  { label: 'Cộng đồng', icon: MessageCircleMore, soon: true },
  { label: 'Cấu hình', icon: Settings, soon: true },
]

function SourceBadge({ source }: { source: DashboardDataSource }) {
  const labels: Record<DashboardDataSource, string> = { live: 'Dữ liệu thật', demo: 'Dữ liệu mẫu', derived: 'Suy ra', unavailable: 'Chưa kết nối' }
  return <span className={cn(
    'inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-semibold',
    source === 'live' && 'border-ok/25 bg-ok/10 text-ok',
    source === 'demo' && 'border-warn/25 bg-warn/10 text-warn',
    source === 'derived' && 'border-info/25 bg-info/10 text-info-soft',
    source === 'unavailable' && 'border-bad/25 bg-bad/10 text-bad',
  )}><span className={cn('h-1.5 w-1.5 rounded-full', source === 'live' ? 'bg-ok' : source === 'demo' ? 'bg-warn' : source === 'derived' ? 'bg-info' : 'bg-bad')} />{labels[source]}</span>
}

export function AdminLogin() {
  const { configured, loading, signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null)
  const [mfaCode, setMfaCode] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true); setError(null)
    try { await signInWithEmail(email, password) }
    catch (nextError) {
      const code = typeof nextError === 'object' && nextError && 'code' in nextError ? String(nextError.code) : ''
      if (code === 'auth/multi-factor-auth-required' && auth) {
        const resolver = getMultiFactorResolver(auth, nextError as never)
        if (resolver.hints.some((hint) => hint.factorId === TotpMultiFactorGenerator.FACTOR_ID)) {
          setMfaResolver(resolver); setError(null); return
        }
      }
      setError(nextError instanceof Error ? nextError.message : 'Không thể đăng nhập.')
    }
    finally { setBusy(false) }
  }

  const submitMfa = async (event: FormEvent) => {
    event.preventDefault()
    if (!mfaResolver || mfaCode.length !== 6) return
    setBusy(true); setError(null)
    try {
      const hint = mfaResolver.hints.find((item) => item.factorId === TotpMultiFactorGenerator.FACTOR_ID)
      if (!hint) throw new Error('Không tìm thấy Google Authenticator cho tài khoản này.')
      await mfaResolver.resolveSignIn(TotpMultiFactorGenerator.assertionForSignIn(hint.uid, mfaCode))
    } catch (nextError) {
      const code = typeof nextError === 'object' && nextError && 'code' in nextError ? String(nextError.code) : ''
      setError(code === 'auth/invalid-verification-code' ? 'Mã 6 số không đúng hoặc đã hết hạn.' : nextError instanceof Error ? nextError.message : 'Không thể xác minh mã 6 số.')
    } finally { setBusy(false) }
  }

  return <div className="relative flex min-h-screen overflow-hidden bg-bg">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,hsl(var(--accent)/0.18),transparent_33%),radial-gradient(circle_at_88%_80%,hsl(var(--info)/0.10),transparent_30%)]" />
    <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[54%] overflow-hidden lg:block">
      <div className="absolute -left-20 top-24 h-72 w-72 rounded-full border border-accent/20" />
      <div className="absolute left-20 top-48 h-72 w-72 rounded-full border border-accent/10" />
      <div className="absolute bottom-16 left-12 grid grid-cols-6 gap-3 opacity-40" aria-hidden>
        {Array.from({ length: 24 }).map((_, index) => <span key={index} className="h-16 w-10 rounded-md border border-white/10 bg-surface-2" />)}
      </div>
    </div>

    <div className="relative mx-auto grid min-h-screen w-full max-w-shell lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden flex-col justify-between p-12 lg:flex xl:p-16">
        <Link href="/" className="inline-flex w-fit items-center gap-3" aria-label="Về trang chủ CineMind">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-fg shadow-accent"><Clapperboard className="h-5 w-5" /></span>
          <span className="font-display text-xl font-bold">CineMind</span>
        </Link>
        <div className="max-w-xl pb-16">
          <p className="text-eyebrow text-accent-soft">Trung tâm vận hành</p>
          <h1 className="mt-5 text-display">Mọi tín hiệu của rạp phim, trong một khung hình.</h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-fg-secondary">Theo dõi tăng trưởng, thành viên và sức khỏe hệ thống bằng một dashboard được thiết kế riêng cho CineMind.</p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm text-fg-secondary">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">Firebase bảo vệ</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">Một admin duy nhất</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">Không lưu mật khẩu</span>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8 lg:border-l lg:border-white/[0.08] lg:bg-surface-1/65 lg:backdrop-blur-xl">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-10 inline-flex items-center gap-3 lg:hidden"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-fg"><Clapperboard className="h-5 w-5" /></span><span className="font-display text-xl font-bold">CineMind</span></Link>
          <div className="mb-8">
            <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent-soft"><ShieldCheck className="h-6 w-6" /></span>
            <p className="text-eyebrow text-fg-muted">Admin portal</p>
            <h2 className="mt-3 text-title-1">Đăng nhập quản trị</h2>
            <p className="mt-3 text-sm leading-6 text-fg-secondary">Dùng tài khoản Firebase đã được cấp UID admin. Quyền truy cập sẽ được xác minh lại ở server.</p>
          </div>
          {!mfaResolver ? <form onSubmit={(event) => void submit(event)} className="space-y-5">
            <div className="space-y-2"><Label htmlFor="admin-email">Email quản trị</Label><Input id="admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com" className="h-12 border-white/10 bg-black/20" /></div>
            <div className="space-y-2"><Label htmlFor="admin-password">Mật khẩu</Label><div className="relative"><LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" /><Input id="admin-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" className="h-12 border-white/10 bg-black/20 px-10" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-fg-muted hover:bg-white/5 hover:text-fg">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
            {!loading && !configured && <p role="alert" className="rounded-xl border border-bad/25 bg-bad/10 p-3 text-sm text-bad">Firebase Authentication chưa được cấu hình.</p>}
            {error && <p role="alert" className="rounded-xl border border-bad/25 bg-bad/10 p-3 text-sm text-bad">{error}</p>}
            <Button type="submit" disabled={busy || loading || !configured || !email || password.length < 6} className="h-12 w-full bg-accent-strong font-semibold hover:bg-accent">{busy || loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ShieldCheck className="h-4 w-4" />Vào dashboard</>}</Button>
          </form> : <form onSubmit={(event) => void submitMfa(event)} className="space-y-5">
            <div className="rounded-xl border border-accent/25 bg-accent/10 p-4 text-sm leading-6 text-fg-secondary">Mở Google Authenticator và nhập mã 6 số đang hiển thị cho CineMind Admin.</div>
            <div className="space-y-2"><Label htmlFor="admin-mfa-code">Mã xác thực</Label><Input id="admin-mfa-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="h-14 text-center font-mono text-2xl tracking-[0.35em]" autoFocus /></div>
            {error && <p role="alert" className="rounded-xl border border-bad/25 bg-bad/10 p-3 text-sm text-bad">{error}</p>}
            <Button type="submit" disabled={busy || mfaCode.length !== 6} className="h-12 w-full bg-accent-strong font-semibold hover:bg-accent">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ShieldCheck className="h-4 w-4" />Xác minh và vào dashboard</>}</Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => { setMfaResolver(null); setMfaCode(''); setError(null) }}>Quay lại đăng nhập</Button>
          </form>}
          <p className="mt-8 flex items-center gap-2 text-xs leading-5 text-fg-muted"><LockKeyhole className="h-3.5 w-3.5 shrink-0" />CineMind không lưu mật khẩu quản trị trong mã nguồn.</p>
        </div>
      </section>
    </div>
  </div>
}

export function AdminShell({ children, viewer, refreshedAt, refreshing, onRefresh, onLogout }: { children: ReactNode; viewer: AdminDashboardSnapshot['viewer']; refreshedAt: number; refreshing: boolean; onRefresh: () => void; onLogout: () => void }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const sidebar = <>
    <div className="flex h-20 items-center border-b border-white/[0.08] px-4">
      <Link href="/admin" className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-fg shadow-accent"><Clapperboard className="h-5 w-5" /></span>{!collapsed && <span className="min-w-0"><span className="block truncate font-display text-lg font-bold">CineMind</span><span className="block text-xs text-fg-muted">Admin console</span></span>}</Link>
      <button type="button" className="ml-auto hidden h-9 w-9 items-center justify-center rounded-lg text-fg-muted hover:bg-white/[0.06] hover:text-fg lg:flex" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}>{collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}</button>
    </div>
    <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Quản trị">
      {!collapsed && <p className="px-3 pb-2 pt-3 text-xs font-bold uppercase tracking-[0.15em] text-fg-muted">Vận hành</p>}
      {navigation.map((item) => {
        const Icon = item.icon
        const active = item.href === pathname
        const content = <><Icon className="h-[18px] w-[18px] shrink-0" />{!collapsed && <><span className="min-w-0 flex-1 truncate">{item.label}</span>{item.soon && <span className="rounded-full bg-white/[0.06] px-2 py-1 text-xs font-semibold text-fg-muted">Sắp có</span>}</>}</>
        const className = cn('group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition', active ? 'bg-accent/15 text-accent-soft ring-1 ring-inset ring-accent/20' : 'text-fg-secondary hover:bg-white/[0.05] hover:text-fg', item.soon && 'cursor-not-allowed opacity-70')
        return item.href ? <Link key={item.label} href={item.href} title={collapsed ? item.label : undefined} className={className}>{content}</Link> : <button key={item.label} type="button" disabled title={collapsed ? item.label : undefined} className={className}>{content}</button>
      })}
    </nav>
    <div className="border-t border-white/[0.08] p-3">
      <button type="button" onClick={onLogout} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-fg-secondary transition hover:bg-bad/10 hover:text-bad"><LogOut className="h-[18px] w-[18px] shrink-0" />{!collapsed && 'Đăng xuất'}</button>
    </div>
  </>

  return <div className="min-h-screen bg-bg">
    <aside className={cn('fixed inset-y-0 left-0 z-40 hidden border-r border-white/[0.08] bg-surface-1 transition-[width] duration-200 lg:flex lg:flex-col', collapsed ? 'w-[76px]' : 'w-64')}>{sidebar}</aside>
    {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button type="button" aria-label="Đóng menu" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} /><aside className="relative flex h-full w-[min(84vw,320px)] flex-col border-r border-white/10 bg-surface-1 shadow-raised"><button type="button" onClick={() => setMobileOpen(false)} aria-label="Đóng menu" className="absolute right-3 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-lg text-fg-secondary hover:bg-white/5"><X className="h-5 w-5" /></button>{sidebar}</aside></div>}
    <div className={cn('min-w-0 transition-[padding] duration-200', collapsed ? 'lg:pl-[76px]' : 'lg:pl-64')}>
      <header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b border-white/[0.08] bg-bg/85 px-4 backdrop-blur-xl sm:px-6 xl:px-8">
        <button type="button" onClick={() => setMobileOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-fg-secondary lg:hidden" aria-label="Mở menu"><Menu className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">Trung tâm vận hành</p><p className="hidden text-xs text-fg-muted sm:block">Cập nhật lúc {new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(refreshedAt)}</p></div>
        <label className="relative hidden w-full max-w-xs xl:block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" /><Input aria-label="Tìm kiếm chức năng" placeholder="Tìm trong quản trị..." className="h-10 border-white/10 bg-surface-2 pl-9" disabled /></label>
        <Button type="button" variant="ghost" size="icon" onClick={onRefresh} disabled={refreshing} aria-label="Làm mới dashboard" className="h-11 w-11 rounded-xl border border-white/[0.08] text-fg-secondary"><RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} /></Button>
        <button type="button" disabled aria-label="Thông báo" className="relative hidden h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] text-fg-secondary sm:flex"><Bell className="h-4 w-4" /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" /></button>
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-surface-1 p-1.5 pr-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-xs font-bold text-accent-soft">AD</span><span className="hidden max-w-40 sm:block"><span className="block truncate text-xs font-semibold">Administrator</span><span className="block truncate text-xs text-fg-muted">{viewer.email || viewer.uid}</span></span></div>
      </header>
      {children}
    </div>
  </div>
}

function MetricCard({ label, value, detail, icon: Icon, source, accent = false }: { label: string; value: string; detail: string; icon: typeof Activity; source: DashboardDataSource; accent?: boolean }) {
  return <article className={cn('relative overflow-hidden rounded-xl border p-5 shadow-card', accent ? 'border-accent/25 bg-gradient-to-br from-accent/15 via-surface-1 to-surface-1' : 'border-white/[0.08] bg-surface-1')}>
    <div className="flex items-start justify-between gap-3"><span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', accent ? 'bg-accent text-accent-fg shadow-accent' : 'bg-surface-2 text-fg-secondary')}><Icon className="h-5 w-5" /></span><SourceBadge source={source} /></div>
    <p className="mt-6 text-sm font-medium text-fg-secondary">{label}</p><p className="mt-1 font-display text-2xl font-bold tracking-tight">{value}</p><p className="mt-2 text-xs text-fg-muted">{detail}</p>
  </article>
}

function RevenueChart({ items }: { items: AdminDashboardSnapshot['revenueSeries'] }) {
  const max = Math.max(...items.map((item) => item.value), 1)
  const points = items.map((item, index) => ({ x: 28 + index * (644 / Math.max(items.length - 1, 1)), y: 186 - (item.value / max) * 142, ...item }))
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ')
  const area = `${path} L ${points.at(-1)?.x || 672} 190 L 28 190 Z`
  return <div className="mt-6 overflow-hidden"><svg viewBox="0 0 700 228" role="img" aria-label="Biểu đồ doanh thu mẫu 7 ngày" className="h-auto w-full min-w-[560px]">
    <defs><linearGradient id="adminRevenueArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="hsl(var(--accent))" stopOpacity="0.32" /><stop offset="1" stopColor="hsl(var(--accent))" stopOpacity="0" /></linearGradient></defs>
    {[48, 95, 142, 189].map((y) => <line key={y} x1="28" x2="672" y1={y} y2={y} stroke="hsl(var(--line))" strokeDasharray="4 6" />)}
    <path d={area} fill="url(#adminRevenueArea)" /><path d={path} fill="none" stroke="hsl(var(--accent))" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    {points.map((point) => <g key={point.label}><circle cx={point.x} cy={point.y} r="5" fill="hsl(var(--surface-1))" stroke="hsl(var(--accent-soft))" strokeWidth="3" /><text x={point.x} y="216" fill="hsl(var(--fg-muted))" textAnchor="middle" fontSize="12">{point.label}</text></g>)}
  </svg></div>
}

function MembershipDonut({ data, source }: { data: AdminDashboardSnapshot['memberships']; source: DashboardDataSource }) {
  const total = Math.max(data.total, 1)
  const normalEnd = data.normal / total * 100
  const premiumEnd = normalEnd + data.premium / total * 100
  return <section className="rounded-xl border border-white/[0.08] bg-surface-1 p-5 shadow-card">
    <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">Phân bổ tài khoản</p><p className="mt-1 text-xs text-fg-muted">Theo entitlement còn hiệu lực</p></div><SourceBadge source={source} /></div>
    <div className="mt-7 flex flex-col items-center gap-6 sm:flex-row lg:flex-col 2xl:flex-row">
      <div className="relative h-40 w-40 shrink-0 rounded-full" style={{ background: `conic-gradient(hsl(var(--fg-muted)) 0 ${normalEnd}%, hsl(var(--accent)) ${normalEnd}% ${premiumEnd}%, hsl(var(--info)) ${premiumEnd}% 100%)` }}><div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-surface-1"><span className="font-display text-3xl font-bold">{formatNumber.format(data.total)}</span><span className="text-xs text-fg-muted">tài khoản</span></div></div>
      <div className="w-full space-y-3">{[
        ['CinePass', data.normal, 'bg-fg-muted'], ['CinePass Plus', data.premium, 'bg-accent'], ['CinePass Ultra', data.ultra, 'bg-info'],
      ].map(([label, value, color]) => <div key={String(label)} className="flex items-center gap-3"><span className={cn('h-2.5 w-2.5 rounded-full', String(color))} /><span className="flex-1 text-sm text-fg-secondary">{label}</span><span className="font-mono text-sm font-semibold">{formatNumber.format(Number(value))}</span></div>)}</div>
    </div>
  </section>
}

function HealthStatus({ status }: { status: AdminDashboardSnapshot['health'][number]['status'] }) {
  const label = status === 'operational' ? 'Hoạt động' : status === 'degraded' ? 'Cần kiểm tra' : 'Sắp triển khai'
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', status === 'operational' ? 'bg-ok/10 text-ok' : status === 'degraded' ? 'bg-warn/10 text-warn' : 'bg-info/10 text-info-soft')}><span className={cn('h-1.5 w-1.5 rounded-full', status === 'operational' ? 'bg-ok' : status === 'degraded' ? 'bg-warn' : 'bg-info')} />{label}</span>
}

function DashboardContent({ data }: { data: AdminDashboardSnapshot }) {
  const paymentTotal = data.payments.successful + data.payments.failed + data.payments.pending
  const successRate = paymentTotal ? data.payments.successful / paymentTotal * 100 : 0
  return <div className="relative px-4 py-7 sm:px-6 xl:px-8 xl:py-9">
    <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 bg-[radial-gradient(circle,hsl(var(--accent)/0.08),transparent_68%)]" />
    <div className="relative mx-auto max-w-shell">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div><div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-accent-soft"><Sparkles className="h-3.5 w-3.5" />Bảng điều khiển</div><h1 className="text-title-1">Chào buổi vận hành.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-fg-secondary">Tín hiệu kinh doanh và hệ thống của CineMind. Mọi số liệu mẫu đều được đánh dấu để bạn không nhầm với dữ liệu thật.</p></div>
        <div className="flex items-center gap-2 self-start rounded-xl border border-white/[0.08] bg-surface-1 px-3 py-2 text-xs text-fg-secondary md:self-auto"><Activity className="h-4 w-4 text-ok" /><span>Cập nhật {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(data.generatedAt)}</span></div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard label="Doanh thu hôm nay" value={formatCurrency(data.metrics.revenueToday)} detail={`Tháng này ${formatCurrency(data.metrics.revenueMonth)}`} icon={CircleDollarSign} source={data.sources.revenue} accent />
        <MetricCard label="Tổng người dùng" value={formatNumber.format(data.metrics.totalUsers)} detail="Mặc định CinePass khi chưa có gói" icon={Users} source={data.sources.users} />
        <MetricCard label="Lượt xem" value={formatNumber.format(data.metrics.totalViews)} detail="Tổng lượt xem trong tháng" icon={Eye} source={data.sources.views} />
        <MetricCard label="Phòng đang mở" value={formatNumber.format(data.metrics.activeRooms)} detail={`${data.rooms.participants} người đang tham gia`} icon={Clapperboard} source={data.sources.rooms} />
        <MetricCard label="Mã đang chạy" value={formatNumber.format(data.metrics.activeDiscounts)} detail={`${data.discounts.redemptions} lượt sử dụng`} icon={BadgePercent} source={data.sources.discounts} />
        <MetricCard label="Thanh toán thành công" value={`${successRate.toFixed(1)}%`} detail={`${data.payments.failed} giao dịch thất bại`} icon={WalletCards} source={data.sources.payments} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)]">
        <section className="min-w-0 overflow-hidden rounded-xl border border-white/[0.08] bg-surface-1 p-5 shadow-card sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold">Xu hướng doanh thu</p><p className="mt-1 text-xs text-fg-muted">7 ngày gần nhất · VND</p></div><div className="flex items-center gap-3"><SourceBadge source={data.sources.revenue} /><span className="flex items-center gap-1 text-xs font-semibold text-ok"><TrendingUp className="h-3.5 w-3.5" />+16,8%</span></div></div>
          <div className="overflow-x-auto"><RevenueChart items={data.revenueSeries} /></div>
        </section>
        <MembershipDonut data={data.memberships} source={data.sources.users} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)_minmax(280px,0.8fr)]">
        <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-surface-1 shadow-card">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4"><div><p className="text-sm font-semibold">Phim nổi bật</p><p className="mt-1 text-xs text-fg-muted">Xếp theo lượt xem</p></div><SourceBadge source={data.sources.views} /></div>
          <div className="divide-y divide-white/[0.06]">{data.popularMovies.map((movie, index) => <div key={movie.title} className="flex items-center gap-3 px-5 py-3.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 font-mono text-xs font-bold text-fg-muted">0{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{movie.title}</p><p className="mt-0.5 text-xs text-fg-muted">{movie.genre}</p></div><div className="text-right"><p className="font-mono text-sm font-semibold">{formatNumber.format(movie.views)}</p><p className="text-xs text-ok">+{movie.growth}%</p></div></div>)}</div>
        </section>

        <section className="rounded-xl border border-white/[0.08] bg-surface-1 p-5 shadow-card">
          <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">Thanh toán</p><p className="mt-1 text-xs text-fg-muted">Trạng thái giao dịch</p></div><SourceBadge source={data.sources.payments} /></div>
          <div className="mt-6 flex items-center justify-center"><div className="relative flex h-36 w-36 items-center justify-center rounded-full" style={{ background: `conic-gradient(hsl(var(--ok)) 0 ${successRate}%, hsl(var(--bad)) ${successRate}% ${successRate + data.payments.failed / Math.max(paymentTotal, 1) * 100}%, hsl(var(--warn)) 0)` }}><div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-surface-1"><span className="font-display text-2xl font-bold">{successRate.toFixed(0)}%</span><span className="text-xs text-fg-muted">thành công</span></div></div></div>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center"><div><p className="font-mono text-sm font-bold text-ok">{data.payments.successful}</p><p className="mt-1 text-xs text-fg-muted">Thành công</p></div><div><p className="font-mono text-sm font-bold text-bad">{data.payments.failed}</p><p className="mt-1 text-xs text-fg-muted">Thất bại</p></div><div><p className="font-mono text-sm font-bold text-warn">{data.payments.pending}</p><p className="mt-1 text-xs text-fg-muted">Chờ xử lý</p></div></div>
        </section>

        <section className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-surface-1 to-accent/[0.06] p-5 shadow-card">
          <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">Mã giảm giá</p><p className="mt-1 text-xs text-fg-muted">Hiệu quả chiến dịch</p></div><SourceBadge source={data.sources.discounts} /></div>
          <div className="mt-7 rounded-xl border border-white/[0.08] bg-black/15 p-4"><div className="flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent-soft"><BadgePercent className="h-6 w-6" /></span><div><p className="font-display text-2xl font-bold">{data.discounts.conversionRate}%</p><p className="text-xs text-fg-muted">Tỷ lệ chuyển đổi</p></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-accent" style={{ width: `${data.discounts.conversionRate}%` }} /></div></div>
          <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-white/[0.035] p-3"><p className="font-mono text-lg font-bold">{data.discounts.active}</p><p className="mt-1 text-xs text-fg-muted">Mã hoạt động</p></div><div className="rounded-xl bg-white/[0.035] p-3"><p className="font-mono text-lg font-bold">{data.discounts.redemptions}</p><p className="mt-1 text-xs text-fg-muted">Lượt sử dụng</p></div></div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.45fr)]">
        <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-surface-1 shadow-card"><div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4"><div><p className="text-sm font-semibold">Sức khỏe hệ thống</p><p className="mt-1 text-xs text-fg-muted">Kiểm tra các dịch vụ cốt lõi</p></div><HeartHandshake className="h-5 w-5 text-fg-muted" /></div><div className="divide-y divide-white/[0.06]">{data.health.map((item) => <div key={item.name} className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(180px,0.55fr)_minmax(0,1fr)_auto] sm:items-center"><p className="text-sm font-semibold">{item.name}</p><p className="text-xs leading-5 text-fg-muted">{item.detail}</p><HealthStatus status={item.status} /></div>)}</div></section>
        <aside className="rounded-xl border border-warn/20 bg-warn/[0.06] p-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warn/10 text-warn"><ShieldAlert className="h-5 w-5" /></span><div><p className="text-sm font-semibold">Ghi chú dữ liệu</p><p className="text-xs text-fg-muted">Trước khi vận hành thật</p></div></div><ul className="mt-5 space-y-3">{data.notices.map((notice) => <li key={notice} className="flex gap-2 text-xs leading-5 text-fg-secondary"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />{notice}</li>)}</ul></aside>
      </div>
    </div>
  </div>
}

export function AccessDenied({ message, onLogout }: { message: string; onLogout: () => void }) {
  return <div className="flex min-h-screen items-center justify-center bg-bg px-4"><div className="w-full max-w-md rounded-xl border border-bad/25 bg-surface-1 p-7 text-center shadow-raised"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-bad/10 text-bad"><ShieldAlert className="h-7 w-7" /></span><h1 className="mt-5 text-title-2">Không có quyền truy cập</h1><p className="mt-3 text-sm leading-6 text-fg-secondary">{message}</p><div className="mt-6 flex flex-col gap-2 sm:flex-row"><Button asChild variant="outline" className="h-11 flex-1"><Link href="/">Về trang phim</Link></Button><Button onClick={onLogout} className="h-11 flex-1 bg-accent-strong hover:bg-accent">Đăng nhập tài khoản khác</Button></div></div></div>
}

export function AdminDashboardPage() {
  const { user, loading: authLoading, logout } = useAuth()
  const [data, setData] = useState<AdminDashboardSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true); setError(null); setDenied(false)
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/admin/dashboard', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      const payload = await response.json().catch(() => ({})) as AdminDashboardSnapshot & { error?: string }
      if (response.status === 401 || response.status === 403) { setDenied(true); setError(payload.error || 'Tài khoản không có quyền quản trị.'); return }
      if (!response.ok) throw new Error(payload.error || 'Không thể tải dashboard.')
      setData(payload)
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Không thể tải dashboard.') }
    finally { setLoading(false) }
  }, [user])

  useEffect(() => { if (user) void load(); else { setData(null); setDenied(false); setError(null) } }, [load, user])
  const handleLogout = useCallback(() => { void logout().catch(() => undefined) }, [logout])
  const refreshedAt = useMemo(() => data?.generatedAt || Date.now(), [data?.generatedAt])

  if (authLoading) return <div className="flex min-h-screen items-center justify-center bg-bg"><div className="text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-accent" /><p className="mt-3 text-sm text-fg-secondary">Đang kiểm tra phiên quản trị...</p></div></div>
  if (!user) return <AdminLogin />
  if (denied) return <AccessDenied message={error || 'Tài khoản không có quyền quản trị.'} onLogout={handleLogout} />
  if (!data && loading) return <div className="flex min-h-screen items-center justify-center bg-bg"><div className="text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-accent" /><p className="mt-3 text-sm text-fg-secondary">Đang dựng dashboard...</p></div></div>
  if (!data) return <div className="flex min-h-screen items-center justify-center bg-bg px-4"><div className="w-full max-w-md rounded-xl border border-warn/25 bg-surface-1 p-7 text-center"><ShieldAlert className="mx-auto h-8 w-8 text-warn" /><h1 className="mt-4 text-title-2">Chưa tải được dashboard</h1><p className="mt-3 text-sm text-fg-secondary">{error || 'Đã xảy ra lỗi không xác định.'}</p><div className="mt-6 flex gap-2"><Button variant="outline" onClick={handleLogout} className="flex-1">Đăng xuất</Button><Button onClick={() => void load()} className="flex-1 bg-accent-strong hover:bg-accent">Thử lại</Button></div></div></div>

  return <AdminShell viewer={data.viewer} refreshedAt={refreshedAt} refreshing={loading} onRefresh={() => void load()} onLogout={handleLogout}><DashboardContent data={data} /></AdminShell>
}
