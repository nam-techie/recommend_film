'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Loader2, RotateCcw } from 'lucide-react'
import { auth } from '@/lib/firebase'
import type { ProfileMediaKind } from '@/lib/profile'
import { Button } from '@/components/ui/button'

export function ProfileMediaControls({ kind, onChanged }: { kind: ProfileMediaKind; onChanged: (url: string | null, updatedAt?: number) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const token = async () => {
    if (!auth?.currentUser) throw new Error('Bạn cần đăng nhập.')
    return auth.currentUser.getIdToken()
  }
  const upload = async (file?: File) => {
    if (!file) return
    setBusy(true); setError('')
    try {
      const form = new FormData(); form.set('kind', kind); form.set('file', file)
      const response = await fetch('/api/me/profile/media', { method: 'POST', headers: { Authorization: `Bearer ${await token()}` }, body: form })
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Không tải được ảnh.')
      onChanged(payload.url, payload.record?.updatedAt)
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Không tải được ảnh.') }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = '' }
  }
  const reset = async () => {
    setBusy(true); setError('')
    try {
      const response = await fetch(`/api/me/profile/media?kind=${kind}`, { method: 'DELETE', headers: { Authorization: `Bearer ${await token()}` } })
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Không đặt lại được ảnh.')
      onChanged(payload.url)
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Không đặt lại được ảnh.') }
    finally { setBusy(false) }
  }
  return <div>
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(event) => void upload(event.target.files?.[0])} />
    <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}{kind === 'avatar' ? 'Tải ảnh đại diện' : 'Tải ảnh bìa'}</Button><Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void reset()}><RotateCcw className="mr-2 h-4 w-4" />Đặt lại</Button></div>
    <p className="mt-2 text-xs text-fg-muted">JPG, PNG, WebP hoặc AVIF · tối đa 6 MB. Ảnh được chuẩn hóa và xóa metadata trên server.</p>
    {error && <p role="alert" className="mt-2 text-xs text-bad">{error}</p>}
  </div>
}
