'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MovieGrid } from '@/components/ui/MovieGrid'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { fetchMoviesByCategory, fetchGenres, Movie, Genre, CategoryApiResponse } from '@/lib/api'
import { ChevronLeft, ChevronRight, Film } from 'lucide-react'
import Link from 'next/link'

interface GenreDetailPageProps {
  genreSlug: string
  initialPage?: number
}

export function GenreDetailPage({ genreSlug, initialPage = 1 }: GenreDetailPageProps) {
  // State management
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(1)
  const [genreName, setGenreName] = useState<string>('')

  // Load genre name
  useEffect(() => {
    const loadGenreName = async () => {
      try {
        const genres = await fetchGenres()
        const genre = genres.find(g => g.slug === genreSlug)
        setGenreName(genre?.name || 'Thể loại')
      } catch (err) {
        console.error('Error loading genre name:', err)
        setGenreName('Thể loại')
      }
    }
    loadGenreName()
  }, [genreSlug])

  // Load movies
  useEffect(() => {
    const loadMovies = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response: CategoryApiResponse = await fetchMoviesByCategory(genreSlug, {
          page: currentPage,
          limit: 24,
          sort_field: 'modified.time',
          sort_type: 'desc'
        })

        if (response.status && response.data?.items) {
          setMovies(response.data.items)
          if (response.data?.params?.pagination) {
            setTotalPages(response.data.params.pagination.totalPages)
          }
        } else {
          setError('Không thể tải danh sách phim')
        }
      } catch (err) {
        console.error('Error loading movies:', err)
        setError('Có lỗi xảy ra khi tải dữ liệu')
      } finally {
        setLoading(false)
      }
    }

    loadMovies()
  }, [genreSlug, currentPage])

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Loading state
  if (loading && movies.length === 0) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Breadcrumb skeleton */}
        <div className="flex items-center space-x-2 text-sm">
          <Skeleton className="h-4 w-16" />
          <span className="text-muted-foreground">/</span>
          <Skeleton className="h-4 w-20" />
          <span className="text-muted-foreground">/</span>
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Header skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[2/3] w-full rounded-lg" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12 space-y-4">
          <div className="text-6xl">😔</div>
          <h2 className="text-2xl font-bold">Oops! Có lỗi xảy ra</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Thử lại
          </Button>
        </div>
      </div>
    )
  }

  // Empty state
  if (!loading && movies.length === 0) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12 space-y-4">
          <div className="text-6xl">🎬</div>
          <h2 className="text-2xl font-bold">Chưa có phim nào</h2>
          <p className="text-muted-foreground">
            Thể loại này hiện chưa có phim nào. Vui lòng quay lại sau!
          </p>
          <Link href="/">
            <Button>Về trang chủ</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          Trang chủ
        </Link>
        <span>/</span>
        <Link href="/#genres" className="hover:text-foreground transition-colors">
          Thể loại
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{genreName}</span>
      </nav>

      {/* Header */}
      <div className="space-y-2">
        <SectionHeader
          title={`Phim ${genreName}`}
          subtitle={`Khám phá ${movies.length} bộ phim thuộc thể loại ${genreName.toLowerCase()}`}
          icon={Film}
          showViewAll={false}
        />
      </div>

      {/* Movies Grid */}
      <MovieGrid movies={movies} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4 py-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
            className="flex items-center space-x-2"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Trước</span>
          </Button>

          <div className="flex items-center space-x-2">
            {/* Show page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                  disabled={loading}
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
            disabled={currentPage >= totalPages || loading}
            className="flex items-center space-x-2"
          >
            <span>Sau</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Current page info */}
      <div className="text-center text-sm text-muted-foreground">
        Trang {currentPage} / {totalPages}
        {loading && <span className="ml-2">Đang tải...</span>}
      </div>
    </div>
  )
} 