'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const initials = (name: string) => name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase() || '?'

export function AccountAvatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  return <span className={cn('relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-purple-500/20 font-bold text-purple-100 ring-1 ring-white/10', className)}>{src && !failed ? <img src={src} alt={`Ảnh đại diện của ${name}`} referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-full w-full object-cover" /> : initials(name)}</span>
}
