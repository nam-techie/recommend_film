'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, ImageOff, Loader2, MessageSquarePlus, RefreshCw, Trash2 } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { FeedbackCategory } from '@/lib/feedback'

const labels: Record<FeedbackCategory, string> = { movie: 'Góp ý phim', improvement: 'Cải thiện tính năng', ui_ux: 'Giao diện / UX', content: 'Nội dung', correction: 'Sửa đổi thông tin', bug: 'Báo lỗi', other: 'Khác' }
const blockedCapture = (pathname: string) => pathname.startsWith('/login') || pathname.startsWith('/checkout') || pathname.startsWith('/payment') || pathname.startsWith('/admin') || (pathname === '/account' && new URLSearchParams(location.search).get('tab') === 'security')

export function openFeedbackDialog() { window.dispatchEvent(new Event('cinemind:open-feedback')) }

export function FeedbackLauncher({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [sending, setSending] = useState(false)
  const [category, setCategory] = useState<FeedbackCategory>('improvement')
  const [message, setMessage] = useState('')
  const [blob, setBlob] = useState<Blob | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const requestIdRef = useRef<string | null>(null)

  const capture = async () => {
    setBlob(null); setNotice(null)
    if (blockedCapture(pathname)) { setNotice('Trang nhạy cảm này chỉ gửi nội dung, không đính kèm ảnh.'); return }
    setCapturing(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(document.documentElement, {
        width: window.innerWidth, height: window.innerHeight, windowWidth: window.innerWidth, windowHeight: window.innerHeight,
        scrollX: -window.scrollX, scrollY: -window.scrollY, backgroundColor: '#080911', scale: 1, useCORS: true, logging: false,
        ignoreElements: (element) => element.hasAttribute('data-feedback-exclude') || ['VIDEO', 'IFRAME', 'CANVAS'].includes(element.tagName),
        onclone: (documentClone) => {
          documentClone.querySelectorAll<HTMLElement>('[data-feedback-redact],input[type=password],input[autocomplete=current-password],input[autocomplete=one-time-code],input[name*=token i]').forEach((element) => { element.style.filter = 'blur(12px)'; element.setAttribute('value', '') })
        },
      })
      const next = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.75))
      if (!next) throw new Error('capture failed')
      setBlob(next); setPreview(URL.createObjectURL(next))
    } catch { setNotice('Không chụp được trang hiện tại. Bạn vẫn có thể gửi góp ý không kèm ảnh.') }
    finally { setCapturing(false) }
  }

  const begin = async () => { requestIdRef.current = crypto.randomUUID().replace(/-/g, ''); setOpen(true); setMessage(''); setNotice(null); await capture() }
  useEffect(() => { const listener = () => void begin(); window.addEventListener('cinemind:open-feedback', listener); return () => window.removeEventListener('cinemind:open-feedback', listener) }, [pathname])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const submit = async () => {
    if (!user || message.trim().length < 20) return
    setSending(true); setNotice(null)
    try {
      const form = new FormData()
      form.set('category', category); form.set('message', message.trim()); form.set('requestId', requestIdRef.current || crypto.randomUUID().replace(/-/g, '')); form.set('pagePath', `${pathname}${location.search}`); form.set('viewportWidth', String(window.innerWidth)); form.set('viewportHeight', String(window.innerHeight))
      if (blob) form.set('screenshot', new File([blob], 'cinemind-feedback.webp', { type: 'image/webp' }))
      const response = await fetch('/api/me/feedback', { method: 'POST', headers: { Authorization: `Bearer ${await user.getIdToken()}` }, body: form })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Không thể gửi góp ý.')
      setNotice('Đã gửi góp ý. Bạn sẽ nhận thông báo khi admin cập nhật.'); setBlob(null); setPreview(null); setMessage(''); window.dispatchEvent(new Event('cinemind:feedback-sent')); requestIdRef.current = null
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Không thể gửi góp ý.') }
    finally { setSending(false) }
  }

  if (!user || user.isAnonymous || !user.emailVerified) return null
  return <>
    <Button ref={launcherRef} type="button" variant="ghost" size={compact ? 'sm' : 'icon'} onClick={() => void begin()} data-feedback-exclude aria-label="Gửi góp ý" className={compact ? 'w-full justify-start gap-3' : 'h-10 w-10 rounded-full text-fg-secondary'}><MessageSquarePlus className="h-4 w-4" />{compact && 'Góp ý'}</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent data-feedback-exclude className="max-h-[90dvh] overflow-y-auto border-white/10 bg-surface-1 sm:max-w-2xl"><DialogHeader><DialogTitle>Góp ý cho CineMind</DialogTitle><DialogDescription>Ảnh chỉ được tải lên sau khi bạn xem preview và bấm Gửi. Không chụp video, iframe hoặc vùng được đánh dấu nhạy cảm.</DialogDescription></DialogHeader>
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1.15fr)_minmax(220px,.85fr)]"><div>{capturing ? <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-white/10"><Loader2 className="h-6 w-6 animate-spin" /></div> : preview ? <div className="relative overflow-hidden rounded-lg border border-white/10"><img src={preview} alt="Preview trang hiện tại" className="aspect-video w-full object-cover object-top" /><Button size="icon" variant="destructive" className="absolute right-2 top-2" onClick={() => { setBlob(null); setPreview(null) }} aria-label="Bỏ ảnh"><Trash2 className="h-4 w-4" /></Button></div> : <div className="flex aspect-video flex-col items-center justify-center rounded-lg border border-dashed border-white/10 text-center text-sm text-fg-muted"><ImageOff className="mb-2 h-6 w-6" />Không có ảnh đính kèm</div>}<Button type="button" variant="outline" size="sm" className="mt-2" disabled={capturing} onClick={() => void capture()}><RefreshCw className="h-4 w-4" />Chụp lại</Button></div>
        <div className="space-y-4"><div className="space-y-2"><Label>Phân loại</Label><Select value={category} onValueChange={(value) => setCategory(value as FeedbackCategory)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(labels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="feedback-message">Nội dung</Label><textarea id="feedback-message" value={message} onChange={(event) => setMessage(event.target.value.slice(0, 2_000))} rows={8} className="w-full rounded-md border border-white/10 bg-bg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent" placeholder="Mô tả điều bạn muốn CineMind cải thiện…" /><p className="text-xs text-fg-muted">{message.trim().length}/2.000 · tối thiểu 20 ký tự</p></div></div></div>
      {notice && <p role="status" className="flex items-start gap-2 rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" />{notice}</p>}
      <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Đóng</Button><Button disabled={sending || message.trim().length < 20 || !user.emailVerified} onClick={() => void submit()}>{sending && <Loader2 className="h-4 w-4 animate-spin" />}Gửi góp ý</Button></DialogFooter>
    </DialogContent></Dialog>
  </>
}
