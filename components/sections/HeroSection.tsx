'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Info, Star, Calendar, Clock, ChevronLeft, ChevronRight, Pause, Play as PlayIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Movie, fetchNewMovies } from '@/lib/api'

interface HeroMovie extends Movie {
    displayRating?: number
}

export function HeroSection() {
    const [movies, setMovies] = useState<HeroMovie[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isPlaying, setIsPlaying] = useState(true)

    // Load multiple pages of movies for variety
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
            
            // Filter movies with good ratings and complete data
            const featuredMovies = allMovies
                .filter(movie => 
                    movie.poster_url && 
                    movie.thumb_url && 
                    movie.name &&
                    movie.tmdb?.vote_average !== undefined
                )
                .slice(0, 10) // Take first 10 quality movies
                .map(movie => ({
                    ...movie,
                    displayRating: movie.tmdb?.vote_average || Math.random() * 3 + 6 // Fallback rating 6-9
                }))
            
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
        }, 6000) // 6 seconds per slide
        
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
        // Use thumb_url as backdrop, fallback to poster_url
        return movie.thumb_url || movie.poster_url
    }

    const getMovieGenres = (movie: HeroMovie) => {
        if (movie.category && movie.category.length > 0) {
            return movie.category.slice(0, 3).map(cat => cat.name)
        }
        return ['Phim mới']
    }

    if (loading) {
        return (
            <div className="relative h-[70vh] min-h-[500px] overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 animate-pulse">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white text-xl">Đang tải phim nổi bật...</div>
                </div>
            </div>
        )
    }

    if (error || !currentMovie) {
        return (
            <div className="relative h-[70vh] min-h-[500px] overflow-hidden rounded-2xl bg-gradient-to-br from-red-900 to-red-800">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white text-xl text-center">
                        <p>{error || 'Không có dữ liệu phim'}</p>
                        <Button onClick={loadMovies} className="mt-4" variant="outline">
                            Thử lại
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="relative h-[70vh] min-h-[500px] overflow-hidden rounded-2xl group">
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
            <div className="absolute inset-y-0 left-4 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={prevSlide}
                    className="h-12 w-12 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm"
                >
                    <ChevronLeft className="h-6 w-6" />
                </Button>
            </div>
            
            <div className="absolute inset-y-0 right-4 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={nextSlide}
                    className="h-12 w-12 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm"
                >
                    <ChevronRight className="h-6 w-6" />
                </Button>
            </div>

            {/* Play/Pause Control */}
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={togglePlayPause}
                    className="h-10 w-10 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm"
                >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                </Button>
            </div>
            
            {/* Content */}
            <div className="relative h-full flex items-center">
                <div className="container mx-auto px-4">
                    <div className="max-w-2xl space-y-6">
                        {/* Movie Info */}
                        <div className="flex items-center space-x-4 text-white/80">
                            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                                <Star className="h-3 w-3 mr-1 fill-current" />
                                {currentMovie.displayRating?.toFixed(1)}
                            </Badge>
                            <span className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {currentMovie.year}
                            </span>
                            <span className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                {currentMovie.time || 'N/A'}
                            </span>
                            <Badge variant="outline" className="text-white border-white/30">
                                {currentMovie.quality}
                            </Badge>
                        </div>

                        {/* Title */}
                        <div className="space-y-2">
                            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight transition-all duration-500">
                                {currentMovie.name}
                            </h1>
                            {currentMovie.origin_name && currentMovie.origin_name !== currentMovie.name && (
                                <p className="text-xl text-white/60">{currentMovie.origin_name}</p>
                            )}
                        </div>

                        {/* Genres */}
                        <div className="flex flex-wrap gap-2">
                            {getMovieGenres(currentMovie).map((genre) => (
                                <Badge key={genre} variant="outline" className="text-white border-white/30">
                                    {genre}
                                </Badge>
                            ))}
                        </div>

                        {/* Description */}
                        {currentMovie.content && (
                            <p className="text-lg text-white/90 leading-relaxed line-clamp-3">
                                {currentMovie.content}
                            </p>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button 
                                size="lg" 
                                className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white border-0 shadow-lg"
                            >
                                <Play className="h-5 w-5 mr-2" />
                                Xem ngay
                            </Button>
                            <Button 
                                size="lg" 
                                variant="outline" 
                                className="border-white/30 text-white hover:bg-white/10"
                            >
                                <Info className="h-5 w-5 mr-2" />
                                Thông tin chi tiết
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Slide Indicators */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                <div className="flex space-x-2">
                    {movies.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                index === currentIndex 
                                    ? 'bg-white w-8' 
                                    : 'bg-white/40 hover:bg-white/60'
                            }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}