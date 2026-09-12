'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Download, ImageIcon, Loader2, Share2, Sparkles } from 'lucide-react'
import { auth } from '@/lib/firebase'
import type { ShareCardAccent, ShareCardContext, ShareCardFormat, ShareCardOptionalField, ShareCardRange } from '@/lib/profile'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const fieldOptions: Array<{ id: ShareCardOptionalField; label: string; analytics?: boolean }> = [
  { id: 'plan', label: 'Gói hiện tại' },
  { id: 'joinedAt', label: 'Tham gia từ tháng/năm' },
  { id: 'favoriteGenres', label: 'Thể loại yêu thích' },
  { id: 'qualifiedViews', label: 'Qualified views', analytics: true },
  { id: 'watchHours', label: 'Giờ xem đã xác minh', analytics: true },
  { id: 'completionRate', label: 'Completion rate', analytics: true },
  { id: 'favoriteMovies', label: 'Tối đa 3 phim Yêu thích' },
]

const accentClasses: Record<ShareCardAccent, string> = { fuchsia: 'bg-accent-strong', violet: 'bg-accent', cyan: 'bg-info', amber: 'bg-rating' }

async function authedFetch(url: string, init?: RequestInit) {
  const currentUser = auth?.currentUser
  if (!currentUser) throw new Error('Bạn cần đăng nhập.')
  const token = await currentUser.getIdToken()
  return fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.headers || {}) } })
}

export function ShareCardBuilder({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const [range, setRange] = useState<ShareCardRange>('30d')
  const [format, setFormat] = useState<ShareCardFormat>('portrait')
  const [accent, setAccent] = useState<ShareCardAccent>('fuchsia')
  const [fields, setFields] = useState<ShareCardOptionalField[]>(['plan', 'joinedAt', 'favoriteGenres', 'qualifiedViews', 'watchHours', 'completionRate'])
  const [movieSlugs, setMovieSlugs] = useState<string[]>([])
  const [context, setContext] = useState<ShareCardContext | null>(null)
  const [loading, setLoading] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true); setError('')
    void authedFetch(`/api/me/share-card/context?range=${range}`, { cache: 'no-store' })
      .then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Không tải được dữ liệu thẻ.'); setContext(payload) })
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : 'Không tải được dữ liệu thẻ.'))
      .finally(() => setLoading(false))
  }, [open, range])

  const selectedFields = useMemo(() => fields.filter((field) => context?.analytics.available || !fieldOptions.find((option) => option.id === field)?.analytics), [context?.analytics.available, fields])
  const toggleField = (field: ShareCardOptionalField, checked: boolean) => setFields((items) => checked ? Array.from(new Set([...items, field])) : items.filter((item) => item !== field))
  const toggleMovie = (slug: string, checked: boolean) => setMovieSlugs((items) => checked ? items.length < 3 ? [...items, slug] : items : items.filter((item) => item !== slug))

  const createPng = async () => {
    setRendering(true); setError('')
    try {
      const response = await authedFetch('/api/me/share-card/render', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ range, format, accent, fields: selectedFields, favoriteMovieSlugs: fields.includes('favoriteMovies') ? movieSlugs : [] }) })
      if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(payload.error || 'Không tạo được thẻ chia sẻ.') }
      const blob = await response.blob()
      const file = new File([blob], `cinemind-profile-${format}.png`, { type: 'image/png' })
      if (navigator.share && navigator.canShare?.({ files: [file] })) await navigator.share({ title: 'Hồ sơ CineMind của tôi', files: [file] })
      else {
        const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.name; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
      }
    } catch (nextError) { if ((nextError as DOMException)?.name !== 'AbortError') setError(nextError instanceof Error ? nextError.message : 'Không tạo được thẻ chia sẻ.') }
    finally { setRendering(false) }
  }

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant={compact ? 'ghost' : 'outline'} size={compact ? 'sm' : 'default'}><Sparkles className="mr-2 h-4 w-4" />Tạo thẻ chia sẻ</Button></DialogTrigger>
    <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto border-white/10 bg-[#090b12] p-0 text-fg">
      <DialogHeader className="border-b border-white/10 px-5 py-4 sm:px-7"><DialogTitle>Thẻ hồ sơ CineMind</DialogTitle><DialogDescription>Chọn đúng thông tin bạn muốn công khai trên ảnh. Email, UID, lịch sử chính xác và thanh toán không bao giờ được đưa vào thẻ.</DialogDescription></DialogHeader>
      {loading ? <div className="flex min-h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-accent-soft" /></div> : context ? <div className="grid min-h-[620px] lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,.95fr)]">
        <div className="flex items-center justify-center bg-black/30 p-5 sm:p-8">
          <div className={cn('relative flex w-full max-w-[420px] flex-col overflow-hidden rounded-[28px] border border-white/15 bg-gradient-to-br from-[#090a10] via-[#11131d] to-[#1a1020] p-7 shadow-2xl', format === 'story' ? 'aspect-[9/16]' : 'aspect-[4/5]')}>
            <div className={cn('absolute -right-20 -top-20 h-60 w-60 rounded-full blur-3xl opacity-30', accentClasses[accent])} />
            <div className="relative flex items-center justify-between"><strong className="text-lg">Cine<span className="text-accent-soft">Mind</span></strong><span className="text-[10px] tracking-[.18em] text-fg-muted">MY CINEMA PROFILE</span></div>
            <div className="relative mt-9 flex items-center gap-4"><div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-accent bg-accent/15 text-xl font-bold">{context.profile.avatar ? <img src={context.profile.avatar} alt="" className="h-full w-full object-cover" /> : context.profile.displayName.slice(0, 1)}</div><div className="min-w-0"><h3 className="truncate text-2xl font-extrabold">{context.profile.displayName}</h3><p className="truncate text-sm text-accent-soft">@{context.profile.username}</p>{selectedFields.includes('plan') && <span className="mt-2 inline-block rounded-full border border-accent/40 px-2.5 py-1 text-[10px] text-accent-soft">{context.plan === 'ultra' ? 'CinePass Ultra' : context.plan === 'premium' ? 'CinePass Plus' : 'CinePass'}</span>}</div></div>
            {context.analytics.available && <div className="relative mt-8 grid grid-cols-3 gap-2 border-y border-white/10 py-5 text-center"><PreviewStat show={selectedFields.includes('qualifiedViews')} value={context.analytics.qualifiedViews} label="Lượt xem"/><PreviewStat show={selectedFields.includes('watchHours')} value={context.analytics.watchHours.toFixed(1)} label="Giờ xem"/><PreviewStat show={selectedFields.includes('completionRate')} value={`${Math.round(context.analytics.completionRate)}%`} label="Hoàn thành"/></div>}
            {selectedFields.includes('favoriteGenres') && context.profile.favoriteGenres.length > 0 && <div className="relative mt-6"><p className="text-[10px] tracking-[.18em] text-fg-muted">GU PHIM</p><p className="mt-2 text-sm leading-6">{context.profile.favoriteGenres.slice(0, 5).join(' · ')}</p></div>}
            {selectedFields.includes('favoriteMovies') && movieSlugs.length > 0 && <div className="relative mt-6"><p className="text-[10px] tracking-[.18em] text-fg-muted">PHIM YÊU THÍCH</p><p className="mt-2 text-sm leading-6">{context.favoriteMovies.filter((movie) => movieSlugs.includes(movie.movieSlug)).map((movie) => movie.title).join(' · ')}</p></div>}
            <div className="relative mt-auto flex items-center justify-between text-[10px] text-fg-muted"><span>{range === '90d' ? '90 ngày gần nhất' : '30 ngày gần nhất'}</span>{selectedFields.includes('joinedAt') && <span>Tham gia {new Intl.DateTimeFormat('vi-VN', { month: '2-digit', year: 'numeric' }).format(context.profile.createdAt)}</span>}</div>
          </div>
        </div>
        <div className="space-y-6 border-t border-white/10 p-5 sm:p-7 lg:border-l lg:border-t-0">
          <OptionGroup title="Khoảng số liệu"><Segmented value={range} options={[['30d','30 ngày'],['90d','90 ngày']]} onChange={(value) => setRange(value as ShareCardRange)} /></OptionGroup>
          <OptionGroup title="Định dạng"><Segmented value={format} options={[['portrait','Portrait 1080×1350'],['story','Story 1080×1920']]} onChange={(value) => setFormat(value as ShareCardFormat)} /></OptionGroup>
          <OptionGroup title="Màu nhấn"><div className="flex gap-3">{(Object.keys(accentClasses) as ShareCardAccent[]).map((item) => <button key={item} type="button" onClick={() => setAccent(item)} aria-label={`Màu ${item}`} aria-pressed={accent === item} className={cn('h-9 w-9 rounded-full ring-offset-2 ring-offset-[#090b12]', accentClasses[item], accent === item && 'ring-2 ring-white')} />)}</div></OptionGroup>
          <OptionGroup title="Thông tin trên thẻ"><div className="space-y-2">{fieldOptions.map((option) => { const disabled = Boolean(option.analytics && !context.analytics.available); const checked = selectedFields.includes(option.id); return <label key={option.id} className={cn('flex items-center gap-3 rounded-xl border border-white/10 p-3 text-sm', disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer hover:bg-white/[.04]')}><input type="checkbox" className="sr-only" disabled={disabled} checked={checked} onChange={(event) => toggleField(option.id, event.target.checked)} /><span className={cn('flex h-5 w-5 items-center justify-center rounded border', checked ? 'border-accent bg-accent text-white' : 'border-white/25')}>{checked && <Check className="h-3.5 w-3.5" />}</span><span>{option.label}{disabled && <small className="mt-0.5 block text-fg-muted">Chưa có analytics đã xác minh.</small>}</span></label> })}</div></OptionGroup>
          {fields.includes('favoriteMovies') && <OptionGroup title="Phim Yêu thích (tối đa 3)"><div className="space-y-2">{context.favoriteMovies.length ? context.favoriteMovies.map((movie) => <label key={movie.movieSlug} className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 p-3 text-sm"><input type="checkbox" checked={movieSlugs.includes(movie.movieSlug)} disabled={!movieSlugs.includes(movie.movieSlug) && movieSlugs.length >= 3} onChange={(event) => toggleMovie(movie.movieSlug, event.target.checked)} />{movie.title}</label>) : <p className="text-sm text-fg-muted">Hãy đánh dấu phim Yêu thích trước.</p>}</div></OptionGroup>}
          {error && <p role="alert" className="rounded-xl border border-bad/25 bg-bad/10 p-3 text-sm text-bad">{error}</p>}
          <Button className="w-full" disabled={rendering} onClick={() => void createPng()}>{rendering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : typeof navigator.share === 'function' ? <Share2 className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}{rendering ? 'Đang tạo PNG…' : 'Tạo và chia sẻ PNG'}</Button>
        </div>
      </div> : <div className="p-8 text-center text-fg-muted"><ImageIcon className="mx-auto mb-3 h-8 w-8" />{error || 'Không có dữ liệu thẻ.'}</div>}
    </DialogContent>
  </Dialog>
}

function PreviewStat({ show, value, label }: { show: boolean; value: string | number; label: string }) { return show ? <div><strong className="block text-xl">{value}</strong><span className="text-[9px] uppercase tracking-wider text-fg-muted">{label}</span></div> : <div /> }
function OptionGroup({ title, children }: { title: string; children: React.ReactNode }) { return <section><h3 className="mb-3 text-sm font-semibold">{title}</h3>{children}</section> }
function Segmented({ value, options, onChange }: { value: string; options: string[][]; onChange: (value: string) => void }) { return <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/[.05] p-1">{options.map(([id,label]) => <button key={id} type="button" onClick={() => onChange(id)} className={cn('rounded-lg px-3 py-2 text-xs transition', value === id ? 'bg-accent text-white' : 'text-fg-muted hover:text-fg')}>{label}</button>)}</div> }
