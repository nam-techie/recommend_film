'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, MessageSquarePlus, RefreshCw } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { openFeedbackDialog } from '@/components/feedback/FeedbackLauncher'
import { Button } from '@/components/ui/button'
import type { UserFeedback } from '@/lib/feedback'

const statusLabel: Record<UserFeedback['status'], string> = { new: 'Mới', triaged: 'Đã phân loại', planned: 'Đã lên kế hoạch', resolved: 'Đã xử lý', dismissed: 'Đã đóng' }

export function FeedbackHistoryPanel() {
  const { user } = useAuth()
  const [items, setItems] = useState<UserFeedback[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    if (!user) return
    setLoading(true); setError(null)
    try {
      const response = await fetch('/api/me/feedback', { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Không thể tải lịch sử góp ý.')
      setItems(payload.items || [])
    } catch (next) { setError(next instanceof Error ? next.message : 'Không thể tải lịch sử góp ý.') }
    finally { setLoading(false) }
  }, [user])
  useEffect(() => { void load() }, [load])
  useEffect(() => { const listener = () => void load(); window.addEventListener('cinemind:feedback-sent', listener); return () => window.removeEventListener('cinemind:feedback-sent', listener) }, [load])

  return <section className="rounded-xl border border-border bg-surface-1 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Góp ý của tôi</h2><p className="mt-1 text-sm text-fg-muted">Theo dõi trạng thái và phản hồi từ đội ngũ CineMind.</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />Tải lại</Button><Button size="sm" onClick={openFeedbackDialog}><MessageSquarePlus className="h-4 w-4" />Gửi góp ý</Button></div></div>{error && <p role="alert" className="mt-4 text-sm text-bad">{error}</p>}<div className="mt-4 divide-y divide-border">{items.map((item) => <article key={item.id} className="py-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{item.category} · {statusLabel[item.status]}</p><time className="text-xs text-fg-muted">{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(item.createdAt)}</time></div><p className="mt-1 line-clamp-2 text-sm text-fg-secondary">{item.message}</p>{item.publicReply && <p className="mt-2 rounded-md bg-accent/10 p-3 text-sm text-accent-soft">CineMind: {item.publicReply}</p>}</article>)}{loading && !items.length && <p className="flex items-center gap-2 py-5 text-sm text-fg-muted"><Loader2 className="h-4 w-4 animate-spin" />Đang tải…</p>}{!loading && !items.length && <p className="py-5 text-sm text-fg-muted">Bạn chưa gửi góp ý nào.</p>}</div></section>
}
