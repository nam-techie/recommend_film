'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MovieGrid } from '@/components/ui/MovieGrid'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { fetchMoviesByCountry, fetchCountries, fetchGenres, Movie, Country, Genre, CategoryApiResponse } from '@/lib/api'
import { ChevronLeft, ChevronRight, Globe, SlidersHorizontal, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
interface FilterPillsProps {
    title: string;
    options: { value: string; label: string }[];
    selectedValues: string[];
    onToggle: (value: string) => void;
}

const FilterPills = ({ title, options, selectedValues, onToggle }: FilterPillsProps) => (
    <div className="space-y-3 mb-6">
        <label className="text-[12px] font-semibold text-muted-foreground tracking-wider uppercase border-l-2 border-primary pl-2">{title}</label>
        <div className="flex flex-wrap gap-2">
            {options.map((option) => {
                const isSelected = selectedValues.includes(option.value) || (option.value === 'all' && selectedValues.length === 0);
                return (
                    <Button
                        key={option.value}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => onToggle(option.value)}
                        className={`h-8 px-4 text-xs rounded-full transition-all duration-200 border ${
                            isSelected 
                                ? 'bg-primary/20 text-primary border-primary/30 hover:bg-primary/30 font-semibold' 
                                : 'bg-background/40 hover:bg-muted/50 border-border/40 text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {option.label}
                    </Button>
                )
            })}
        </div>
    </div>
)

interface CountryDetailPageProps {
  countrySlug: string
  initialPage?: number
}



export function CountryDetailPage({ countrySlug, initialPage = 1 }: CountryDetailPageProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [country, setCountry] = useState<Country | null>(null)
    const [movies, setMovies] = useState<Movie[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(initialPage)
    const [totalPages, setTotalPages] = useState(0)
    const [totalItems, setTotalItems] = useState(0)
    
    // Filter visibility state
    const [showFilters, setShowFilters] = useState(false)
    
    // Filter states
    const [selectedType, setSelectedType] = useState<string[]>(['all'])
    const [selectedRating, setSelectedRating] = useState<string[]>(['all'])
    const [selectedGenre, setSelectedGenre] = useState<string[]>(['all'])
    const [selectedVersion, setSelectedVersion] = useState<string[]>(['all'])
    const [selectedYear, setSelectedYear] = useState<string[]>(['all'])
    const [selectedSort, setSelectedSort] = useState<string>('modified.time')
    const [selectedLimit, setSelectedLimit] = useState<string>('24')

    const handleToggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, isMulti: boolean) => (value: string) => {
        setter(prev => {
            if (!isMulti) return [value]
            if (value === 'all') return ['all']
            const newPrev = prev.filter(v => v !== 'all')
            if (newPrev.includes(value)) {
                const filtered = newPrev.filter(v => v !== value)
                return filtered.length === 0 ? ['all'] : filtered
            } else {
                return [...newPrev, value]
            }
        })
    }
    
    // Genre options for filter
    const [genres, setGenres] = useState<Genre[]>([])

    // Options data
    const movieTypes = [
        { value: 'all', label: 'Tất cả' },
        { value: 'phim-le', label: 'Phim lẻ' },
        { value: 'phim-bo', label: 'Phim bộ' }
    ]

    const ratings = [
        { value: 'all', label: 'Tất cả' },
        { value: 'P', label: 'P (Mọi lứa tuổi)' },
        { value: 'K', label: 'K (Dưới 13 tuổi)' },
        { value: 'T13', label: 'T13 (13 tuổi trở lên)' },
        { value: 'T16', label: 'T16 (16 tuổi trở lên)' },
        { value: 'T18', label: 'T18 (18 tuổi trở lên)' }
    ]

    const versions = [
        { value: 'all', label: 'Tất cả' },
        { value: 'vietsub', label: 'Phụ đề' },
        { value: 'long-tieng', label: 'Lồng tiếng' },
        { value: 'thuyet-minh', label: 'Thuyết minh giọng Bắc' },
        { value: 'thuyet-minh-nam', label: 'Thuyết minh giọng Nam' }
    ]

    const sortOptions = [
        { value: 'modified.time', label: 'Mới nhất' },
        { value: '_id', label: 'Mới cập nhật' },
        { value: 'year', label: 'Điểm IMDb' },
        { value: 'view', label: 'Lượt xem' }
    ]

    const limits = [
        { value: '12', label: '12 phim/trang' },
        { value: '24', label: '24 phim/trang' },
        { value: '36', label: '36 phim/trang' },
        { value: '48', label: '48 phim/trang' },
        { value: '64', label: '64 phim/trang' },
    ]

    const years = [
        { value: 'all', label: 'Tất cả' },
        ...Array.from({ length: 30 }, (_, i) => {
            const year = new Date().getFullYear() - i
            return { value: year.toString(), label: year.toString() }
        })
    ]

    // Convert genres to options format
    const genreOptions = [
        { value: 'all', label: 'Tất cả thể loại' },
        ...genres.map(genre => ({ value: genre.slug, label: genre.name }))
    ]

    // Load country info and genres
    useEffect(() => {
        const loadCountryInfo = async () => {
            try {
                const [countries, genresData] = await Promise.all([
                    fetchCountries(),
                    fetchGenres()
                ])
                const foundCountry = countries.find(c => c.slug === countrySlug)
                setCountry(foundCountry || null)
                setGenres(genresData)
            } catch (err) {
                console.error('Error loading country info:', err)
            }
        }
        loadCountryInfo()
    }, [countrySlug])

    // Load movies
    const loadMovies = async (page: number = 1) => {
        try {
            setLoading(true)
            setError(null)
            
            const params: any = {
                page,
                sort_field: selectedSort,
                sort_type: 'desc',
                limit: parseInt(selectedLimit)
            }

            if (!selectedYear.includes('all')) {
                params.year = selectedYear.join(',')
            }
            
            if (!selectedVersion.includes('all')) {
                params.sort_lang = selectedVersion.join(',')
            }
            
            if (!selectedGenre.includes('all')) {
                params.category = selectedGenre.join(',')
            }

            const response: CategoryApiResponse = await fetchMoviesByCountry(countrySlug, params)
            
            // Handle API response format
            if (response.data?.items) {
                setMovies(response.data.items)
                setTotalPages(response.data.params?.pagination?.totalPages || 0)
                setTotalItems(response.data.params?.pagination?.totalItems || 0)
            }
        } catch (err) {
            setError('Không thể tải danh sách phim')
            console.error('Error loading movies:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadMovies(currentPage)
    }, [countrySlug, currentPage])

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
        router.push(`/country/${countrySlug}?page=${page}`, { scroll: false })
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleFilter = () => {
        setCurrentPage(1)
        loadMovies(1)
    }

    const handleReset = () => {
        setSelectedType(['all'])
        setSelectedRating(['all'])
        setSelectedGenre(['all'])
        setSelectedVersion(['all'])
        setSelectedYear(['all'])
        setSelectedSort('modified.time')
        setSelectedLimit('24')
        setCurrentPage(1)
        loadMovies(1)
    }

    const handleCloseFilters = () => {
        setShowFilters(false)
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center py-12">
                    <h1 className="text-2xl font-bold mb-4">Không thể tải phim</h1>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <Button onClick={() => loadMovies(currentPage)}>
                        Thử lại
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
                <Link href="/" className="hover:text-foreground transition-colors">
                    Trang chủ
                </Link>
                <ChevronRight className="h-4 w-4" />
                <Link href="/countries" className="hover:text-foreground transition-colors">
                    Quốc gia
                </Link>
                <ChevronRight className="h-4 w-4" />
                <span className="text-foreground font-medium">
                    {country?.name || countrySlug}
                </span>
            </nav>

            <SectionHeader 
                title={`Phim ${country?.name || countrySlug}`}
                subtitle={`${totalItems.toLocaleString()} bộ phim hay đang chờ bạn khám phá`}
                icon={Globe}
                showViewAll={false}
            />
            
            {/* Filter Toggle Button */}
            <div className="flex justify-start mb-4">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-sm text-muted-foreground hover:text-foreground font-medium rounded-full px-4 h-9 transition-colors bg-card/30 backdrop-blur-sm border border-transparent hover:border-border/50"
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Filter className="h-4 w-4 mr-2" />
                    {showFilters ? 'Ẩn bộ lọc' : 'Lọc nâng cao'}
                    {showFilters ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                </Button>
            </div>

            {/* Filters Panel - Collapsible */}
            {showFilters && (
                <div className="animate-in fade-in slide-in-from-top-2 mb-8 relative z-40">
                    <Card className="border border-border/40 bg-card/40 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden">
                        <CardContent className="p-5 sm:p-7">
                            
                            <FilterPills title="Loại phim" options={movieTypes} selectedValues={selectedType} onToggle={handleToggle(setSelectedType, false)} />
                            <FilterPills title="Xếp hạng" options={ratings} selectedValues={selectedRating} onToggle={handleToggle(setSelectedRating, true)} />
                            <FilterPills title="Thể loại" options={genreOptions} selectedValues={selectedGenre} onToggle={handleToggle(setSelectedGenre, true)} />
                            <FilterPills title="Phiên bản" options={versions} selectedValues={selectedVersion} onToggle={handleToggle(setSelectedVersion, true)} />
                            <FilterPills title="Năm sản xuất" options={years} selectedValues={selectedYear} onToggle={handleToggle(setSelectedYear, true)} />

                            <div className="mt-8 pt-6 border-t border-border/30 flex flex-col sm:flex-row items-center gap-4 justify-between">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <label className="text-sm font-medium text-foreground shrink-0 border-l-2 border-primary pl-2 uppercase tracking-wider text-[12px]">Sắp xếp theo</label>
                                        <Select value={selectedSort} onValueChange={setSelectedSort}>
                                            <SelectTrigger className="h-10 w-full sm:w-[180px] bg-background/50 rounded-lg border-border/40 font-medium">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sortOptions.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <label className="text-sm font-medium text-foreground shrink-0 border-l-2 border-primary pl-2 uppercase tracking-wider text-[12px]">Hiển thị</label>
                                        <Select value={selectedLimit} onValueChange={setSelectedLimit}>
                                            <SelectTrigger className="h-10 w-full sm:w-[150px] bg-background/50 rounded-lg border-border/40 font-medium">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {limits.map((l) => (
                                                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="flex gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                                    <Button onClick={handleReset} variant="outline" size="lg" className="sm:w-auto text-sm hover:bg-muted/50 rounded-xl px-8">
                                        Đặt lại
                                    </Button>
                                    <Button onClick={handleFilter} size="lg" className="sm:w-auto text-sm bg-gradient-to-r from-primary to-secondary hover:opacity-90 font-semibold shadow-md rounded-xl px-10 flex-1">
                                        Lọc kết quả
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Active Filters Summary */}
            {(!selectedType.includes('all') || !selectedRating.includes('all') || !selectedGenre.includes('all') || !selectedVersion.includes('all') || !selectedYear.includes('all')) && (
                <div className="flex flex-wrap items-center gap-2 mb-6 animate-in fade-in">
                    {!selectedType.includes('all') && selectedType.filter(v => v !== 'phim-bo').map(v => <Badge key={`t-${v}`} variant="outline" className="border-border/50 bg-card/30 text-[10px] sm:text-xs">Loại phim: {movieTypes.find(t => t.value === v)?.label}</Badge>)}
                    {!selectedRating.includes('all') && selectedRating.map(v => <Badge key={`r-${v}`} variant="outline" className="border-border/50 bg-card/30 text-[10px] sm:text-xs">Xếp hạng: {ratings.find(r => r.value === v)?.label}</Badge>)}
                    {!selectedGenre.includes('all') && selectedGenre.map(v => <Badge key={`g-${v}`} variant="outline" className="border-border/50 bg-card/30 text-[10px] sm:text-xs">Thể loại: {genreOptions.find(g => g.value === v)?.label}</Badge>)}
                    {!selectedVersion.includes('all') && selectedVersion.map(v => <Badge key={`v-${v}`} variant="outline" className="border-border/50 bg-card/30 text-[10px] sm:text-xs">Phiên bản: {versions.find(ver => ver.value === v)?.label}</Badge>)}
                    {!selectedYear.includes('all') && selectedYear.map(v => <Badge key={`y-${v}`} variant="outline" className="border-border/50 bg-card/30 font-mono text-[10px] sm:text-xs">Năm: {v}</Badge>)}
                    
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[10px] h-6 px-2 text-muted-foreground hover:text-danger rounded-full ml-1"
                        onClick={handleReset}
                    >
                        Xóa tuỳ chọn
                    </Button>
                </div>
            )}

            {/* Movie Grid */}
            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
                    {Array.from({ length: parseInt(selectedLimit) }).map((_, i) => (
                        <Skeleton key={i} className="aspect-[2/3] rounded-xl" />
                    ))}
                </div>
            ) : movies.length > 0 ? (
                <MovieGrid movies={movies} />
            ) : (
                <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">Không tìm thấy phim nào với các bộ lọc hiện tại</p>
                    <Button 
                        onClick={handleReset}
                        className="mt-2"
                        variant="outline"
                    >
                        🔄 Đặt lại bộ lọc
                    </Button>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-12">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="flex items-center space-x-1"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Trước</span>
                    </Button>

                    <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                            let pageNum
                            if (totalPages <= 7) {
                                pageNum = i + 1
                            } else if (currentPage <= 4) {
                                pageNum = i + 1
                            } else if (currentPage >= totalPages - 3) {
                                pageNum = totalPages - 6 + i
                            } else {
                                pageNum = currentPage - 3 + i
                            }

                            return (
                                <Button
                                    key={pageNum}
                                    variant={currentPage === pageNum ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handlePageChange(pageNum)}
                                    className="w-10 h-10"
                                >
                                    {pageNum}
                                </Button>
                            )
                        })}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className="flex items-center space-x-1"
                    >
                        <span>Sau</span>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Page Info */}
            {totalPages > 0 && (
                <div className="text-center mt-6">
                    <p className="text-sm text-muted-foreground">
                        Trang {currentPage} / {totalPages} • Tổng cộng {totalItems.toLocaleString()} phim • Hiển thị {selectedLimit} phim/trang
                    </p>
                </div>
            )}
        </div>
    )
} 