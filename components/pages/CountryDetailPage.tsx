'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MovieGrid } from '@/components/ui/MovieGrid'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { fetchMoviesByCountry, fetchCountries, fetchGenres, Movie, Country, Genre, CategoryApiResponse } from '@/lib/api'
import { ChevronLeft, ChevronRight, Globe, SlidersHorizontal } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface CountryDetailPageProps {
  countrySlug: string
  initialPage?: number
}

// FilterButton component cho options
interface FilterButtonProps {
    value: string
    label: string
    isSelected: boolean
    onClick: (value: string) => void
}

const FilterButton = ({ value, label, isSelected, onClick }: FilterButtonProps) => (
    <Button
        variant={isSelected ? "default" : "outline"}
        size="sm"
        onClick={() => onClick(value)}
        className={`text-xs transition-all duration-200 ${
            isSelected 
                ? 'bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-500' 
                : 'hover:bg-muted/50'
        }`}
    >
        {label}
    </Button>
)

// FilterSection component
interface FilterSectionProps {
    title: string
    options: { value: string; label: string }[]
    selectedValue: string
    onSelect: (value: string) => void
}

const FilterSection = ({ title, options, selectedValue, onSelect }: FilterSectionProps) => (
    <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">{title}:</label>
        <div className="flex flex-wrap gap-2">
            {options.map((option) => (
                <FilterButton
                    key={option.value}
                    value={option.value}
                    label={option.label}
                    isSelected={selectedValue === option.value}
                    onClick={onSelect}
                />
            ))}
        </div>
    </div>
)

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
    const [selectedType, setSelectedType] = useState<string>('all')
    const [selectedRating, setSelectedRating] = useState<string>('all')
    const [selectedGenre, setSelectedGenre] = useState<string>('all')
    const [selectedVersion, setSelectedVersion] = useState<string>('all')
    const [selectedYear, setSelectedYear] = useState<string>('all')
    const [selectedSort, setSelectedSort] = useState<string>('modified.time')
    const [selectedLimit, setSelectedLimit] = useState<string>('24')
    
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
        ...Array.from({ length: 20 }, (_, i) => {
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

            if (selectedYear && selectedYear !== 'all') {
                params.year = selectedYear
            }
            
            if (selectedVersion && selectedVersion !== 'all') {
                params.sort_lang = selectedVersion
            }
            
            if (selectedGenre && selectedGenre !== 'all') {
                params.category = selectedGenre
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
        setSelectedType('all')
        setSelectedRating('all')
        setSelectedGenre('all')
        setSelectedVersion('all')
        setSelectedYear('all')
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
            <div className="mb-6">
                <Button
                    onClick={() => setShowFilters(!showFilters)}
                    variant="outline"
                    className="flex items-center space-x-2 hover:bg-muted/50"
                >
                    <SlidersHorizontal className="h-4 w-4" />
                    <span>{showFilters ? '▲' : '▼'} Bộ lọc</span>
                </Button>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="mb-8 p-6 bg-muted/50 rounded-xl border border-border/50 space-y-6">
                    {/* Filter Sections */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <FilterSection
                            title="Loại phim"
                            options={movieTypes}
                            selectedValue={selectedType}
                            onSelect={setSelectedType}
                        />
                        
                        <FilterSection
                            title="Xếp hạng"
                            options={ratings}
                            selectedValue={selectedRating}
                            onSelect={setSelectedRating}
                        />
                        
                        <FilterSection
                            title="Thể loại"
                            options={genreOptions}
                            selectedValue={selectedGenre}
                            onSelect={setSelectedGenre}
                        />
                        
                        <FilterSection
                            title="Phiên bản"
                            options={versions}
                            selectedValue={selectedVersion}
                            onSelect={setSelectedVersion}
                        />
                        
                        <FilterSection
                            title="Năm sản xuất"
                            options={years}
                            selectedValue={selectedYear}
                            onSelect={setSelectedYear}
                        />
                        
                        <FilterSection
                            title="Sắp xếp"
                            options={sortOptions}
                            selectedValue={selectedSort}
                            onSelect={setSelectedSort}
                        />
                    </div>

                    {/* Hiển thị section - Full width */}
                    <FilterSection
                        title="Hiển thị"
                        options={limits}
                        selectedValue={selectedLimit}
                        onSelect={setSelectedLimit}
                    />

                    {/* Action Buttons */}
                    <div className="flex gap-4 justify-end pt-4 border-t border-border/30">
                        <Button onClick={handleReset} variant="outline" className="hover:bg-muted/50">
                            Đặt lại
                        </Button>
                        <Button onClick={handleCloseFilters} variant="outline" className="hover:bg-muted/50">
                            Đóng
                        </Button>
                        <Button onClick={handleFilter} className="bg-yellow-500 hover:bg-yellow-600 text-black">
                            Lọc kết quả
                        </Button>
                    </div>
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