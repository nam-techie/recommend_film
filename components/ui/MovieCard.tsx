'use client'

import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
    Star, 
    Calendar, 
    Clock, 
    Info,
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
                {/* Main Card Container - SMOOTH SCALING */}
                <div className="relative overflow-hidden rounded-xl bg-card/80 backdrop-blur-sm border border-border/30 transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-[1.15] group-hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] group-hover:z-[100] group-hover:border-primary/40 group-hover:bg-card/90">
                    {/* Poster Image với aspect ratio cố định */}
                    <div className="relative aspect-[2/3] overflow-hidden">
                        {!imageLoaded && (
                            <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/50 to-muted animate-pulse rounded-xl" />
                        )}
                        <img
                            src={getImageUrl(movie.poster_url)}
                            alt={movie.name}
                            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
                                imageLoaded ? 'opacity-100' : 'opacity-0'
                            }`}
                            onLoad={() => setImageLoaded(true)}
                            loading="lazy"
                        />
                        
                        {/* Glassmorphism Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-400 backdrop-blur-[1px]" />
                        
                        {/* Rating Badge - Smooth Animation */}
                        {rating > 0 && (
                            <div className="absolute top-3 left-3 z-20 transform transition-all duration-300 group-hover:scale-105">
                                <Badge className={`bg-gradient-to-r ${getRatingColor(rating)} text-white border-0 font-bold shadow-lg text-xs px-2.5 py-1.5 backdrop-blur-sm`}>
                                    <Star className="h-3 w-3 mr-1.5 fill-current" />
                                    {rating.toFixed(1)}
                                </Badge>
                            </div>
                        )}

                        {/* Type Badge - Glassmorphism */}
                        <div className="absolute top-3 right-3 z-20 transform transition-all duration-300 group-hover:scale-105">
                            <Badge variant="secondary" className="bg-black/60 text-white border-0 backdrop-blur-md text-xs px-2.5 py-1.5 shadow-lg">
                                {getTypeLabel(movie.type)}
                            </Badge>
                        </div>



                        {/* Glassmorphism Movie Info Overlay */}
                        <div className="absolute inset-0 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100 z-20">
                            <div className="bg-black/30 backdrop-blur-md border-t border-white/10 p-4 space-y-3">
                                {/* Movie Title Section - Enhanced */}
                                <div className="space-y-1">
                                    <h3 className="text-base font-bold text-white line-clamp-2 leading-tight drop-shadow-xl">
                                        {movie.name}
                                    </h3>
                                    {movie.origin_name && movie.origin_name !== movie.name && (
                                        <p className="text-xs text-white/80 line-clamp-1 font-medium drop-shadow-lg">
                                            {movie.origin_name}
                                        </p>
                                    )}
                                </div>

                                {/* Movie Meta Info - Enhanced grid */}
                                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-white/90">
                                    <div className="flex items-center gap-1.5 transition-colors duration-300 hover:text-yellow-400">
                                        <Calendar className="h-3 w-3 text-yellow-400 shrink-0" />
                                        <span className="drop-shadow-lg truncate font-medium">{movie.year}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 transition-colors duration-300 hover:text-green-400">
                                        <Eye className="h-3 w-3 text-green-400 shrink-0" />
                                        <span className="drop-shadow-lg truncate font-medium">{movie.quality}</span>
                                    </div>
                                    {movie.time && (
                                        <div className="flex items-center gap-1.5 transition-colors duration-300 hover:text-blue-400">
                                            <Clock className="h-3 w-3 text-blue-400 shrink-0" />
                                            <span className="drop-shadow-lg truncate font-medium">{movie.time}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5 transition-colors duration-300 hover:text-purple-400">
                                        <Globe className="h-3 w-3 text-purple-400 shrink-0" />
                                        <span className="drop-shadow-lg truncate font-medium">{movie.lang}</span>
                                    </div>
                                </div>

                                {/* Genres Section - Enhanced */}
                                {movie.category && movie.category.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap gap-1.5">
                                            {movie.category.slice(0, 2).map((genre, index) => (
                                                <Badge 
                                                    key={genre.id} 
                                                    variant="outline" 
                                                    className="text-xs text-white border-white/30 bg-white/10 backdrop-blur-sm px-2 py-1 h-auto transition-all duration-300 hover:bg-white/20 hover:scale-105"
                                                    style={{ animationDelay: `${index * 50}ms` }}
                                                >
                                                    {genre.name}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Enhanced Info Button */}
                                <div className="flex justify-center pt-2">
                                    <Link href={`/movie/${movie.slug}`}>
                                        <Button 
                                            size="sm"
                                            variant="outline"
                                            className="h-8 px-4 text-xs text-white border-white/40 bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all duration-300 hover:scale-105 shadow-lg"
                                        >
                                            <Info className="h-3 w-3 mr-1.5" />
                                            Chi tiết
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