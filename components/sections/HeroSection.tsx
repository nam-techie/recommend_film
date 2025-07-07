'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Info, Star, Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
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
    const [isTransitioning, setIsTransitioning] = useState(false)

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
            
            // Get top 12 movies for optimization
            const topMovies = allMovies.slice(0, 12)
            
            // Get movie details for content
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
            
            // Filter movies with content
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

    // Handle slide change with smooth transition
    const changeSlide = useCallback((newIndex: number) => {
        if (isTransitioning || newIndex === currentIndex) return
        
        setIsTransitioning(true)
        setCurrentIndex(newIndex)
        
        setTimeout(() => {
            setIsTransitioning(false)
        }, 1000)
    }, [currentIndex, isTransitioning])

    // Auto-slide functionality
    useEffect(() => {
        if (movies.length === 0) return
        
        const interval = setInterval(() => {
            changeSlide((currentIndex + 1) % movies.length)
        }, 8000)
        
        return () => clearInterval(interval)
    }, [movies.length, currentIndex, changeSlide])

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
            <div className="relative h-[50vh] sm:h-[60vh] lg:h-[80vh] min-h-[500px] overflow-hidden rounded-xl lg:rounded-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 animate-pulse">
                    <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-white text-lg sm:text-xl animate-pulse">Đang tải phim nổi bật...</div>
                    </div>
                </div>
            </div>
        )
    }

    if (error || !currentMovie) {
        return (
            <div className="relative h-[50vh] sm:h-[60vh] lg:h-[80vh] min-h-[500px] overflow-hidden rounded-xl lg:rounded-2xl bg-gradient-to-br from-red-900 to-red-800">
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
        <div className="relative h-[50vh] sm:h-[60vh] lg:h-[80vh] min-h-[500px] overflow-hidden rounded-xl lg:rounded-2xl group">
            {/* Background Images with Smooth Transition */}
            <div className="absolute inset-0">
                {movies.map((movie, index) => (
                    <div
                        key={movie._id}
                        className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                            index === currentIndex 
                                ? 'opacity-100 scale-100' 
                                : 'opacity-0 scale-105'
                        }`}
                    >
                        <div 
                            className="w-full h-full bg-cover bg-center bg-no-repeat"
                            style={{ 
                                backgroundImage: `url(${getMovieBackdrop(movie)})`,
                                filter: index === currentIndex ? 'none' : 'blur(2px)'
                            }}
                        />
                    </div>
                ))}
            </div>
            
            {/* Enhanced Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50" />
            
            {/* Navigation Arrows */}
            <button
                onClick={() => changeSlide((currentIndex - 1 + movies.length) % movies.length)}
                disabled={isTransitioning}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-all duration-300 opacity-0 group-hover:opacity-100 disabled:opacity-50"
            >
                <ChevronLeft className="h-6 w-6" />
            </button>
            
            <button
                onClick={() => changeSlide((currentIndex + 1) % movies.length)}
                disabled={isTransitioning}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-all duration-300 opacity-0 group-hover:opacity-100 disabled:opacity-50"
            >
                <ChevronRight className="h-6 w-6" />
            </button>
            
            {/* Content with Smooth Animation */}
            <div className="relative h-full flex items-center z-20">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className={`max-w-2xl lg:max-w-3xl space-y-4 lg:space-y-6 transition-all duration-1000 ${
                        isTransitioning ? 'opacity-0 transform translate-y-8' : 'opacity-100 transform translate-y-0'
                    }`}>
                        {/* Movie Rating & Info Row */}
                        <div className="flex flex-wrap items-center gap-3 lg:gap-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                            <Badge className={`bg-gradient-to-r ${getRatingColor(currentMovie.displayRating || 0)} text-white border-0 font-bold px-4 py-2 text-sm shadow-lg`}>
                                <Star className="h-4 w-4 mr-2 fill-current" />
                                {currentMovie.displayRating?.toFixed(1)}
                            </Badge>
                            <Badge variant="outline" className="text-white border-white/50 bg-black/40 backdrop-blur-sm px-4 py-2 text-sm">
                                <Calendar className="h-4 w-4 mr-2" />
                                {currentMovie.year}
                            </Badge>
                            <Badge variant="outline" className="text-white border-white/50 bg-black/40 backdrop-blur-sm px-4 py-2 text-sm">
                                <Clock className="h-4 w-4 mr-2" />
                                {currentMovie.time || 'Đang cập nhật'}
                            </Badge>
                            <Badge variant="outline" className="text-white border-white/50 bg-black/40 backdrop-blur-sm px-4 py-2 text-sm">
                                {getTypeLabel(currentMovie.type)}
                            </Badge>
                        </div>

                        {/* Movie Title */}
                        <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-white leading-tight line-clamp-2 drop-shadow-2xl">
                                {currentMovie.name}
                            </h1>
                            {currentMovie.origin_name && currentMovie.origin_name !== currentMovie.name && (
                                <p className="text-lg sm:text-xl lg:text-3xl text-white/80 font-light line-clamp-1 drop-shadow-lg">
                                    {currentMovie.origin_name}
                                </p>
                            )}
                        </div>

                        {/* Genres */}
                        <div className="flex flex-wrap gap-2 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
                            {getMovieGenres(currentMovie).map((genre) => (
                                <Badge key={genre} variant="outline" className="text-white border-white/40 bg-black/30 backdrop-blur-sm px-3 py-1">
                                    {genre}
                                </Badge>
                            ))}
                        </div>

                        {/* Description */}
                        {currentMovie.content && (
                            <p className="text-sm sm:text-base lg:text-lg text-white/90 leading-relaxed line-clamp-3 max-w-2xl drop-shadow-lg animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
                                {currentMovie.content}
                            </p>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-4 pt-4 animate-fade-in-up" style={{ animationDelay: '1s' }}>
                            <Link href={`/movie/${currentMovie.slug}`}>
                                <Button 
                                    size="lg"
                                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold px-8 py-4 text-lg rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 transform"
                                >
                                    <Play className="h-6 w-6 mr-3 fill-current" />
                                    Xem ngay
                                </Button>
                            </Link>
                            
                            <Link href={`/movie/${currentMovie.slug}`}>
                                <Button 
                                    size="lg"
                                    variant="outline"
                                    className="text-white border-white/50 hover:bg-white/20 backdrop-blur-sm rounded-full px-8 py-4 text-lg transition-all duration-300 hover:scale-105 transform"
                                >
                                    <Info className="h-6 w-6 mr-3" />
                                    Chi tiết
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Slide Indicators */}
            <div className="absolute bottom-6 left-6 z-30">
                <div className="flex space-x-3">
                    {movies.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => changeSlide(index)}
                            disabled={isTransitioning}
                            className={`transition-all duration-500 rounded-full ${
                                index === currentIndex 
                                    ? 'bg-white w-12 h-3 shadow-lg' 
                                    : 'bg-white/40 hover:bg-white/60 w-3 h-3'
                            } disabled:opacity-50`}
                        />
                    ))}
                </div>
            </div>

            {/* Enhanced Related Movies Thumbnails */}
            <div className="absolute bottom-6 right-6 hidden xl:flex space-x-3 z-30">
                {movies.slice(1, 6).map((movie, index) => (
                    <button
                        key={movie._id}
                        onClick={() => changeSlide((currentIndex + index + 1) % movies.length)}
                        disabled={isTransitioning}
                        className="group relative w-20 h-28 rounded-lg overflow-hidden opacity-70 hover:opacity-100 transition-all duration-300 hover:scale-110 shadow-xl hover:shadow-2xl transform disabled:opacity-50"
                    >
                        <img
                            src={getImageUrl(movie.poster_url)}
                            alt={movie.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <Play className="w-6 h-6 text-white fill-current" />
                        </div>
                        <div className="absolute bottom-1 left-1 right-1">
                            <p className="text-xs text-white font-medium line-clamp-2 drop-shadow-lg">
                                {movie.name}
                            </p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    )
}