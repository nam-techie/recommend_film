import { HeroSkeleton, RailSkeleton } from '@/components/ui/PageSkeletons'

/**
 * Trang chủ SSR chờ PhimAPI (TTFB đo được ~1.2s trên production).
 * Trước khi có file này, khoảng thời gian đó là màn hình trắng hoàn toàn.
 */
export default function HomeLoading() {
  return (
    <div className="pb-8">
      <HeroSkeleton />
      <div className="mx-auto mt-8 max-w-shell space-y-10 px-4 sm:mt-12 sm:px-6 lg:space-y-14 lg:px-8">
        <RailSkeleton />
        <RailSkeleton />
        <RailSkeleton />
      </div>
    </div>
  )
}
