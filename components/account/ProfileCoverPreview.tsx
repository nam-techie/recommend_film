'use client'

import { ImageIcon, Loader2 } from 'lucide-react'
import { useProfileCover } from '@/hooks/useProfileCover'
import { Button } from '@/components/ui/button'

export function ProfileCoverPreview({ src }: { src?: string }) {
  const cover = useProfileCover(src, true)
  return <div className="relative mb-4 flex aspect-[8/3] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/20">
    {cover.url ? <img src={cover.url} alt="Ảnh bìa hồ sơ của bạn" className="h-full w-full object-cover" /> : cover.loading ? <Loader2 className="h-6 w-6 animate-spin text-fg-muted" aria-label="Đang tải ảnh bìa" /> : <div className="flex flex-col items-center gap-2 px-3 text-center text-xs text-fg-muted"><ImageIcon className="h-6 w-6" /><p>{cover.error || 'Ảnh bìa của bạn sẽ hiển thị ở đây'}</p>{cover.error && <Button size="sm" variant="outline" onClick={cover.retry}>Thử lại</Button>}</div>}
  </div>
}
