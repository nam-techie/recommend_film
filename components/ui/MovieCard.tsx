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
    Play,
    Eye,
    Globe
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
                {/* Main Card Container - SCALE TO 1.6X NHƯNG RESPONSIVE */}
                <div className="relative overflow-hidden rounded-lg bg-card border border-border/50 transition-all duration-700 ease-out group-hover:scale-[1.6] md:group-hover:scale-[1.5] lg:group-hover:scale-[1.4] group-hover:shadow-[0_30px_100px_-20px_rgba(0,0,0,0.9)] group-hover:z-[100] group-hover:border-primary/50">
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
                        
                        {/* PERFECT Dark Overlay on Hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-black/30 opacity-0 group-hover:opacity-100 transition-all duration-700" />
                        
                        {/* Rating Badge - Always Visible - SMALLER SIZE */}
                        {rating > 0 && (
                            <div className="absolute top-2 left-2 z-20">
                                <Badge className={`bg-gradient-to-r ${getRatingColor(rating)} text-white border-0 font-bold shadow-lg px-2 py-1 text-xs`}>
                                    <Star className="h-3 w-3 mr-1 fill-current" />
                                    {rating.toFixed(1)}
                                </Badge>
                            </div>
                        )}

                        {/* Type Badge - SMALLER */}
                        <div className="absolute top-2 right-2 z-20">
                            <Badge variant="secondary" className="bg-black/70 text-white border-0 backdrop-blur-sm px-2 py-1 text-xs">
                                {getTypeLabel(movie.type)}
                            </Badge>
                        </div>

                        {/* Action Buttons - SMALLER & POSITIONED BETTER */}
                        <div className="absolute top-12 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-300 z-20">
                            <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-full bg-black/70 backdrop-blur-sm border-0 hover:bg-red-500/90 transition-all duration-300 shadow-lg"
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
                                className="h-8 w-8 rounded-full bg-black/70 backdrop-blur-sm border-0 hover:bg-blue-500/90 transition-all duration-300 shadow-lg"
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

                        {/* PERFECT Movie Info Overlay - CÂN ĐỐI VÀ ĐẸP */}
                        <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-all duration-700 delay-200 z-20">
                            <div className="space-y-3">
                                {/* Movie Title - VỪA PHẢI */}
                                <div className="space-y-1">
                                    <h3 className="text-lg font-bold text-white line-clamp-2 leading-tight drop-shadow-xl">
                                        {movie.name}
                                    </h3>
                                    {movie.origin_name && movie.origin_name !== movie.name && (
                                        <p className="text-sm text-white/90 line-clamp-1 font-medium drop-shadow-lg">
                                            {movie.origin_name}
                                        </p>
                                    )}
                                </div>

                                {/* Movie Meta Info - COMPACT & BEAUTIFUL */}
                                <div className="grid grid-cols-2 gap-2 text-xs text-white/95">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3 text-yellow-400" />
                                        <span className="drop-shadow-lg">Năm: {movie.year}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Eye className="h-3 w-3 text-green-400" />
                                        <span className="drop-shadow-lg">{movie.quality}</span>
                                    </div>
                                    {movie.time && (
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3 text-blue-400" />
                                            <span className="drop-shadow-lg">{movie.time}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                        <Globe className="h-3 w-3 text-purple-400" />
                                        <span className="drop-shadow-lg">{movie.lang}</span>
                                    </div>
                                </div>

                                {/* Genres - COMPACT */}
                                {movie.category && movie.category.length > 0 && (
                                    <div className="space-y-1">
                                        <p className="text-xs text-white/80 font-medium">Thể loại:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {movie.category.slice(0, 3).map((genre) => (
                                                <Badge key={genre.id} variant="outline" className="text-xs text-white border-white/40 bg-black/40 backdrop-blur-sm px-2 py-0.5">
                                                    {genre.name}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons - PERFECT SIZE */}
                                <div className="flex items-center gap-2 pt-2">
                                    <Link href={`/movie/${movie.slug}`} className="flex-1">
                                        <Button 
                                            size="sm"
                                            className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-bold shadow-xl text-sm py-2"
                                        >
                                            <Play className="h-4 w-4 mr-2 fill-current" />
                                            Xem ngay
                                        </Button>
                                    </Link>
                                    <Link href={`/movie/${movie.slug}`}>
                                        <Button 
                                            size="sm"
                                            variant="outline"
                                            className="text-white border-white/60 hover:bg-white/20 backdrop-blur-sm px-3 py-2"
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