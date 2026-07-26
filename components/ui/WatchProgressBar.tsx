import { cn } from '@/lib/utils'

/**
 * Thanh tiến độ đã xem — nguồn duy nhất cho mọi nơi hiển thị % phim đã xem.
 *
 * Trước đây có 3 bản sao chép-dán ở AccountPage, ContinueWatching và /history,
 * khác nhau về chiều cao lẫn bo góc, và cả 3 đều không có thuộc tính a11y nào.
 */
export function WatchProgressBar({
  percentage,
  size = 'md',
  label,
  className,
}: {
  percentage: number
  size?: 'sm' | 'md'
  /** Nhãn hiển thị phía trên thanh, ví dụ "Đã xem 29%". */
  label?: string
  className?: string
}) {
  const value = Math.max(0, Math.min(100, Number.isFinite(percentage) ? percentage : 0))
  // Đã xem 1% mà vẽ đúng 1% thì vạch mảnh tới mức không nhìn thấy được.
  // Cho sàn 3% để "có xem rồi" luôn đọc được bằng mắt.
  const width = value > 0 ? Math.max(3, value) : 0

  return (
    <div className={className}>
      {label && <p className="mb-1.5 text-xs text-fg-secondary">{label}</p>}
      <div
        role="progressbar"
        aria-label="Tiến độ đã xem"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`Đã xem ${Math.round(value)}%`}
        className={cn('w-full overflow-hidden rounded-full bg-fg/15', size === 'sm' ? 'h-1' : 'h-1.5')}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}
