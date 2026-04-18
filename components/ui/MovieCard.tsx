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
        if (rating >= 8) return 'from-success flex to-emerald-400'
        if (rating >= 7) return 'from-warning to-yellow-400'
        if (rating >= 6) return 'from-orange-500 to-red-400'
        return 'from-danger to-pink-500'
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
            <div className="group relative cursor-pointer hover:z-50 focus-within:z-50 transition-all duration-300">
                {/* Main Card Container - SMOOTH SCALING */}
                <div className="relative overflow-hidden rounded-xl bg-card border border-border/40 transition-all duration-400 ease-out group-hover:scale-110 sm:group-hover:scale-[1.15] group-hover:shadow-2xl group-hover:border-primary/50 group-hover:bg-card">
                    {/* Poster Image with fixed relative aspect ratio */}
                    <div className="relative aspect-[2/3] overflow-hidden bg-muted/40">
                        {!imageLoaded && (
                            <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/50 to-muted animate-pulse rounded-xl" />
                        )}
                        <img
                            src={getImageUrl(movie.poster_url)}
                            alt={movie.name}
                            className={`w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${
                                imageLoaded ? 'opacity-100' : 'opacity-0'
                            }`}
                            onLoad={() => setImageLoaded(true)}
                            loading="lazy"
                        />
                        
                        {/* Rating Badge */}
                        {rating > 0 && (
                            <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-30 transition-transform duration-300">
                                <Badge className={`bg-gradient-to-r ${getRatingColor(rating)} text-white border-0 font-bold shadow-md text-[10px] sm:text-xs px-2 py-0.5 sm:py-1`}>
                                    <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 fill-current" />
                                    {rating.toFixed(1)}
                                </Badge>
                            </div>
                        )}

                        {/* Type Badge */}
                        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-30 transition-transform duration-300">
                            <Badge variant="secondary" className="bg-black/60 text-white font-medium border border-white/10 backdrop-blur-md text-[10px] sm:text-xs px-2 py-0.5 sm:py-1 shadow-md">
                                {getTypeLabel(movie.type)}
                            </Badge>
                        </div>

                        {/* Elegant Glassmorphism Overlay */}
                        <div className="absolute inset-0 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                            {/* Deep shadow at bottom for text readability */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none" />
                            
                            {/* Content container */}
                            <div className="relative p-3 sm:p-4 w-full text-white space-y-2 sm:space-y-3">
                                {/* Title */}
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold line-clamp-2 leading-tight">
                                        {movie.name}
                                    </h3>
                                    {movie.origin_name && (
                                        <p className="text-[10px] sm:text-xs text-white/70 line-clamp-1 mt-0.5 font-mono">
                                            {movie.origin_name}
                                        </p>
                                    )}
                                </div>

                                {/* Meta Grid */}
                                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-white/90">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="h-3 w-3 text-warning shrink-0" />
                                        <span className="truncate">{movie.year}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Eye className="h-3 w-3 text-success shrink-0" />
                                        <span className="truncate">{movie.quality}</span>
                                    </div>
                                    {movie.time && (
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="h-3 w-3 text-blue-400 shrink-0" />
                                            <span className="truncate">{movie.time}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5">
                                        <Globe className="h-3 w-3 text-primary shrink-0" />
                                        <span className="truncate">{movie.lang}</span>
                                    </div>
                                </div>

                                {/* Genres (Max 2 to save space) */}
                                {movie.category && movie.category.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {movie.category.slice(0, 2).map((genre) => (
                                            <Badge 
                                                key={genre.id} 
                                                variant="outline" 
                                                className="text-[9px] sm:text-[10px] text-white/90 border-white/20 bg-white/10 px-1.5 py-0 rounded-sm font-normal"
                                            >
                                                {genre.name}
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                {/* Action Button */}
                                <Link href={`/movie/${movie.slug}`} className="block w-full pt-1">
                                    <Button 
                                        size="sm"
                                        className="w-full text-[11px] sm:text-xs h-7 sm:h-8 bg-primary/90 hover:bg-primary text-white border-none rounded-md"
                                    >
                                        <Info className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                                        Chi tiết
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

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