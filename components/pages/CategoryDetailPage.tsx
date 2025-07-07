'use client'

import React, { useEffect, useState } from 'react'
import { MovieGrid } from '@/components/ui/MovieGrid'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Filter, Grid, List } from 'lucide-react'
import { fetchMoviesByCategorySlug, getCategoryInfo } from '@/lib/api'
import type { Movie, Category } from '@/lib/api'

interface CategoryDetailPageProps {
  categorySlug: string
  initialPage?: number
}

export function CategoryDetailPage({ categorySlug, initialPage = 1 }: CategoryDetailPageProps) {
    const [movies, setMovies] = useState<Movie[]>([])
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(initialPage)
    const [totalPages, setTotalPages] = useState(1)
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [category, setCategory] = useState<Category | null>(null)

    // Get category info
    useEffect(() => {
        const categoryInfo = getCategoryInfo(categorySlug)
        setCategory(categoryInfo)
    }, [categorySlug])

    // Load movies
    useEffect(() => {
        const loadMovies = async () => {
            try {
                setLoading(true)
                const response = await fetchMoviesByCategorySlug(categorySlug, currentPage, 24)
                setMovies(response.data?.items || [])
                setTotalPages(response.data?.params?.pagination?.totalPages || 1)
            } catch (error) {
                console.error('Error fetching movies:', error)
                setMovies([])
            } finally {
                setLoading(false)
            }
        }

        loadMovies()
    }, [categorySlug, currentPage])

    // Handle pagination
    const handlePageChange = (page: number) => {
        setCurrentPage(page)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // Generate page numbers for pagination
    const getVisiblePages = () => {
        const delta = 2
        const range = []
        const rangeWithDots = []

        for (let i = Math.max(2, currentPage - delta); 
             i <= Math.min(totalPages - 1, currentPage + delta); 
             i++) {
            range.push(i)
        }

        if (currentPage - delta > 2) {
            rangeWithDots.push(1, '...')
        } else {
            rangeWithDots.push(1)
        }

        rangeWithDots.push(...range)

        if (currentPage + delta < totalPages - 1) {
            rangeWithDots.push('...', totalPages)
        } else {
            rangeWithDots.push(totalPages)
        }

        return rangeWithDots.filter((item, index, arr) => arr.indexOf(item) === index)
    }

    if (!category) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-destructive mb-4">Danh mục không tồn tại</h1>
                    <p className="text-muted-foreground">Danh mục phim bạn tìm kiếm không có trong hệ thống.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header Section */}
            <div className="relative bg-gradient-to-b from-primary/10 via-primary/5 to-background border-b border-border">
                <div className="container mx-auto px-4 py-8 lg:py-12">
                    <div className="max-w-4xl">
                        {/* Breadcrumb */}
                        <nav className="mb-6 text-sm">
                            <ol className="flex items-center space-x-2 text-muted-foreground">
                                <li><a href="/" className="hover:text-primary transition-colors">Trang chủ</a></li>
                                <li className="mx-2">/</li>
                                <li className="text-foreground font-medium">{category.name}</li>
                            </ol>
                        </nav>

                        {/* Title & Description */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
                                    {category.name}
                                </h1>
                                <Badge variant="secondary" className="ml-2">
                                    {category.type === 'country' ? 'Quốc gia' : 'Thể loại'}
                                </Badge>
                            </div>
                            <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
                                {category.description}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="container mx-auto px-4 py-8">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-semibold">
                            Tìm thấy {movies.length > 0 ? `${movies.length} phim` : 'phim'} 
                        </h2>
                        {currentPage > 1 && (
                            <Badge variant="outline">
                                Trang {currentPage}/{totalPages}
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* View Mode Toggle */}
                        <div className="flex items-center border border-border rounded-lg p-1">
                            <Button
                                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('grid')}
                                className="h-8 px-3"
                            >
                                <Grid className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('list')}
                                className="h-8 px-3"
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Filter Button */}
                        <Button variant="outline" size="sm" className="h-8">
                            <Filter className="h-4 w-4 mr-2" />
                            Lọc
                        </Button>
                    </div>
                </div>

                {/* Movies Grid */}
                <MovieGrid 
                    movies={movies} 
                    loading={loading}
                    variant="hover-expand"
                    className={viewMode === 'list' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : undefined}
                />

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-12 flex justify-center">
                        <nav className="flex items-center space-x-2">
                            {/* Previous Button */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage <= 1}
                                className="flex items-center gap-2"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Trước
                            </Button>

                            {/* Page Numbers */}
                            <div className="flex items-center space-x-1">
                                {getVisiblePages().map((page, index) => (
                                    page === '...' ? (
                                        <span key={`dots-${index}`} className="px-3 py-2 text-muted-foreground">
                                            ...
                                        </span>
                                    ) : (
                                        <Button
                                            key={page}
                                            variant={currentPage === page ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => handlePageChange(page as number)}
                                            className="w-10 h-10"
                                        >
                                            {page}
                                        </Button>
                                    )
                                ))}
                            </div>

                            {/* Next Button */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage >= totalPages}
                                className="flex items-center gap-2"
                            >
                                Sau
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </nav>
                    </div>
                )}

                {/* Empty State */}
                {!loading && movies.length === 0 && (
                    <div className="text-center py-12">
                        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                            <Filter className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Không tìm thấy phim</h3>
                        <p className="text-muted-foreground">
                            Hiện tại chưa có phim nào trong danh mục này. Vui lòng quay lại sau.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
} 