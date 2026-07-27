/**
 * Skeleton dùng cho các file loading.tsx.
 * Hình dạng phải khớp layout thật, nếu không khi nội dung về sẽ bị nhảy (CLS).
 */

export function RailSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="skeleton h-7 w-48 rounded-md" />
        <div className="skeleton h-5 w-20 rounded-md" />
      </div>
      <div className="grid grid-flow-col auto-cols-[minmax(142px,43vw)] gap-3 overflow-hidden sm:auto-cols-[minmax(160px,29vw)] lg:grid-flow-row lg:grid-cols-6 lg:gap-x-4 lg:gap-y-7">
        {Array.from({ length: cards }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="skeleton aspect-[2/3] w-full rounded-lg" />
            <div className="skeleton h-4 w-3/4 rounded-sm" />
            <div className="skeleton h-3 w-1/2 rounded-sm" />
          </div>
        ))}
      </div>
    </section>
  )
}

export function HeroSkeleton() {
  return (
    <div className="hero-shell">
      <div className="skeleton absolute inset-0" />
      <div className="relative z-10 flex h-full items-end px-4 pb-14 pt-28 sm:px-8 lg:items-center lg:px-12 xl:px-20">
        <div className="w-full max-w-3xl space-y-4">
          <div className="skeleton h-6 w-56 rounded-md" />
          <div className="skeleton h-12 w-4/5 rounded-lg sm:h-16" />
          <div className="skeleton h-4 w-2/3 rounded-sm" />
          <div className="flex gap-3 pt-2">
            <div className="skeleton h-12 w-36 rounded-full" />
            <div className="skeleton h-12 w-32 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function CatalogSkeleton() {
  return (
    <div className="mx-auto max-w-shell space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="skeleton h-9 w-64 rounded-md" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="skeleton h-10 w-28 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 min-[520px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 lg:gap-x-4 lg:gap-y-7">
        {Array.from({ length: 18 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="skeleton aspect-[2/3] w-full rounded-lg" />
            <div className="skeleton h-4 w-3/4 rounded-sm" />
            <div className="skeleton h-3 w-1/2 rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  )
}
