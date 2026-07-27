'use client'

import { X } from 'lucide-react'

const GROUPS: Array<{ title: string; items: Array<[string, string]> }> = [
  {
    title: 'Phát',
    items: [
      ['Space / K', 'Phát hoặc tạm dừng'],
      ['J / L', 'Lùi · tiến 10 giây'],
      ['← / →', 'Lùi · tiến 5 giây'],
      ['0 – 9', 'Nhảy tới 0% – 90% phim'],
      ['N / P', 'Tập kế · tập trước'],
      ['< / >', 'Giảm · tăng tốc độ phát'],
    ],
  },
  {
    title: 'Âm thanh & màn hình',
    items: [
      ['↑ / ↓', 'Tăng · giảm âm lượng'],
      ['M', 'Tắt · bật tiếng'],
      ['F', 'Toàn màn hình'],
      ['I', 'Cửa sổ nhỏ (PiP)'],
      ['Esc', 'Thoát toàn màn hình'],
      ['?', 'Bảng phím tắt này'],
    ],
  },
]

export function PlayerShortcuts({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Phím tắt của trình phát"
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl border border-white/12 bg-surface-1/95 p-5 shadow-raised"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-title-2 text-fg">Phím tắt</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng phím tắt"
            className="flex h-10 w-10 items-center justify-center rounded-full text-fg-secondary transition-colors hover:bg-surface-3 hover:text-fg"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-eyebrow mb-2.5 text-accent-soft">{group.title}</p>
              <dl className="space-y-2">
                {group.items.map(([keys, description]) => (
                  <div key={keys} className="flex items-center justify-between gap-3">
                    <dt className="shrink-0">
                      <kbd className="rounded-sm border border-white/15 bg-surface-3 px-2 py-1 font-mono text-xs text-fg">{keys}</kbd>
                    </dt>
                    <dd className="text-right text-xs text-fg-secondary">{description}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        <p className="mt-5 border-t border-border pt-3 text-xs text-fg-muted">
          Trong phòng xem chung, các phím điều khiển phim chỉ hoạt động với host.
        </p>
      </div>
    </div>
  )
}
