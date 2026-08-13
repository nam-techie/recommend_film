'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type PendingReason = { title: string; description: string; value: string; resolve: (value: string | null) => void }

export function useAdminReasonDialog() {
  const [pending, setPending] = useState<PendingReason | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const askReason = (title: string, description: string, initialValue: string) => new Promise<string | null>((resolve) => setPending({ title, description, value: initialValue, resolve }))
  const close = (value: string | null) => { pending?.resolve(value); setPending(null) }
  const dialog = <Dialog open={Boolean(pending)} onOpenChange={(open) => { if (!open) close(null) }}><DialogContent className="border-white/[0.12] bg-surface-1"><DialogHeader><DialogTitle>{pending?.title}</DialogTitle><DialogDescription>{pending?.description}</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="admin-action-reason">Lý do thao tác</Label><Input ref={inputRef} id="admin-action-reason" value={pending?.value || ''} onChange={(event) => setPending((current) => current ? { ...current, value: event.target.value.slice(0, 240) } : current)} autoFocus /></div><DialogFooter><Button variant="ghost" onClick={() => close(null)}>Hủy</Button><Button onClick={() => close(pending?.value.trim() || null)} disabled={(pending?.value.trim().length || 0) < 3}>Tiếp tục</Button></DialogFooter></DialogContent></Dialog>
  return { askReason, reasonDialog: dialog }
}
