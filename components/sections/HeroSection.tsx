'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Info, Star, Calendar, Clock, ChevronLeft, ChevronRight, Pause, Play as PlayIcon, Heart, Share2 } from 'lucide-react'
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
    const [isPlaying, setIsPlaying] = useState(true)
    const [isLiked, setIsLiked] = useState(false)

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
            
            // Lọc ra phim có content và loại bỏ null/undefined, ép về đúng HeroMovie
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
        if (!isPlaying || movies.length === 0) return
        
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % movies.length)
        }, 6000)
        
        return () => clearInterval(interval)
    }, [isPlaying, movies.length])

    // Load movies on mount
    useEffect(() => {
        loadMovies()
    }, [loadMovies])

    const currentMovie = movies[currentIndex]

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % movies.length)
    }

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + movies.length) % movies.length)
    }

    const togglePlayPause = () => {
        setIsPlaying(!isPlaying)
    }

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
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            
            {/* Navigation Controls */}
            <div className="absolute inset-y-0 left-2 sm:left-4 flex items-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={prevSlide}
                    className="shiny-button h-10 w-10 sm:h-14 sm:w-14 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-110"
                >
                    <ChevronLeft className="h-5 w-5 sm:h-7 sm:w-7" />
                </Button>
            </div>
            
            <div className="absolute inset-y-0 right-2 sm:right-4 flex items-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={nextSlide}
                    className="shiny-button h-10 w-10 sm:h-14 sm:w-14 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-110"
                >
                    <ChevronRight className="h-5 w-5 sm:h-7 sm:w-7" />
                </Button>
            </div>

            {/* Top Controls */}
            <div className="absolute top-4 sm:top-6 right-4 sm:right-6 flex items-center gap-2 sm:gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                {/* Play/Pause Control */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={togglePlayPause}
                    className="shiny-button h-10 w-10 sm:h-12 sm:w-12 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-110"
                >
                    {isPlaying ? <Pause className="h-4 w-4 sm:h-5 sm:w-5" /> : <PlayIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
                </Button>

                {/* Like Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsLiked(!isLiked)}
                    className="shiny-button h-10 w-10 sm:h-12 sm:w-12 bg-black/20 hover:bg-red-500/80 text-white rounded-full backdrop-blur-sm border border-white/20 hover:border-red-500/40 transition-all duration-300 hover:scale-110"
                >
                    <Heart className={`h-4 w-4 sm:h-5 sm:w-5 transition-all duration-300 ${isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-white'}`} />
                </Button>

                {/* Share Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="shiny-button h-10 w-10 sm:h-12 sm:w-12 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-110"
                >
                    <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
            </div>
            
            {/* Content */}
            <div className="relative h-full flex items-center">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="max-w-xl lg:max-w-2xl space-y-3 sm:space-y-4 lg:space-y-6">
                        {/* Movie Info */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-4 text-white/80">
                            <Badge className={`bg-gradient-to-r ${getRatingColor(currentMovie.displayRating || 0)} text-white border-0 text-xs sm:text-sm shadow-lg`}>
                                <Star className="h-2 w-2 sm:h-3 sm:w-3 mr-1 fill-current" />
                                {currentMovie.displayRating?.toFixed(1)}
                            </Badge>
                            <span className="flex items-center text-xs sm:text-sm bg-black/20 px-2 py-1 rounded-full backdrop-blur-sm">
                                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                {currentMovie.year}
                            </span>
                            <span className="flex items-center text-xs sm:text-sm bg-black/20 px-2 py-1 rounded-full backdrop-blur-sm">
                                <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                {currentMovie.time || 'Đang cập nhật'}
                            </span>
                            <Badge variant="outline" className="text-white border-white/30 text-xs sm:text-sm bg-black/20 backdrop-blur-sm">
                                {getTypeLabel(currentMovie.type)}
                            </Badge>
                            <Badge variant="outline" className="text-white border-white/30 text-xs sm:text-sm bg-black/20 backdrop-blur-sm">
                                {currentMovie.quality}
                            </Badge>
                        </div>

                        {/* Title */}
                        <div className="space-y-1 sm:space-y-2">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight transition-all duration-500 shiny-text">
                                {currentMovie.name}
                            </h1>
                            {currentMovie.origin_name && currentMovie.origin_name !== currentMovie.name && (
                                <p className="text-sm sm:text-lg lg:text-xl text-white/60">{currentMovie.origin_name}</p>
                            )}
                        </div>

                        {/* Genres */}
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                            {getMovieGenres(currentMovie).map((genre) => (
                                <Badge key={genre} variant="outline" className="text-white border-white/30 text-xs sm:text-sm bg-black/20 backdrop-blur-sm">
                                    {genre}
                                </Badge>
                            ))}
                        </div>

                        {/* Description */}
                        {currentMovie.content && (
                            <p className="text-sm sm:text-base lg:text-lg text-white/90 leading-relaxed line-clamp-2 sm:line-clamp-3 bg-black/20 p-3 sm:p-4 rounded-lg backdrop-blur-sm">
                                {currentMovie.content}
                            </p>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:gap-4">
                            <Link href={`/movie/${currentMovie.slug}`}>
                                <Button 
                                    size="sm"
                                    className="shiny-button w-full sm:w-auto bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white border-0 shadow-lg text-xs sm:text-sm lg:text-base h-10 sm:h-12 lg:h-14 px-6 sm:px-8 font-semibold transition-all duration-300 hover:scale-105"
                                >
                                    <Play className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 mr-2" />
                                    Xem ngay
                                </Button>
                            </Link>
                            <Button 
                                size="sm"
                                variant="outline" 
                                className="shiny-button w-full sm:w-auto border-white/30 text-white hover:bg-white/10 text-xs sm:text-sm lg:text-base h-10 sm:h-12 lg:h-14 px-6 sm:px-8 font-semibold backdrop-blur-sm transition-all duration-300 hover:scale-105"
                            >
                                <Info className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 mr-2" />
                                Chi tiết
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Slide Indicators */}
            <div className="absolute bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2">
                <div className="flex space-x-2 sm:space-x-3 bg-black/20 p-2 sm:p-3 rounded-full backdrop-blur-sm">
                    {movies.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={`transition-all duration-300 rounded-full ${
                                index === currentIndex 
                                    ? 'bg-white w-6 sm:w-10 h-2 sm:h-3' 
                                    : 'bg-white/40 hover:bg-white/60 w-2 sm:w-3 h-2 sm:h-3'
                            }`}
                        />
                    ))}
                </div>
            </div>

            {/* Related Movies Thumbnails */}
            <div className="absolute bottom-6 sm:bottom-8 right-6 sm:right-8 hidden lg:flex space-x-2 bg-black/20 p-2 rounded-lg backdrop-blur-sm">
                {movies.slice(1, 7).map((movie, index) => (
                    <button
                        key={movie._id}
                        onClick={() => setCurrentIndex(index + 1)}
                        className="w-12 h-16 sm:w-16 sm:h-20 rounded overflow-hidden opacity-60 hover:opacity-100 transition-all duration-300 border-2 border-transparent hover:border-white hover:scale-105"
                    >
                        <img
                            src={getImageUrl(movie.poster_url)}
                            alt={movie.name}
                            className="w-full h-full object-cover"
                        />
                    </button>
                ))}
            </div>
        </div>
    )
}