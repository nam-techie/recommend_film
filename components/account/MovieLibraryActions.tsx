'use client'

import { Bookmark, Check, Heart } from 'lucide-react'
import { AuthDialog } from '@/components/auth/AuthDialog'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { useAccount } from '@/hooks/useAccount'
import { cn } from '@/lib/utils'

export function MovieLibraryActions({ movie, compact = false }: { movie: { slug: string; title: string; poster?: string; year?: number }; compact?: boolean }) {
  const { user } = useAuth(); const account = useAccount(); const item = account.watchlist[movie.slug]
  const input = { movieSlug: movie.slug, title: movie.title, poster: movie.poster, year: movie.year }
  if (!user) return <AuthDialog><Button size={compact ? 'sm' : 'default'} variant="outline"><Bookmark className="h-4 w-4" />Lưu phim</Button></AuthDialog>
  return <div className="flex flex-wrap gap-2">
    <Button size={compact ? 'sm' : 'default'} variant={item?.watchLater ? 'default' : 'outline'} disabled={account.degraded} onClick={() => void account.updateMovieLibrary(input, { watchLater: !item?.watchLater })}><Bookmark className={cn('h-4 w-4', item?.watchLater && 'fill-current')} />{item?.watchLater ? 'Đã thêm Xem sau' : 'Xem sau'}</Button>
    <Button size={compact ? 'sm' : 'default'} variant={item?.favorite ? 'default' : 'outline'} disabled={account.degraded} onClick={() => void account.updateMovieLibrary(input, { favorite: !item?.favorite })} className={item?.favorite ? 'bg-rose-600 hover:bg-rose-500' : ''}><Heart className={cn('h-4 w-4', item?.favorite && 'fill-current')} />Yêu thích</Button>
    {!compact && <Button variant={item?.watchStatus === 'completed' ? 'default' : 'outline'} disabled={account.degraded} onClick={() => void account.updateMovieLibrary(input, { watchStatus: item?.watchStatus === 'completed' ? null : 'completed' })}><Check className="h-4 w-4" />{item?.watchStatus === 'completed' ? 'Đã xem' : 'Đánh dấu đã xem'}</Button>}
  </div>
}
