'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MovieGrid } from '@/components/ui/MovieGrid'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { fetchMoviesByFilter, fetchCountries, fetchGenres, Movie, Country, Genre, CategoryApiResponse } from '@/lib/api'
import { Tv, ChevronLeft, ChevronRight, SlidersHorizontal, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
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

export function TvSeriesPage() {
    const [movies, setMovies] = useState<Movie[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(0)
    const [totalItems, setTotalItems] = useState(0)

    // Filter visibility state
    const [showFilters, setShowFilters] = useState(false)

    // Filter states
    const [selectedCountry, setSelectedCountry] = useState<string[]>(['all'])
    const [selectedType, setSelectedType] = useState<string[]>(['phim-bo'])
    const [selectedRating, setSelectedRating] = useState<string[]>(['all'])
    const [selectedGenre, setSelectedGenre] = useState<string[]>(['all'])
    const [selectedVersion, setSelectedVersion] = useState<string[]>(['all'])
    const [selectedYear, setSelectedYear] = useState<string[]>(['all'])
    const [selectedSort, setSelectedSort] = useState<string>('modified.time')

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

    // Dynamic Filter Options
    const [genresData, setGenresData] = useState<Genre[]>([])
    const [countriesData, setCountriesData] = useState<Country[]>([])

    useEffect(() => {
        const loadFilterOptions = async () => {
            try {
                const [cData, gData] = await Promise.all([fetchCountries(), fetchGenres()])
                setCountriesData(cData)
                setGenresData(gData)
            } catch (err) {
                console.error('Error loading filter options:', err)
            }
        }
        loadFilterOptions()
    }, [])

    const countryOptions = [
        { value: 'all', label: 'Tất cả' },
        ...countriesData.map(c => ({ value: c.slug, label: c.name }))
    ]

    const genreOptions = [
        { value: 'all', label: 'Tất cả' },
        ...genresData.map(g => ({ value: g.slug, label: g.name }))
    ]

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

    const years = [
        { value: 'all', label: 'Tất cả' },
        ...Array.from({ length: 30 }, (_, i) => {
            const year = new Date().getFullYear() - i
            return { value: year.toString(), label: year.toString() }
        })
    ]

    const sortOptions = [
        { value: 'modified.time', label: 'Mới nhất' },
        { value: '_id', label: 'Mới cập nhật' },
        { value: 'year', label: 'Điểm IMDb' },
        { value: 'view', label: 'Lượt xem' }
    ]

    const loadTvSeries = async (page: number = 1) => {
        try {
            setLoading(true)
            const typeChoice = selectedType[0]
            const params: any = {
                type_list: typeChoice === 'all' ? 'phim-bo' : typeChoice as 'phim-bo' | 'phim-le',
                page,
                sort_field: selectedSort,
                sort_type: 'desc',
                limit: 24
            }

            if (!selectedYear.includes('all')) {
                params.year = selectedYear.join(',')
            }

            if (!selectedCountry.includes('all')) {
                params.country = selectedCountry.join(',')
            }

            if (!selectedGenre.includes('all')) {
                params.category = selectedGenre.join(',')
            }

            if (!selectedVersion.includes('all')) {
                params.sort_lang = selectedVersion.join(',')
            }

            const response: CategoryApiResponse = await fetchMoviesByFilter(params)
            
            if (response.data?.items) {
                setMovies(response.data.items)
                setTotalPages(response.data.params?.pagination?.totalPages || 0)
                setTotalItems(response.data.params?.pagination?.totalItems || 0)
            }
        } catch (err) {
            setError('Không thể tải danh sách phim bộ')
            console.error('Error loading TV series:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleFilter = () => {
        setCurrentPage(1)
        loadTvSeries(1)
    }

    const handleReset = () => {
        setSelectedCountry(['all'])
        setSelectedType(['phim-bo'])
        setSelectedRating(['all'])
        setSelectedGenre(['all'])
        setSelectedVersion(['all'])
        setSelectedYear(['all'])
        setSelectedSort('modified.time')
        setCurrentPage(1)
        loadTvSeries(1)
    }

    const handleCloseFilters = () => {
        setShowFilters(false)
    }

    useEffect(() => {
        loadTvSeries(currentPage)
    }, [currentPage])

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <SectionHeader 
                    title="Phim Bộ" 
                    subtitle="Thế giới phim bộ đặc sắc"
                    icon={Tv}
                />
                <div className="text-center py-12">
                    <p className="text-muted-foreground">{error}</p>
                    <Button 
                        onClick={() => loadTvSeries(currentPage)} 
                        className="mt-4"
                    >
                        Thử lại
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <SectionHeader 
                title="Phim Bộ" 
                subtitle={`${totalItems.toLocaleString()} bộ phim hay đang chờ bạn khám phá`}
                icon={Tv}
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
                            
                            <FilterPills title="Quốc gia" options={countryOptions} selectedValues={selectedCountry} onToggle={handleToggle(setSelectedCountry, true)} />
                            <FilterPills title="Loại phim" options={movieTypes} selectedValues={selectedType} onToggle={handleToggle(setSelectedType, false)} />
                            <FilterPills title="Xếp hạng" options={ratings} selectedValues={selectedRating} onToggle={handleToggle(setSelectedRating, true)} />
                            <FilterPills title="Thể loại" options={genreOptions} selectedValues={selectedGenre} onToggle={handleToggle(setSelectedGenre, true)} />
                            <FilterPills title="Phiên bản" options={versions} selectedValues={selectedVersion} onToggle={handleToggle(setSelectedVersion, true)} />
                            <FilterPills title="Năm sản xuất" options={years} selectedValues={selectedYear} onToggle={handleToggle(setSelectedYear, true)} />

                            <div className="mt-8 pt-6 border-t border-border/30 flex flex-col sm:flex-row items-center gap-4 justify-between">
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
                                <div className="flex gap-3 w-full sm:w-auto">
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
            {(!selectedCountry.includes('all') || (!selectedType.includes('all') && !selectedType.includes('phim-bo')) || !selectedRating.includes('all') || !selectedGenre.includes('all') || !selectedVersion.includes('all') || !selectedYear.includes('all')) && (
                <div className="flex flex-wrap items-center gap-2 mb-6 animate-in fade-in">
                    {!selectedCountry.includes('all') && selectedCountry.map(v => <Badge key={`c-${v}`} variant="outline" className="border-border/50 bg-card/30 text-[10px] sm:text-xs">Quốc gia: {countryOptions.find(c => c.value === v)?.label}</Badge>)}
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
                    {Array.from({ length: 24 }).map((_, i) => (
                        <Skeleton key={i} className="aspect-[2/3] rounded-xl" />
                    ))}
                </div>
            ) : (
                <MovieGrid movies={movies} />
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
            <div className="text-center mt-6">
                <p className="text-sm text-muted-foreground">
                    Trang {currentPage} / {totalPages} • Tổng cộng {totalItems.toLocaleString()} phim bộ
                </p>
            </div>
        </div>
    )
} 