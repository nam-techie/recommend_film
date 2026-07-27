'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, Home, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Error boundary cấp app. Nguồn phim là API bên thứ ba (PhimAPI) nên lỗi mạng
 * và lỗi 5xx là chuyện bình thường — trước đây user nhận được trang trắng.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[CineMind] Lỗi render trang:', error)
  }, [error])

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-bad/10 text-bad">
        <AlertTriangle className="h-8 w-8" aria-hidden />
      </span>
      <h1 className="text-title-1 mt-6 text-fg">Không tải được nội dung</h1>
      <p className="mt-3 text-sm leading-6 text-fg-muted">
        Nguồn phim đang không phản hồi hoặc kết nối của bạn bị ngắt. Thử tải lại — dữ liệu thường về sau vài giây.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-fg-faint">Mã lỗi: {error.digest}</p>}
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button onClick={reset} className="h-11 rounded-full bg-accent px-6 font-semibold text-accent-fg hover:bg-accent-strong">
          <RotateCcw className="h-4 w-4" aria-hidden /> Thử lại
        </Button>
        <Button asChild variant="outline" className="h-11 rounded-full border-white/20 px-6">
          <Link href="/"><Home className="h-4 w-4" aria-hidden /> Về trang chủ</Link>
        </Button>
      </div>
    </div>
  )
}
