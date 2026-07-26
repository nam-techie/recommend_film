import { RailSkeleton } from '@/components/ui/PageSkeletons'

export default function MovieDetailLoading() {
  return (
    <div className="pb-14">
      <section className="relative min-h-[520px] overflow-hidden border-b border-border lg:min-h-[600px]">
        <div className="skeleton absolute inset-0" />
        <div className="relative mx-auto flex min-h-[520px] max-w-shell items-end gap-8 px-4 pb-16 pt-28 sm:px-6 lg:min-h-[600px] lg:items-center lg:px-8">
          <div className="skeleton hidden aspect-[2/3] w-52 shrink-0 rounded-xl md:block xl:w-60" />
          <div className="w-full max-w-3xl space-y-4">
            <div className="skeleton h-5 w-44 rounded-md" />
            <div className="skeleton h-12 w-4/5 rounded-lg sm:h-16" />
            <div className="skeleton h-4 w-1/2 rounded-sm" />
            <div className="skeleton h-16 w-full rounded-md" />
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="skeleton h-12 w-36 rounded-full" />
              <div className="skeleton h-12 w-32 rounded-full" />
              <div className="skeleton h-12 w-28 rounded-full" />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-shell space-y-8 px-4 pt-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-border bg-surface-1 p-5 sm:p-7">
          <div className="mb-6 flex gap-2">
            <div className="skeleton h-12 w-32 rounded-lg" />
            <div className="skeleton h-12 w-28 rounded-lg" />
            <div className="skeleton h-12 w-28 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
            {Array.from({ length: 16 }).map((_, index) => (
              <div key={index} className="skeleton h-12 rounded-lg" />
            ))}
          </div>
        </div>
        <RailSkeleton />
      </div>
    </div>
  )
}
