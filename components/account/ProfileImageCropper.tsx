'use client'

import { useEffect, useRef, useState } from 'react'
import { Move, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ProfileMediaKind } from '@/lib/profile'

export function ProfileImageCropper({ file, kind, busy, error, onCancel, onSave }: { file: File; kind: ProfileMediaKind; busy: boolean; error: string; onCancel: () => void; onSave: (file: File) => Promise<void> }) {
  const [source, setSource] = useState('')
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 50, y: 50 })
  const [localError, setLocalError] = useState('')
  const [preparing, setPreparing] = useState(false)
  const image = useRef<HTMLImageElement>(null)
  const drag = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null)
  const ratio = kind === 'avatar' ? 1 : 8 / 3
  const cropWidth = Math.min(size.width, size.height * ratio) / zoom
  const cropHeight = cropWidth / ratio
  const left = (size.width - cropWidth) * position.x / 100
  const top = (size.height - cropHeight) * position.y / 100
  const locked = busy || preparing
  const clamp = (n: number) => Math.min(100, Math.max(0, n))
  useEffect(() => {
    const url = URL.createObjectURL(file); setSource(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  async function save() {
    if (!image.current || !size.width || locked) return
    setPreparing(true); setLocalError('')
    try {
      const canvas = document.createElement('canvas')
      canvas.width = kind === 'avatar' ? 512 : 1600
      canvas.height = kind === 'avatar' ? 512 : 600
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Trình duyệt không hỗ trợ cắt ảnh.')
      ctx.drawImage(image.current, left, top, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Không xử lý được ảnh. Hãy chọn ảnh khác.')), 'image/webp', .92))
      await onSave(new File([blob], 'profile-cropped.webp', { type: blob.type }))
    } catch (e) { setLocalError(e instanceof Error ? e.message : 'Không cắt được ảnh.') }
    finally { setPreparing(false) }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !locked) onCancel() }}><DialogContent className="max-h-[95dvh] overflow-y-auto border-white/10 bg-surface-1 sm:max-w-xl" onEscapeKeyDown={(e) => { if (locked) e.preventDefault() }} onPointerDownOutside={(e) => { if (locked) e.preventDefault() }}>
    <DialogHeader><DialogTitle>{kind === 'avatar' ? 'Cắt ảnh đại diện' : 'Cắt ảnh bìa'}</DialogTitle><DialogDescription>Kéo ảnh để chọn vị trí, phóng to để căn khung. Chỉ lưu khi bạn hài lòng.</DialogDescription></DialogHeader>
    <div className="relative mx-auto w-full touch-none overflow-hidden rounded-xl bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" style={{ aspectRatio: ratio, maxWidth: kind === 'avatar' ? 320 : undefined }} tabIndex={0} role="group" aria-label="Vùng cắt ảnh. Dùng các phím mũi tên để điều chỉnh vị trí."
      onKeyDown={(e) => { if (locked || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return; e.preventDefault(); setPosition((p) => ({ x: clamp(p.x + (e.key === 'ArrowRight' ? 2 : e.key === 'ArrowLeft' ? -2 : 0)), y: clamp(p.y + (e.key === 'ArrowDown' ? 2 : e.key === 'ArrowUp' ? -2 : 0)) })) }}
      onPointerDown={(e) => { if (locked || !size.width) return; e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, startX: position.x, startY: position.y } }}
      onPointerMove={(e) => { if (!drag.current || locked) return; const box = e.currentTarget.getBoundingClientRect(); setPosition({ x: clamp(drag.current.startX - (e.clientX - drag.current.x) / box.width * cropWidth / Math.max(1, size.width - cropWidth) * 100), y: clamp(drag.current.startY - (e.clientY - drag.current.y) / box.height * cropHeight / Math.max(1, size.height - cropHeight) * 100) }) }}
      onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }} onLostPointerCapture={() => { drag.current = null }}>
      {source && <img ref={image} src={source} alt="Ảnh đang căn chỉnh" draggable={false} className="absolute max-w-none select-none" onLoad={(e) => { const img = e.currentTarget; if (img.naturalWidth * img.naturalHeight > 30_000_000) { setLocalError('Ảnh quá lớn. Hãy chọn ảnh dưới 30 megapixel.'); return } setSize({ width: img.naturalWidth, height: img.naturalHeight }) }} onError={() => setLocalError('Không đọc được ảnh. Hãy chọn JPG, PNG, WebP hoặc AVIF.')} style={size.width ? { width: `${size.width / cropWidth * 100}%`, height: `${size.height / cropHeight * 100}%`, left: `${-left / cropWidth * 100}%`, top: `${-top / cropHeight * 100}%` } : { opacity: 0 }} />}
      <div className="pointer-events-none absolute inset-0 border border-white/25" style={kind === 'avatar' ? { borderRadius: '50%', boxShadow: '0 0 0 100px rgba(0,0,0,.5)' } : undefined} />
      <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <span key={i} className="border border-white/10" />)}</div>
    </div>
    <p className="flex items-center justify-center gap-2 text-xs text-fg-muted"><Move size={14} />{kind === 'avatar' ? 'Vòng tròn là vùng avatar sẽ hiển thị.' : 'Khung ảnh bìa 8:3 · 1600 × 600 px'}</p>
    <fieldset disabled={locked || !size.width} className="space-y-3">{([{ label: 'Phóng to', value: zoom, min: 1, max: 3, step: .01, change: (v: number) => setZoom(v) }, { label: 'Vị trí ngang', value: position.x, min: 0, max: 100, step: 1, change: (v: number) => setPosition((p) => ({ ...p, x: v })) }, { label: 'Vị trí dọc', value: position.y, min: 0, max: 100, step: 1, change: (v: number) => setPosition((p) => ({ ...p, y: v })) }]).map((control) => <label key={control.label} className="flex items-center gap-4 text-xs"><span className="w-24 shrink-0 text-fg-secondary">{control.label}</span><input className="h-6 min-w-0 flex-1 accent-accent" type="range" min={control.min} max={control.max} step={control.step} value={control.value} onChange={(e) => control.change(Number(e.target.value))} /></label>)}</fieldset>
    {(localError || error) && <p role="alert" className="text-sm text-bad">{localError || error}</p>}
    <div className="flex flex-wrap justify-end gap-2"><Button variant="ghost" disabled={locked} onClick={() => { setZoom(1); setPosition({ x: 50, y: 50 }) }}><RotateCcw size={15} className="mr-2" />Căn lại</Button><Button variant="outline" disabled={locked} onClick={onCancel}>Hủy</Button><Button disabled={locked || !size.width} onClick={() => void save()}>{locked ? 'Đang lưu…' : 'Cắt và lưu ảnh'}</Button></div>
  </DialogContent></Dialog>
}
