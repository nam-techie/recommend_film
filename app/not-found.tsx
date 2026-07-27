import Link from 'next/link'
import { Compass, Home, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <span className="text-display bg-gradient-to-br from-accent to-accent-strong bg-clip-text text-transparent">404</span>
      <h1 className="text-title-1 mt-2 text-fg">Không tìm thấy phim này</h1>
      <p className="mt-3 text-sm leading-6 text-fg-muted">
        Đường dẫn có thể đã đổi, hoặc phim đã bị xoá khỏi nguồn. Thử tìm theo tên hoặc khám phá theo thể loại.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button asChild className="h-11 rounded-full bg-accent px-6 font-semibold text-accent-fg hover:bg-accent-strong">
          <Link href="/search"><Search className="h-4 w-4" aria-hidden /> Tìm phim</Link>
        </Button>
        <Button asChild variant="outline" className="h-11 rounded-full border-white/20 px-6">
          <Link href="/genres"><Compass className="h-4 w-4" aria-hidden /> Thể loại</Link>
        </Button>
        <Button asChild variant="ghost" className="h-11 rounded-full px-6">
          <Link href="/"><Home className="h-4 w-4" aria-hidden /> Trang chủ</Link>
        </Button>
      </div>
    </div>
  )
}
