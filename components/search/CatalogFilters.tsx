'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Check, ChevronDown, RotateCcw, SlidersHorizontal, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { catalogQueryString, type CatalogQuery } from '@/lib/catalog'
import type { Country, Genre } from '@/lib/api'

interface CatalogFiltersProps {
  query: CatalogQuery
  genres: Genre[]
  countries: Country[]
  extended?: boolean
}

export function CatalogFilters({ query, genres, countries, extended = false }: CatalogFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [filters, setFilters] = useState(query)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => setFilters(query), [query])
  const update = (patch: Partial<CatalogQuery>) => setFilters((current) => ({ ...current, ...patch, page: 1 }))
  const apply = (next = filters) => {
    const search = catalogQueryString({ ...next, page: 1 })
    router.push(search ? `${pathname}?${search}` : pathname)
    setMobileOpen(false)
  }
  const clear = () => {
    const next: CatalogQuery = { ...filters, type: 'all', genre: 'all', country: 'all', year: 'all', language: 'all', sortField: 'modified.time', sortType: 'desc', limit: 24, page: 1 }
    setFilters(next)
    apply(next)
  }

  const activeFilters = useMemo(() => [
    filters.type, filters.genre, filters.country, filters.year, filters.language,
  ].filter((value) => value && value !== 'all').length, [filters])

  return (
    <section className="mb-8 overflow-visible rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.045] to-white/[0.018] shadow-[0_22px_60px_rgba(0,0,0,.18)]">
      <button type="button" onClick={() => setMobileOpen((value) => !value)} className="flex min-h-14 w-full items-center gap-3 px-5 text-left md:pointer-events-none" aria-expanded={mobileOpen}>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-300"><SlidersHorizontal className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-white">Bộ lọc thông minh</span><span className="mt-0.5 block text-xs text-slate-500">Thu hẹp kết quả theo đúng sở thích của bạn</span></span>
        {activeFilters > 0 && <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-1 text-xs font-bold text-fuchsia-200">{activeFilters} đang chọn</span>}
        <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform md:hidden ${mobileOpen ? 'rotate-180' : ''}`} />
      </button>

      <div className={`${mobileOpen ? 'grid' : 'hidden'} gap-4 border-t border-white/[0.07] p-5 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6`}>
        {extended && <FilterSelect label="Loại phim" value={filters.type} onChange={(value) => update({ type: value })} options={[["all", 'Tất cả'], ['phim-le', 'Phim lẻ'], ['phim-bo', 'Phim bộ'], ['hoat-hinh', 'Hoạt hình'], ['tv-shows', 'TV Shows']]} />}
        {genres.length > 0 && <FilterSelect label="Thể loại" value={filters.genre} onChange={(value) => update({ genre: value })} options={[["all", 'Tất cả thể loại'], ...genres.map((item) => [item.slug, item.name])]} />}
        {countries.length > 0 && <FilterSelect label="Quốc gia" value={filters.country} onChange={(value) => update({ country: value })} options={[["all", 'Tất cả quốc gia'], ...countries.map((item) => [item.slug, item.name])]} />}
        <FilterSelect label="Năm phát hành" value={filters.year} onChange={(value) => update({ year: value })} options={[["all", 'Tất cả năm'], ...Array.from({ length: 30 }, (_, index) => { const year = String(new Date().getFullYear() - index); return [year, year] })]} />
        {extended && <FilterSelect label="Ngôn ngữ" value={filters.language} onChange={(value) => update({ language: value })} options={[["all", 'Tất cả'], ['vietsub', 'Vietsub'], ['thuyet-minh', 'Thuyết minh'], ['long-tieng', 'Lồng tiếng']]} />}
        <FilterSelect label="Sắp xếp" value={filters.sortField} onChange={(value) => update({ sortField: value })} options={[["modified.time", 'Mới cập nhật'], ['year', 'Năm phát hành'], ['_id', 'Mới thêm'], ['name', 'Tên phim A–Z']]} />
        <FilterSelect label="Số phim" value={String(filters.limit)} onChange={(value) => update({ limit: Number(value) })} options={[['16', '16 phim'], ['24', '24 phim'], ['32', '32 phim'], ['48', '48 phim']]} />

        <div className="flex items-end gap-2 md:col-span-2 lg:col-span-3 xl:col-span-6">
          <Button type="button" onClick={() => apply()} className="h-11 flex-1 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 font-bold text-white shadow-lg shadow-fuchsia-950/25 hover:brightness-110 sm:flex-none sm:px-8"><Check className="h-4 w-4" /> Áp dụng bộ lọc</Button>
          <Button type="button" variant="ghost" onClick={clear} className="h-11 rounded-xl px-4 text-slate-400 hover:bg-white/[0.06] hover:text-white"><RotateCcw className="h-4 w-4" /><span className="hidden sm:inline">Đặt lại</span></Button>
          <span className="ml-auto hidden items-center gap-1.5 text-xs text-slate-600 lg:flex"><Sparkles className="h-3.5 w-3.5 text-fuchsia-400" /> URL sẽ ghi nhớ lựa chọn của bạn</span>
        </div>
      </div>
    </section>
  )
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <label className="block min-w-0 text-xs font-semibold text-slate-500"><span className="mb-2 block">{label}</span><Select value={value} onValueChange={onChange}><SelectTrigger className="h-11 rounded-xl border-white/10 bg-[#111521] px-3.5 text-sm font-semibold text-slate-200 shadow-none outline-none focus:ring-1 focus:ring-fuchsia-400/60 focus:ring-offset-0"><SelectValue /></SelectTrigger><SelectContent position="popper" sideOffset={8} className="z-[120] max-h-[340px] rounded-xl border-white/10 bg-[#151925] text-slate-200 shadow-2xl"><div className="max-h-[320px] overflow-y-auto p-1">{options.map(([optionValue, optionLabel]) => <SelectItem key={optionValue} value={optionValue} className="min-h-9 rounded-lg py-2 pl-8 pr-3 focus:bg-fuchsia-500/10 focus:text-fuchsia-100">{optionLabel}</SelectItem>)}</div></SelectContent></Select></label>
}
