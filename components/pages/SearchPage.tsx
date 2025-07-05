'use client'

import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MovieCard } from '@/components/ui/MovieCard'
import { Search, Filter, SlidersHorizontal } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { searchMovies, fetchGenres, fetchCountries, Movie, Genre, Country } from '@/lib/api'

export function SearchPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [searchType, setSearchType] = useState('all')
    const [selectedGenre, setSelectedGenre] = useState('all')
    const [selectedCountry, setSelectedCountry] = useState('all')
    const [selectedYear, setSelectedYear] = useState('all')
    const [selectedLanguage, setSelectedLanguage] = useState('all')
    const [sortBy, setSortBy] = useState('modified_time')
    const [sortType, setSortType] = useState('desc')
    
    const [searchResults, setSearchResults] = useState<Movie[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [genres, setGenres] = useState<Genre[]>([])
    const [countries, setCountries] = useState<Country[]>([])
    const [totalResults, setTotalResults] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)

    // Load genres and countries on component mount
    useEffect(() => {
        const loadFilters = async () => {
            try {
                const [genresData, countriesData] = await Promise.all([
                    fetchGenres(),
                    fetchCountries()
                ])
                setGenres(genresData)
                setCountries(countriesData)
            } catch (err) {
                console.error('Error loading filters:', err)
            }
        }
        loadFilters()
    }, [])

    const searchTypes = [
        { value: 'all', label: '🔍 Tất cả' },
        { value: 'title', label: '🎬 Tên phim' },
        { value: 'actor', label: '👤 Diễn viên' },
        { value: 'director', label: '🎭 Đạo diễn' },
        { value: 'keyword', label: '🏷️ Từ khóa' },
    ]

    const years = [
        { value: 'all', label: 'Tất cả năm' },
        ...Array.from({ length: 30 }, (_, i) => {
            const year = new Date().getFullYear() - i
            return { value: year.toString(), label: year.toString() }
        })
    ]

    const languages = [
        { value: 'all', label: 'Tất cả ngôn ngữ' },
        { value: 'vietsub', label: '🇻🇳 Vietsub' },
        { value: 'thuyet-minh', label: '🎙️ Thuyết minh' },
        { value: 'long-tieng', label: '🗣️ Lồng tiếng' },
    ]

    const sortOptions = [
        { value: 'modified_time', label: '🕒 Mới cập nhật' },
        { value: 'year', label: '📅 Năm phát hành' },
        { value: 'view', label: '👁️ Lượt xem' },
        { value: 'name', label: '🔤 Tên phim A-Z' },
    ]

    const sortTypes = [
        { value: 'desc', label: 'Giảm dần' },
        { value: 'asc', label: 'Tăng dần' },
    ]

    const handleSearch = async () => {
        if (!searchQuery.trim() && selectedGenre === 'all' && selectedCountry === 'all' && selectedYear === 'all') {
            return
        }

        try {
            setLoading(true)
            setError(null)
            
            const params = {
                keyword: searchQuery.trim() || undefined,
                page: 1,
                sort_field: sortBy,
                sort_type: sortType as 'asc' | 'desc',
                sort_lang: selectedLanguage !== 'all' ? selectedLanguage : undefined,
                category: selectedGenre !== 'all' ? selectedGenre : undefined,
                country: selectedCountry !== 'all' ? selectedCountry : undefined,
                year: selectedYear !== 'all' ? selectedYear : undefined,
                limit: 24
            }

            const response = await searchMovies(params)
            
            if (response.items) {
                setSearchResults(response.items)
                setTotalResults(response.pagination?.totalItems || response.items.length)
            } else if (response.data?.items) {
                setSearchResults(response.data.items)
                setTotalResults(response.data.params?.pagination?.totalItems || response.data.items.length)
            } else {
                setSearchResults([])
                setTotalResults(0)
            }
            setCurrentPage(1)
        } catch (err) {
            setError('Có lỗi xảy ra khi tìm kiếm. Vui lòng thử lại.')
            console.error('Search error:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch()
        }
    }

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* Search Header */}
            <div className="text-center space-y-3 sm:space-y-4">
                <h1 className="text-3xl sm:text-4xl font-bold shiny-text">Tìm kiếm phim</h1>
                <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
                    Khám phá hàng ngàn bộ phim với công cụ tìm kiếm thông minh và đa dạng
                </p>
            </div>

            {/* Search Form */}
            <Card className="border-0 bg-gradient-to-br from-card/80 via-card to-card/60 backdrop-blur-xl shadow-lg">
                <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                    {/* Search Type Selection */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            Loại tìm kiếm
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                            {searchTypes.map((type) => (
                                <Button
                                    key={type.value}
                                    variant={searchType === type.value ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSearchType(type.value)}
                                    className={`justify-start text-xs sm:text-sm ${
                                        searchType === type.value 
                                            ? "bg-gradient-to-r from-primary to-purple-600 text-white" 
                                            : "hover:bg-accent"
                                    }`}
                                >
                                    {type.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Search Input */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            Từ khóa tìm kiếm
                        </h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                placeholder={`Nhập ${searchTypes.find(t => t.value === searchType)?.label.toLowerCase() || 'từ khóa'}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 h-11 sm:h-12 text-sm sm:text-base bg-background/50 border-border/50 focus:border-primary/50"
                                onKeyPress={handleKeyPress}
                            />
                        </div>
                    </div>

                    {/* Advanced Filters */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            Bộ lọc nâng cao
                        </h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Thể loại</label>
                                <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                                    <SelectTrigger className="h-10 sm:h-11 bg-background/50 border-border/50 text-sm">
                                        <SelectValue placeholder="Chọn thể loại" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tất cả thể loại</SelectItem>
                                        {genres.map((genre) => (
                                            <SelectItem key={genre._id} value={genre.slug} className="text-sm">
                                                {genre.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Quốc gia</label>
                                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                                    <SelectTrigger className="h-10 sm:h-11 bg-background/50 border-border/50 text-sm">
                                        <SelectValue placeholder="Chọn quốc gia" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tất cả quốc gia</SelectItem>
                                        {countries.map((country) => (
                                            <SelectItem key={country._id} value={country.slug} className="text-sm">
                                                {country.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Năm phát hành</label>
                                <Select value={selectedYear} onValueChange={setSelectedYear}>
                                    <SelectTrigger className="h-10 sm:h-11 bg-background/50 border-border/50 text-sm">
                                        <SelectValue placeholder="Chọn năm" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {years.map((year) => (
                                            <SelectItem key={year.value} value={year.value} className="text-sm">
                                                {year.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Ngôn ngữ</label>
                                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                                    <SelectTrigger className="h-10 sm:h-11 bg-background/50 border-border/50 text-sm">
                                        <SelectValue placeholder="Chọn ngôn ngữ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {languages.map((lang) => (
                                            <SelectItem key={lang.value} value={lang.value} className="text-sm">
                                                {lang.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Sort Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Sắp xếp theo</label>
                                <Select value={sortBy} onValueChange={setSortBy}>
                                    <SelectTrigger className="h-10 sm:h-11 bg-background/50 border-border/50 text-sm">
                                        <SelectValue placeholder="Chọn cách sắp xếp" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sortOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value} className="text-sm">
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Thứ tự</label>
                                <Select value={sortType} onValueChange={setSortType}>
                                    <SelectTrigger className="h-10 sm:h-11 bg-background/50 border-border/50 text-sm">
                                        <SelectValue placeholder="Chọn thứ tự" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sortTypes.map((type) => (
                                            <SelectItem key={type.value} value={type.value} className="text-sm">
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Search Button */}
                    <Button 
                        onClick={handleSearch}
                        disabled={loading}
                        className="w-full h-11 sm:h-12 text-sm sm:text-base bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 font-semibold"
                    >
                        <Search className="h-4 w-4 mr-2" />
                        {loading ? 'Đang tìm kiếm...' : 'Tìm kiếm phim'}
                    </Button>
                </CardContent>
            </Card>

            {/* Active Filters */}
            {(searchQuery || selectedGenre !== 'all' || selectedCountry !== 'all' || selectedYear !== 'all' || selectedLanguage !== 'all') && (
                <Card className="border-0 bg-muted/30">
                    <CardContent className="p-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">Bộ lọc đang áp dụng:</span>
                            {searchQuery && (
                                <Badge variant="secondary" className="text-xs">
                                    Từ khóa: {searchQuery}
                                </Badge>
                            )}
                            {selectedGenre !== 'all' && (
                                <Badge variant="secondary" className="text-xs">
                                    {genres.find(g => g.slug === selectedGenre)?.name}
                                </Badge>
                            )}
                            {selectedCountry !== 'all' && (
                                <Badge variant="secondary" className="text-xs">
                                    {countries.find(c => c.slug === selectedCountry)?.name}
                                </Badge>
                            )}
                            {selectedYear !== 'all' && (
                                <Badge variant="secondary" className="text-xs">
                                    Năm {selectedYear}
                                </Badge>
                            )}
                            {selectedLanguage !== 'all' && (
                                <Badge variant="secondary" className="text-xs">
                                    {languages.find(l => l.value === selectedLanguage)?.label}
                                </Badge>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Search Results */}
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-xl sm:text-2xl font-bold">
                        Kết quả tìm kiếm {searchQuery && `cho "${searchQuery}"`}
                    </h2>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <SlidersHorizontal className="h-4 w-4" />
                        <span className="text-sm">Tìm thấy {totalResults} kết quả</span>
                    </div>
                </div>

                {loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="space-y-3">
                                <Skeleton className="w-full aspect-[2/3] rounded-lg" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        ))}
                    </div>
                )}

                {error && (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">😔</div>
                        <h3 className="text-xl font-semibold mb-2">Có lỗi xảy ra</h3>
                        <p className="text-muted-foreground mb-4">{error}</p>
                        <Button onClick={handleSearch}>Thử lại</Button>
                    </div>
                )}

                {!loading && !error && searchResults.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
                        {searchResults.map((movie) => (
                            <MovieCard key={movie._id} movie={movie} />
                        ))}
                    </div>
                )}

                {/* No Results */}
                {!loading && !error && searchResults.length === 0 && (searchQuery || selectedGenre !== 'all' || selectedCountry !== 'all' || selectedYear !== 'all') && (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">🔍</div>
                        <h3 className="text-xl font-semibold mb-2">Không tìm thấy kết quả</h3>
                        <p className="text-muted-foreground">
                            Hãy thử thay đổi từ khóa hoặc bộ lọc để tìm kiếm phim khác
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}