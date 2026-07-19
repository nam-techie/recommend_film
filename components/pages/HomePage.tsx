import { DeferredContinueWatching } from '@/components/sections/DeferredContinueWatching'
import { HeroSection } from '@/components/sections/HeroSection'
import { MovieSection } from '@/components/sections/MovieSection'
import { ScrollToTop } from '@/components/ui/ScrollToTop'
import type { HomePageData } from '@/lib/home-data'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'

export function HomePage({ data }: { data: HomePageData }) {
  return (
    <div className="pb-8">
      <HeroSection movies={data.hero} />

      <div className="mx-auto mt-8 max-w-[1600px] space-y-10 px-4 sm:mt-12 sm:px-6 lg:space-y-14 lg:px-8">
        <DeferredContinueWatching />

        {data.sections.map((section) => (
          <MovieSection key={section.id} {...section} />
        ))}

        {data.genres.length > 0 && (
          <section className="deferred-section rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5 sm:p-7">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-fuchsia-300">
                  <Sparkles className="h-4 w-4" /> Khám phá theo sở thích
                </div>
                <h2 className="text-2xl font-bold text-white sm:text-3xl">Bạn đang quan tâm gì?</h2>
              </div>
              <Link href="/genres" className="hidden items-center gap-1 text-sm font-semibold text-slate-300 hover:text-white sm:flex">
                Tất cả thể loại <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {data.genres.slice(0, 12).map((genre, index) => (
                <Link
                  key={genre._id}
                  href={`/genre/${genre.slug}`}
                  className={`rounded-full border px-4 py-2.5 text-sm font-medium transition-colors ${
                    index < 4
                      ? 'border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100 hover:bg-fuchsia-500/20'
                      : 'border-white/10 bg-white/[0.035] text-slate-300 hover:border-white/25 hover:text-white'
                  }`}
                >
                  {genre.name}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
      <ScrollToTop />
    </div>
  )
}
