'use client'

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MovieCard } from '@/components/ui/MovieCard'
import { Search, Filter, SlidersHorizontal } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function SearchPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedGenre, setSelectedGenre] = useState('all')
    const [selectedYear, setSelectedYear] = useState('all')
    const [sortBy, setSortBy] = useState('popularity')

    // Mock search results
    const searchResults = [
        {
            id: 1,
            title: "Spider-Man: No Way Home",
            poster: "https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",
            rating: 8.2,
            year: 2021,
            genres: ["Hành động", "Phiêu lưu"],
            description: "Peter Parker's secret identity is revealed to the entire world..."
        },
        // Add more mock results...
    ]

    const genres = [
        { value: 'all', label: 'Tất cả thể loại' },
        { value: 'action', label: 'Hành động' },
        { value: 'comedy', label: 'Hài' },
        { value: 'drama', label: 'Chính kịch' },
        { value: 'horror', label: 'Kinh dị' },
        { value: 'romance', label: 'Tình cảm' },
        { value: 'sci-fi', label: 'Khoa học viễn tưởng' },
    ]

    const years = [
        { value: 'all', label: 'Tất cả năm' },
        { value: '2024', label: '2024' },
        { value: '2023', label: '2023' },
        { value: '2022', label: '2022' },
        { value: '2021', label: '2021' },
        { value: '2020', label: '2020' },
    ]

    const sortOptions = [
        { value: 'popularity', label: 'Phổ biến nhất' },
        { value: 'rating', label: 'Đánh giá cao' },
        { value: 'newest', label: 'Mới nhất' },
        { value: 'oldest', label: 'Cũ nhất' },
        { value: 'title', label: 'Tên phim A-Z' },
    ]

    return (
        <div className="space-y-8">
            {/* Search Header */}
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold shiny-text">Tìm kiếm phim</h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Khám phá hàng ngàn bộ phim với công cụ tìm kiếm thông minh
                </p>
            </div>

            {/* Search Form */}
            <Card className="border-0 bg-gradient-to-br from-card/80 via-card to-card/60 backdrop-blur-xl shadow-lg">
                <CardContent className="p-6 space-y-6">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Nhập tên phim, diễn viên, đạo diễn..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-12 text-base bg-background/50 border-border/50 focus:border-primary/50"
                        />
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                            <SelectTrigger className="h-11 bg-background/50 border-border/50">
                                <SelectValue placeholder="Thể loại" />
                            </SelectTrigger>
                            <SelectContent>
                                {genres.map((genre) => (
                                    <SelectItem key={genre.value} value={genre.value}>
                                        {genre.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="h-11 bg-background/50 border-border/50">
                                <SelectValue placeholder="Năm phát hành" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map((year) => (
                                    <SelectItem key={year.value} value={year.value}>
                                        {year.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="h-11 bg-background/50 border-border/50">
                                <SelectValue placeholder="Sắp xếp theo" />
                            </SelectTrigger>
                            <SelectContent>
                                {sortOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button 
                            className="h-11 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                        >
                            <Filter className="h-4 w-4 mr-2" />
                            Tìm kiếm
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Search Results */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">
                        Kết quả tìm kiếm {searchQuery && `cho "${searchQuery}"`}
                    </h2>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <SlidersHorizontal className="h-4 w-4" />
                        <span>Tìm thấy {searchResults.length} kết quả</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {searchResults.map((movie) => (
                        <MovieCard key={movie.id} movie={movie} />
                    ))}
                </div>
            </div>
        </div>
    )
}