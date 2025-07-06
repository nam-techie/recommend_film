'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Info, Star, Calendar, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Movie, fetchNewMovies, getImageUrl, fetchMovieDetail } from '@/lib/api'
import Link from 'next/link'

interface HeroMovie extends Movie {
  displayRating?: number
}

export function HeroSection() {
    const [movies, setMovies] = useState<HeroMovie[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Load movies from API
    const loadMovies = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            
            // Load first 3 pages to get variety of movies
            const [page1, page2, page3] = await Promise.all([
                fetchNewMovies(1),
                fetchNewMovies(2),
                fetchNewMovies(3)
            ])
            
            const allMovies = [
                ...(page1.items || []),
                ...(page2.items || []),
                ...(page3.items || [])
            ]
            
            // Lấy tối đa 12 phim đầu tiên để tối ưu request
            const topMovies = allMovies.slice(0, 12)
            
            // Gọi API chi tiết để lấy content cho từng phim
            const moviesWithContent = await Promise.all(
                topMovies.map(async (movie) => {
                    try {
                        const detail = await fetchMovieDetail(movie.slug)
                        return {
                            ...movie,
                            content: detail.movie.content,
                            displayRating: detail.movie.tmdb?.vote_average || (Math.random() * 3 + 6)
                        }
                    } catch {
                        return null
                    }
                })
            )
            
            // Lọc ra phim có content và loại bỏ null/undefined
            const featuredMovies: HeroMovie[] = moviesWithContent
                .filter((m) => !!m && typeof m.content === 'string' && !!m.poster_url && !!m.thumb_url && !!m.name)
                .map((m) => ({ ...(m as HeroMovie), content: String(m!.content) }))
            
            setMovies(featuredMovies)
            
        } catch (err) {
            console.error('Error loading hero movies:', err)
            setError('Không thể tải dữ liệu phim')
        } finally {
            setLoading(false)
        }
    }, [])

    // Auto-slide functionality
    useEffect(() => {
        if (movies.length === 0) return
        
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % movies.length)
        }, 8000)
        
        return () => clearInterval(interval)
    }, [movies.length])

    // Load movies on mount
    useEffect(() => {
        loadMovies()
    }, [loadMovies])

    const currentMovie = movies[currentIndex]

    const getMovieBackdrop = (movie: HeroMovie) => {
        return getImageUrl(movie.thumb_url || movie.poster_url)
    }

    const getMovieGenres = (movie: HeroMovie) => {
        if (movie.category && movie.category.length > 0) {
            return movie.category.slice(0, 3).map(cat => cat.name)
        }
        return ['Phim mới']
    }

    const getRatingColor = (rating: number) => {
        if (rating >= 8) return 'from-green-500 to-emerald-500'
        if (rating >= 7) return 'from-yellow-500 to-orange-500'
        if (rating >= 6) return 'from-orange-500 to-red-500'
        return 'from-red-500 to-pink-500'
    }

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'single': return 'Phim lẻ'
            case 'series': return 'Phim bộ'
            case 'hoathinh': return 'Hoạt hình'
            default: return 'Phim'
        }
    }

    if (loading) {
        return (
            <div className="relative h-[50vh] sm:h-[60vh] lg:h-[70vh] min-h-[400px] overflow-hidden rounded-xl lg:rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 animate-pulse">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white text-lg sm:text-xl">Đang tải phim nổi bật...</div>
                </div>
            </div>
        )
    }

    if (error || !currentMovie) {
        return (
            <div className="relative h-[50vh] sm:h-[60vh] lg:h-[70vh] min-h-[400px] overflow-hidden rounded-xl lg:rounded-2xl bg-gradient-to-br from-red-900 to-red-800">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white text-center px-4">
                        <p className="text-lg sm:text-xl mb-4">{error || 'Không có dữ liệu phim'}</p>
                        <Button onClick={loadMovies} variant="outline" className="text-white border-white hover:bg-white/10">
                            Thử lại
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="relative h-[50vh] sm:h-[60vh] lg:h-[70vh] min-h-[400px] overflow-hidden rounded-xl lg:rounded-2xl group">
            {/* Background Image with Transition */}
            <div className="absolute inset-0">
                {movies.map((movie, index) => (
                    <div
                        key={movie._id}
                        className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ${
                            index === currentIndex ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{ backgroundImage: `url(${getMovieBackdrop(movie)})` }}
                    />
                ))}
            </div>
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            
            {/* Content */}
            <div className="relative h-full flex items-center">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="max-w-2xl lg:max-w-3xl space-y-4 lg:space-y-6">
                        {/* Movie Rating & Info Row */}
                        <div className="flex flex-wrap items-center gap-3 lg:gap-4">
                            <Badge className={`bg-gradient-to-r ${getRatingColor(currentMovie.displayRating || 0)} text-white border-0 font-bold px-3 py-1`}>
                                <Star className="h-3 w-3 mr-1 fill-current" />
                                {currentMovie.displayRating?.toFixed(1)}
                            </Badge>
                            <Badge variant="outline" className="text-white border-white/50 bg-black/30 backdrop-blur-sm px-3 py-1">
                                {currentMovie.year}
                            </Badge>
                            <Badge variant="outline" className="text-white border-white/50 bg-black/30 backdrop-blur-sm px-3 py-1">
                                {currentMovie.time || 'Đang cập nhật'}
                            </Badge>
                            <Badge variant="outline" className="text-white border-white/50 bg-black/30 backdrop-blur-sm px-3 py-1">
                                {getTypeLabel(currentMovie.type)}
                            </Badge>
                        </div>

                        {/* Movie Title */}
                        <div className="space-y-2">
                            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight line-clamp-2">
                                {currentMovie.name}
                            </h1>
                            {currentMovie.origin_name && currentMovie.origin_name !== currentMovie.name && (
                                <p className="text-lg sm:text-xl lg:text-2xl text-white/70 font-light line-clamp-1">
                                    {currentMovie.origin_name}
                                </p>
                            )}
                        </div>

                        {/* Genres */}
                        <div className="flex flex-wrap gap-2">
                            {getMovieGenres(currentMovie).map((genre) => (
                                <Badge key={genre} variant="outline" className="text-white border-white/40 bg-black/30 backdrop-blur-sm">
                                    {genre}
                                </Badge>
                            ))}
                        </div>

                        {/* Description */}
                        {currentMovie.content && (
                            <p className="text-sm sm:text-base lg:text-lg text-white/90 leading-relaxed line-clamp-3 max-w-2xl">
                                {currentMovie.content}
                            </p>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-4">
                            <Link href={`/movie/${currentMovie.slug}`}>
                                <Button 
                                    size="lg"
                                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold px-8 py-3 text-lg rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
                                >
                                    <Play className="h-6 w-6 mr-2 fill-current" />
                                    Xem ngay
                                </Button>
                            </Link>
                            
                            <Link href={`/movie/${currentMovie.slug}`}>
                                <Button 
                                    size="lg"
                                    variant="outline"
                                    className="text-white border-white/50 hover:bg-white/20 rounded-full px-6 py-3 transition-all duration-300 hover:scale-105"
                                >
                                    <Info className="h-6 w-6 mr-2" />
                                    Chi tiết
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Slide Indicators */}
            <div className="absolute bottom-6 left-6">
                <div className="flex space-x-2">
                    {movies.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={`transition-all duration-300 rounded-full ${
                                index === currentIndex 
                                    ? 'bg-white w-8 h-2' 
                                    : 'bg-white/40 hover:bg-white/60 w-2 h-2'
                            }`}
                        />
                    ))}
                </div>
            </div>

            {/* Related Movies Thumbnails */}
            <div className="absolute bottom-6 right-6 hidden lg:flex space-x-2">
                {movies.slice(1, 7).map((movie, index) => (
                    <Link
                        key={movie._id}
                        href={`/movie/${movie.slug}`}
                        className="group relative w-16 h-20 rounded-lg overflow-hidden opacity-70 hover:opacity-100 transition-all duration-300 hover:scale-105 shadow-lg"
                    >
                        <img
                            src={getImageUrl(movie.poster_url)}
                            alt={movie.name}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <Play className="w-6 h-6 text-white" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}