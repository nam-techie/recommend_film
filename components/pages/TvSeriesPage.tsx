'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MovieGrid } from '@/components/ui/MovieGrid'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { fetchMoviesByFilter, Movie, CategoryApiResponse } from '@/lib/api'
import { Tv, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'

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
    const [selectedCountry, setSelectedCountry] = useState<string>('all')
    const [selectedType, setSelectedType] = useState<string>('phim-bo')
    const [selectedRating, setSelectedRating] = useState<string>('all')
    const [selectedGenre, setSelectedGenre] = useState<string>('all')
    const [selectedVersion, setSelectedVersion] = useState<string>('all')
    const [selectedYear, setSelectedYear] = useState<string>('all')
    const [selectedSort, setSelectedSort] = useState<string>('modified.time')

    // Options data
    const countries = [
        { value: 'all', label: 'Tất cả' },
        { value: 'viet-nam', label: 'Việt Nam' },
        { value: 'han-quoc', label: 'Hàn Quốc' },
        { value: 'trung-quoc', label: 'Trung Quốc' },
        { value: 'nhat-ban', label: 'Nhật Bản' },
        { value: 'thai-lan', label: 'Thái Lan' },
        { value: 'au-my', label: 'Âu Mỹ' },
        { value: 'anh', label: 'Anh' },
        { value: 'phap', label: 'Pháp' },
        { value: 'duc', label: 'Đức' },
        { value: 'canada', label: 'Canada' },
        { value: 'hong-kong', label: 'Hồng Kông' }
    ]

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

    const genres = [
        { value: 'all', label: 'Tất cả' },
        { value: 'hanh-dong', label: 'Hành Động' },
        { value: 'tinh-cam', label: 'Tình Cảm' },
        { value: 'hai-huoc', label: 'Hài Hước' },
        { value: 'kinh-di', label: 'Kinh Dị' },
        { value: 'chien-tranh', label: 'Chiến Tranh' },
        { value: 'chinh-kich', label: 'Chính Kịch' },
        { value: 'phieu-luu', label: 'Phiêu Lưu' },
        { value: 'anime', label: 'Anime' },
        { value: 'cung-dau', label: 'Cung Đấu' },
        { value: 'co-trang', label: 'Cổ Trang' },
        { value: 'than-thoai', label: 'Thần Thoại' }
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
        ...Array.from({ length: 15 }, (_, i) => {
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
            const params: any = {
                type_list: selectedType === 'all' ? 'phim-bo' : selectedType as 'phim-bo' | 'phim-le',
                page,
                sort_field: selectedSort,
                sort_type: 'desc',
                limit: 24
            }

            if (selectedYear && selectedYear !== 'all') {
                params.year = selectedYear
            }

            if (selectedCountry && selectedCountry !== 'all') {
                params.country = selectedCountry
            }

            if (selectedGenre && selectedGenre !== 'all') {
                params.category = selectedGenre
            }

            if (selectedVersion && selectedVersion !== 'all') {
                params.sort_lang = selectedVersion
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
        setSelectedCountry('all')
        setSelectedType('phim-bo')
        setSelectedRating('all')
        setSelectedGenre('all')
        setSelectedVersion('all')
        setSelectedYear('all')
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
                            title="Quốc gia"
                            options={countries}
                            selectedValue={selectedCountry}
                            onSelect={setSelectedCountry}
                        />
                        
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
                            options={genres}
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
                    </div>

                    {/* Sort Section - Full width */}
                    <FilterSection
                        title="Sắp xếp"
                        options={sortOptions}
                        selectedValue={selectedSort}
                        onSelect={setSelectedSort}
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