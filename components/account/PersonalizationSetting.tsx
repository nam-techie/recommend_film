'use client'

import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'

export function PersonalizationSetting({ enabled }: { enabled: boolean }) {
  const { user } = useAuth()
  const [active, setActive] = useState(enabled)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const toggle = async () => {
    if (!user) return
    setBusy(true); setMessage(null)
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/me/recommendations', { method: active ? 'DELETE' : 'POST', headers: { Authorization: `Bearer ${token}` } })
      const payload = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(payload.error || 'Không thể cập nhật cá nhân hóa.')
      setActive(!active); setMessage(active ? 'Đã tắt và xóa hồ sơ cá nhân hóa.' : 'Đã bật cá nhân hóa. Hồ sơ sẽ được tính lại từ dữ liệu xem hợp lệ.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể cập nhật cá nhân hóa.') }
    finally { setBusy(false) }
  }
  return <section className="mb-5 rounded-2xl border border-white/10 bg-white/[0.035] p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent-soft"><Sparkles className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h2 className="font-semibold">Cá nhân hóa gợi ý phim</h2><p className="mt-1 text-sm leading-6 text-fg-muted">Dùng qualified views, completion và thể loại trong 180 ngày. Không dùng IP, GPS hoặc watch progress do client tự ghi.</p></div><Button variant={active ? 'outline' : 'default'} onClick={() => void toggle()} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{active ? 'Tắt & đặt lại' : 'Bật cá nhân hóa'}</Button></div>{message && <p role="status" className="mt-4 text-sm text-fg-secondary">{message}</p>}</section>
}
