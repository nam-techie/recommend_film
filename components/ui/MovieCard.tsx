'use client'

import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
    Star, 
    Calendar, 
    Clock, 
    Heart,
    Bookmark,
    Info,
    Play
} from 'lucide-react'
import { Movie, getImageUrl } from '@/lib/api'
import Link from 'next/link'

interface MovieCardProps {
    movie: Movie
    variant?: 'default' | 'hover-expand'
}

export function MovieCard({ 
    movie, 
    variant = 'hover-expand'
}: MovieCardProps) {
    const [isLiked, setIsLiked] = useState(false)
    const [isBookmarked, setIsBookmarked] = useState(false)
    const [imageLoaded, setImageLoaded] = useState(false)

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

    const rating = movie.tmdb?.vote_average || 0

    if (variant === 'hover-expand') {
        return (
            <div className="group relative cursor-pointer">
                {/* Main Card Container */}
                <div className="relative overflow-hidden rounded-lg bg-card border border-border/50 transition-all duration-500 ease-out group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-primary/30 group-hover:z-50">
                    {/* Poster Image */}
                    <div className="relative aspect-[2/3] overflow-hidden">
                        {!imageLoaded && (
                            <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/50 to-muted animate-pulse" />
                        )}
                        <img
                            src={getImageUrl(movie.poster_url)}
                            alt={movie.name}
                            className={`w-full h-full object-cover transition-all duration-700 ${
                                imageLoaded ? 'opacity-100' : 'opacity-0'
                            }`}
                            onLoad={() => setImageLoaded(true)}
                            loading="lazy"
                        />
                        
                        {/* Dark Overlay on Hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/30 opacity-0 group-hover:opacity-100 transition-all duration-500" />
                        
                        {/* Rating Badge - Always Visible */}
                        {rating > 0 && (
                            <div className="absolute top-3 left-3 z-10">
                                <Badge className={`bg-gradient-to-r ${getRatingColor(rating)} text-white border-0 font-bold shadow-lg px-2 py-1`}>
                                    <Star className="h-3 w-3 mr-1 fill-current" />
                                    {rating.toFixed(1)}
                                </Badge>
                            </div>
                        )}

                        {/* Action Buttons - Show on Hover */}
                        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 delay-200 z-10">
                            <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-full bg-black/60 backdrop-blur-md border-0 hover:bg-red-500/80 transition-all duration-300"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setIsLiked(!isLiked)
                                }}
                            >
                                <Heart className={`h-4 w-4 transition-all duration-300 ${
                                    isLiked ? 'fill-red-500 text-red-500' : 'text-white'
                                }`} />
                            </Button>
                            <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-full bg-black/60 backdrop-blur-md border-0 hover:bg-blue-500/80 transition-all duration-300"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setIsBookmarked(!isBookmarked)
                                }}
                            >
                                <Bookmark className={`h-4 w-4 transition-all duration-300 ${
                                    isBookmarked ? 'fill-blue-500 text-blue-500' : 'text-white'
                                }`} />
                            </Button>
                        </div>

                        {/* Movie Info Overlay - Show on Hover */}
                        <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-all duration-500 z-10">
                            <div className="space-y-3">
                                {/* Movie Title */}
                                <div className="space-y-1">
                                    <h3 className="text-lg font-bold text-white line-clamp-2 leading-tight drop-shadow-lg">
                                        {movie.name}
                                    </h3>
                                    {movie.origin_name && movie.origin_name !== movie.name && (
                                        <p className="text-sm text-white/80 line-clamp-1 font-medium drop-shadow-lg">
                                            {movie.origin_name}
                                        </p>
                                    )}
                                </div>

                                {/* Movie Meta Info */}
                                <div className="flex items-center justify-between text-sm text-white/90">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-3 w-3" />
                                        <span className="drop-shadow-lg">{movie.year}</span>
                                    </div>
                                    {movie.time && (
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-3 w-3" />
                                            <span className="drop-shadow-lg">{movie.time}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Type Badge */}
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-black/60 text-white border-0 backdrop-blur-sm">
                                        {getTypeLabel(movie.type)}
                                    </Badge>
                                    <Badge variant="secondary" className="bg-black/60 text-white border-0 backdrop-blur-sm">
                                        {movie.quality}
                                    </Badge>
                                </div>

                                {/* Genres */}
                                {movie.category && movie.category.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {movie.category.slice(0, 3).map((genre) => (
                                            <Badge key={genre.id} variant="outline" className="text-xs text-white border-white/40 bg-black/30 backdrop-blur-sm">
                                                {genre.name}
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2 pt-2">
                                    <Link href={`/movie/${movie.slug}`} className="flex-1">
                                        <Button 
                                            size="sm"
                                            className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-medium shadow-lg"
                                        >
                                            <Play className="h-4 w-4 mr-2 fill-current" />
                                            Xem ngay
                                        </Button>
                                    </Link>
                                    <Link href={`/movie/${movie.slug}`}>
                                        <Button 
                                            size="sm"
                                            variant="outline"
                                            className="text-white border-white/50 hover:bg-white/20 backdrop-blur-sm"
                                        >
                                            <Info className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Default variant (simple card without hover expand)
    return (
        <Link 
            href={`/movie/${movie.slug}`}
            className="group relative block overflow-hidden rounded-lg transition-transform duration-300 hover:scale-105"
        >
            <div className="relative aspect-[2/3] overflow-hidden bg-muted">
                <img
                    src={getImageUrl(movie.poster_url)}
                    alt={movie.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                
                {rating > 0 && (
                    <div className="absolute top-2 left-2">
                        <Badge className={`bg-gradient-to-r ${getRatingColor(rating)} text-white border-0 font-bold`}>
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            {rating.toFixed(1)}
                        </Badge>
                    </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full transition-transform duration-300 group-hover:translate-y-0">
                    <div className="space-y-1">
                        <h3 className="text-lg font-bold text-white line-clamp-2">
                            {movie.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-white/90">
                            <span>{movie.year}</span>
                            {movie.time && (
                                <>
                                    <span>•</span>
                                    <span>{movie.time}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    )
}