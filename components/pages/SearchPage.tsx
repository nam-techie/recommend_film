'use client'

import React, { useState, useEffect, useCallback, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MovieCard } from '@/components/ui/MovieCard'
import { Search, Filter, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { searchMovies, fetchGenres, fetchCountries, Movie, Genre, Country } from '@/lib/api'

export function SearchPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

    // Initialize from URL search parameters if available
    const [searchQuery, setSearchQuery] = useState('')
    const [searchType, setSearchType] = useState('all')
    const [selectedGenre, setSelectedGenre] = useState('all')
    const [selectedCountry, setSelectedCountry] = useState('all')
    const [selectedYear, setSelectedYear] = useState('all')
    const [selectedLanguage, setSelectedLanguage] = useState('all')
    const [sortBy, setSortBy] = useState('modified_time')
    const [sortType, setSortType] = useState('desc')
    
    // UI states
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
    const [suggestions, setSuggestions] = useState<Movie[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [loadingSuggestions, setLoadingSuggestions] = useState(false)
    
    const [searchResults, setSearchResults] = useState<Movie[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [genres, setGenres] = useState<Genre[]>([])
    const [countries, setCountries] = useState<Country[]>([])
    const [totalResults, setTotalResults] = useState(0)

    // Load static filters
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
                console.error('Error loading static filters:', err)
            }
        }
        loadFilters()
    }, [])

    const searchTypes = [
        { value: 'all', label: 'Tất cả' },
        { value: 'title', label: 'Tên phim' },
        { value: 'actor', label: 'Diễn viên' },
        { value: 'director', label: 'Đạo diễn' },
        { value: 'keyword', label: 'Từ khóa' },
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
        { value: 'vietsub', label: 'Vietsub' },
        { value: 'thuyet-minh', label: 'Thuyết minh' },
        { value: 'long-tieng', label: 'Lồng tiếng' },
    ]

    const sortOptions = [
        { value: 'modified_time', label: 'Mới cập nhật' },
        { value: 'year', label: 'Năm phát hành' },
        { value: 'view', label: 'Lượt xem' },
        { value: 'name', label: 'Tên phim A-Z' },
    ]

    const sortTypes = [
        { value: 'desc', label: 'Giảm dần' },
        { value: 'asc', label: 'Tăng dần' },
    ]

    // Push new params to router (triggering Effect automatically)
    const updateRouteParams = useCallback((newParamsObj: Record<string, string>) => {
        const params = new URLSearchParams(searchParams.toString())
        Object.entries(newParamsObj).forEach(([key, value]) => {
            if (value && value !== 'all') {
                params.set(key, value)
            } else {
                params.delete(key)
            }
        })
        startTransition(() => {
            router.push(`/search?${params.toString()}`, { scroll: false })
        })
    }, [router, searchParams])

    // Specific updaters hooked directly to Router to create Auto-Fetch illusion
    const handleFilterChange = (key: string, value: string) => {
        // Cập nhật URL -> Effect sẽ chạy
        const currentParams = {
            keyword: searchQuery,
            type: searchType,
            genre: selectedGenre,
            country: selectedCountry,
            year: selectedYear,
            language: selectedLanguage,
            sort_field: sortBy,
            sort_type: sortType
        }
        updateRouteParams({ ...currentParams, [key]: value })
    }

    const handleSearchSubmit = () => {
        setShowSuggestions(false)
        handleFilterChange('keyword', searchQuery)
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearchSubmit()
    }

    // Effect to Sync URL to State and Perform Search
    useEffect(() => {
        const keyword = searchParams.get('keyword') || ''
        const type = searchParams.get('type') || 'all'
        const genre = searchParams.get('genre') || 'all'
        const country = searchParams.get('country') || 'all'
        const year = searchParams.get('year') || 'all'
        const lang = searchParams.get('language') || 'all'
        const sField = searchParams.get('sort_field') || 'modified_time'
        const sType = searchParams.get('sort_type') || 'desc'

        setSearchQuery(keyword)
        setSearchType(type)
        setSelectedGenre(genre)
        setSelectedCountry(country)
        setSelectedYear(year)
        setSelectedLanguage(lang)
        setSortBy(sField)
        setSortType(sType)

        // Only search if not everything is default
        if (keyword || genre !== 'all' || country !== 'all' || year !== 'all' || lang !== 'all') {
            performSearch({ keyword, genre, country, year, lang, sField, sType })
        } else {
            setSearchResults([])
            setTotalResults(0)
        }
    }, [searchParams])

    const performSearch = async (filters: any) => {
        try {
            setLoading(true)
            setError(null)
            
            const params = {
                keyword: filters.keyword || undefined,
                page: 1,
                sort_field: filters.sField,
                sort_type: filters.sType as 'asc' | 'desc',
                sort_lang: filters.lang !== 'all' ? filters.lang : undefined,
                category: filters.genre !== 'all' ? filters.genre : undefined,
                country: filters.country !== 'all' ? filters.country : undefined,
                year: filters.year !== 'all' ? filters.year : undefined,
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
        } catch (err) {
            setError('Có lỗi xảy ra khi tìm kiếm. Vui lòng thử lại.')
            console.error('Search error:', err)
        } finally {
            setLoading(false)
        }
    }

    // Debounce for Auto Suggestions
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!searchQuery.trim() || searchQuery.trim().length < 2) {
                setSuggestions([])
                setShowSuggestions(false)
                return
            }
            // Skip suggestion if user is typing exactly what is in URL (meaning they just submitted)
            if (searchQuery.trim() === searchParams.get('keyword')) {
                return
            }
            
            try {
                setLoadingSuggestions(true)
                const response = await searchMovies({ keyword: searchQuery.trim(), limit: 5 })
                if (response.items?.length) {
                    setSuggestions(response.items.slice(0, 5))
                    setShowSuggestions(true)
                } else if (response.data?.items?.length) {
                    setSuggestions(response.data.items.slice(0, 5))
                    setShowSuggestions(true)
                } else {
                    setSuggestions([])
                    setShowSuggestions(false)
                }
            } catch (err) {
                console.error('Suggestions error:', err)
            } finally {
                setLoadingSuggestions(false)
            }
        }

        const timeoutId = setTimeout(fetchSuggestions, 400)
        return () => clearTimeout(timeoutId)
    }, [searchQuery, searchParams])

    const getImageUrl = (path: string) => {
        if (!path) return '/placeholder-movie.jpg'
        if (path.startsWith('http')) return path
        return `https://phimimg.com/${path}`
    }

    const hasActiveFilters = searchQuery || selectedGenre !== 'all' || selectedCountry !== 'all' || selectedYear !== 'all' || selectedLanguage !== 'all'

    return (
        <div className="space-y-6 sm:space-y-8 pb-10">
            {/* Search Hero Area */}
            <div className="flex flex-col items-center justify-center text-center space-y-4 pt-4 sm:pt-8 pb-6">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 backdrop-blur-md mb-2 px-3 py-1 font-mono">
                    Hệ thống thông minh
                </Badge>
                <h1 className="text-3xl sm:text-5xl font-bold font-jost text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                    Thư viện Điện ảnh
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto px-4">
                    Gõ từ khóa để tra cứu ngay, kết hợp bộ lọc thông minh giúp bạn tìm thấy bộ phim ưng ý nhất trong vũ trụ giải trí.
                </p>
            </div>

            {/* Main Command Bar Area */}
            <div className="max-w-4xl mx-auto relative z-40">
                <div className="flex flex-col space-y-3">
                    {/* Unified Command Input */}
                    <div className="relative flex items-center bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-1.5 shadow-xl transition-all hover:border-primary/50 focus-within:border-primary/50 focus-within:shadow-primary/10 focus-within:ring-2 focus-within:ring-primary/20">
                        {/* Inline Search Type - Sleek hidden on very small mobile */}
                        <div className="hidden sm:block shrink-0">
                            <Select value={searchType} onValueChange={(val) => handleFilterChange('type', val)}>
                                <SelectTrigger className="w-[130px] border-none bg-transparent hover:bg-muted text-sm rounded-xl focus:ring-0">
                                    <SelectValue placeholder="Phân loại" />
                                </SelectTrigger>
                                <SelectContent>
                                    {searchTypes.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {/* Divider */}
                        <div className="hidden sm:block w-px h-6 bg-border mx-2" />

                        {/* Search Input Box */}
                        <div className="relative flex-1 flex items-center">
                            <Search className="h-4 w-4 text-muted-foreground ml-3 shrink-0" />
                            <Input
                                placeholder="Gõ tên phim, đạo diễn hoặc diễn viên..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                className="border-none bg-transparent shadow-none text-base h-12 focus-visible:ring-0 px-3 w-full font-medium placeholder:font-normal"
                                onKeyPress={handleKeyPress}
                                autoComplete="off"
                            />
                        </div>

                        {/* Submit Button */}
                        <Button 
                            onClick={handleSearchSubmit}
                            disabled={loading || isPending}
                            className="shrink-0 h-11 w-11 sm:w-auto px-0 sm:px-6 rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 font-semibold shadow-md ml-1"
                        >
                            <Search className="sm:hidden h-5 w-5" />
                            <span className="hidden sm:inline">Tìm kiếm</span>
                        </Button>

                        {/* Suggestions Popover */}
                        {showSuggestions && (
                            <div className="absolute top-full left-0 right-0 mt-3 bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden z-[100] max-h-[360px] overflow-y-auto animate-in fade-in slide-in-from-top-2">
                                {loadingSuggestions ? (
                                    <div className="p-6 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                        Đang tải kết quả...
                                    </div>
                                ) : (
                                    <ul className="py-2">
                                        {suggestions.map(movie => (
                                            <li key={movie._id}>
                                                <Link 
                                                    href={`/movie/${movie.slug}`} 
                                                    className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer group/item"
                                                >
                                                    <div className="w-12 h-16 bg-muted rounded-md shadow-sm overflow-hidden shrink-0 border border-border/20">
                                                        <img 
                                                            src={getImageUrl(movie.thumb_url || movie.poster_url)} 
                                                            alt={movie.name} 
                                                            className="w-full h-full object-cover transition-transform group-hover/item:scale-105" 
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-sm sm:text-base truncate text-foreground group-hover/item:text-primary transition-colors">{movie.name}</h4>
                                                        <p className="text-xs text-muted-foreground truncate font-mono mt-0.5">{movie.origin_name}</p>
                                                    </div>
                                                    {movie.year && (
                                                        <Badge variant="outline" className="hidden sm:inline-flex shrink-0 font-mono text-[10px]">
                                                            {movie.year}
                                                        </Badge>
                                                    )}
                                                </Link>
                                            </li>
                                        ))}
                                        <li className="px-4 py-3 border-t border-border mt-1 bg-muted/10">
                                            <Button variant="ghost" className="w-full justify-center text-primary font-semibold text-sm h-9 hover:bg-primary/10" onClick={handleSearchSubmit}>
                                                Toàn bộ kết quả cho "{searchQuery}"
                                            </Button>
                                        </li>
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Filter Toggle Button */}
                    <div className="flex justify-center mt-2">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs text-muted-foreground hover:text-foreground font-medium rounded-full px-4 h-8 transition-colors bg-card/30 backdrop-blur-sm border border-transparent hover:border-border/50"
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        >
                            <Filter className="h-3.5 w-3.5 mr-1.5" />
                            {showAdvancedFilters ? 'Ẩn bộ lọc' : 'Lọc nâng cao'}
                            {showAdvancedFilters ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
                        </Button>
                    </div>

                    {/* Advanced Filters Panel - Collapsible */}
                    {showAdvancedFilters && (
                        <div className="animate-in fade-in slide-in-from-top-2 pt-2">
                            <Card className="border border-border/40 bg-card/40 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden">
                                <CardContent className="p-4 sm:p-5">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">Thể loại</label>
                                            <Select value={selectedGenre} onValueChange={(val) => handleFilterChange('genre', val)}>
                                                <SelectTrigger className="h-9 sm:h-10 bg-background/50 border-border/40 text-xs sm:text-sm rounded-lg">
                                                    <SelectValue placeholder="Tất cả" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Tất cả</SelectItem>
                                                    {genres.map((genre) => (
                                                        <SelectItem key={genre._id} value={genre.slug} className="text-xs sm:text-sm">{genre.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">Quốc gia</label>
                                            <Select value={selectedCountry} onValueChange={(val) => handleFilterChange('country', val)}>
                                                <SelectTrigger className="h-9 sm:h-10 bg-background/50 border-border/40 text-xs sm:text-sm rounded-lg">
                                                    <SelectValue placeholder="Tất cả" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Tất cả</SelectItem>
                                                    {countries.map((country) => (
                                                        <SelectItem key={country._id} value={country.slug} className="text-xs sm:text-sm">{country.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">Năm</label>
                                            <Select value={selectedYear} onValueChange={(val) => handleFilterChange('year', val)}>
                                                <SelectTrigger className="h-9 sm:h-10 bg-background/50 border-border/40 text-xs sm:text-sm rounded-lg">
                                                    <SelectValue placeholder="Tất cả" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {years.map((year) => (
                                                        <SelectItem key={year.value} value={year.value} className="text-xs sm:text-sm">{year.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">Định dạng</label>
                                            <Select value={selectedLanguage} onValueChange={(val) => handleFilterChange('language', val)}>
                                                <SelectTrigger className="h-9 sm:h-10 bg-background/50 border-border/40 text-xs sm:text-sm rounded-lg">
                                                    <SelectValue placeholder="Tất cả" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {languages.map((lang) => (
                                                        <SelectItem key={lang.value} value={lang.value} className="text-xs sm:text-sm">{lang.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 pt-4 border-t border-border/30 flex flex-col sm:flex-row items-center gap-3 justify-end">
                                        <div className="flex w-full sm:w-auto items-center gap-2">
                                            <label className="text-xs text-muted-foreground shrink-0 hidden sm:block">Sắp xếp:</label>
                                            <Select value={sortBy} onValueChange={(val) => handleFilterChange('sort_field', val)}>
                                                <SelectTrigger className="h-8 w-full sm:w-[140px] text-xs bg-background/30 rounded-md border-border/30">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {sortOptions.map((opt) => (
                                                        <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Select value={sortType} onValueChange={(val) => handleFilterChange('sort_type', val)}>
                                                <SelectTrigger className="h-8 w-[100px] sm:w-[110px] text-xs bg-background/30 rounded-md border-border/30 shrink-0">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {sortTypes.map((type) => (
                                                        <SelectItem key={type.value} value={type.value} className="text-xs">{type.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>

            {/* Active Filters Summary */}
            {hasActiveFilters && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2 animate-in fade-in">
                    {searchQuery && <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] sm:text-xs px-3">{searchQuery}</Badge>}
                    {selectedGenre !== 'all' && <Badge variant="outline" className="border-border/50 bg-card/30 text-[10px] sm:text-xs">Thể loại: {genres.find(g => g.slug === selectedGenre)?.name}</Badge>}
                    {selectedCountry !== 'all' && <Badge variant="outline" className="border-border/50 bg-card/30 text-[10px] sm:text-xs">QG: {countries.find(c => c.slug === selectedCountry)?.name}</Badge>}
                    {selectedYear !== 'all' && <Badge variant="outline" className="border-border/50 bg-card/30 font-mono text-[10px] sm:text-xs">{selectedYear}</Badge>}
                    
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[10px] h-6 px-2 text-muted-foreground hover:text-danger rounded-full"
                        onClick={() => router.push('/search')}
                    >
                        Xóa tuỳ chọn
                    </Button>
                </div>
            )}

            <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent my-8 opacity-50" />

            {/* Search Results Display Area */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl sm:text-2xl font-bold font-jost">
                        {hasActiveFilters ? 'Kết quả truy xuất' : 'Nổi bật gần đây'}
                    </h2>
                    <div className="flex items-center gap-1.5 text-muted-foreground bg-card/50 px-3 py-1 rounded-full border border-border/40">
                        <SlidersHorizontal className="h-3 w-3" />
                        <span className="text-[11px] sm:text-xs font-mono">{totalResults} phim</span>
                    </div>
                </div>

                {loading || isPending ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-5">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="space-y-3">
                                <Skeleton className="w-full aspect-[2/3] rounded-xl bg-muted/40" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-5/6 bg-muted/40" />
                                    <Skeleton className="h-3 w-1/2 bg-muted/40" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 rounded-full bg-danger/10 text-danger flex items-center justify-center mb-4">
                            <span className="text-3xl">😔</span>
                        </div>
                        <h3 className="text-xl font-bold mb-2 font-jost">Oops! Có lỗi xảy ra</h3>
                        <p className="text-muted-foreground text-sm max-w-md mb-6">{error}</p>
                        <Button className="rounded-full px-8 bg-gradient-to-r from-primary to-secondary" onClick={() => router.push('/search')}>Thử lại</Button>
                    </div>
                ) : searchResults.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-5">
                        {searchResults.map((movie) => (
                            <MovieCard key={movie._id} movie={movie} />
                        ))}
                    </div>
                ) : hasActiveFilters ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/60 rounded-3xl bg-card/20">
                        <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                            <Search className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-xl font-bold mb-2 font-jost text-foreground">Không tìm thấy nội dung</h3>
                        <p className="text-muted-foreground text-sm max-w-md">
                            Rất tiếc, dải ngân hà điện ảnh của chúng tôi chưa ghi nhận tư liệu nào tương ứng với các bộ lọc của bạn.
                        </p>
                        <Button 
                            variant="outline" 
                            className="mt-6 rounded-full border-border/50 hover:bg-card"
                            onClick={() => router.push('/search')}
                        >
                            Huỷ bỏ hệ bộ lọc
                        </Button>
                    </div>
                ) : null}
            </div>
        </div>
    )
}