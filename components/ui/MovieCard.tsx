'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
    Play, 
    Star, 
    Calendar, 
    Clock, 
    Globe, 
    Users, 
    Eye, 
    Film, 
    Award, 
    Tv, 
    Monitor, 
    Info,
    Heart,
    Bookmark
} from 'lucide-react'
import { Movie, getImageUrl } from '@/lib/api'
import Link from 'next/link'

interface MovieCardProps {
    movie: Movie
    aspectRatio?: 'portrait' | 'landscape'
    width?: 'sm' | 'md' | 'lg'
    showInfo?: boolean
    variant?: 'default' | 'hover-expand'
}

export function MovieCard({ 
    movie, 
    aspectRatio = 'portrait',
    width = 'md',
    showInfo = true,
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

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'single': return Monitor
            case 'series': return Tv
            case 'hoathinh': return Film
            default: return Film
        }
    }

    const rating = movie.tmdb?.vote_average || 0
    const TypeIcon = getTypeIcon(movie.type)

    if (variant === 'hover-expand') {
        return (
            <div className="group relative">
                {/* Main Card */}
                <div className="relative overflow-hidden rounded-lg bg-card border border-border/50 transition-all duration-500 ease-out group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-primary/20 group-hover:z-10">
                    {/* Poster Image */}
                    <div className="relative aspect-[2/3] overflow-hidden">
                        {!imageLoaded && (
                            <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/50 to-muted animate-pulse" />
                        )}
                        <img
                            src={getImageUrl(movie.poster_url)}
                            alt={movie.name}
                            className={`w-full h-full object-cover transition-all duration-700 ${
                                imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
                            } group-hover:scale-110`}
                            onLoad={() => setImageLoaded(true)}
                            loading="lazy"
                        />
                        
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
                        
                        {/* Rating Badge */}
                        {rating > 0 && (
                            <div className="absolute top-2 left-2 transform -translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                <Badge className={`bg-gradient-to-r ${getRatingColor(rating)} text-white border-0 font-bold shadow-lg`}>
                                    <Star className="h-3 w-3 mr-1 fill-current" />
                                    {rating.toFixed(1)}
                                </Badge>
                            </div>
                        )}

                        {/* Type Badge */}
                        <div className="absolute top-2 right-2 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-100">
                            <Badge variant="secondary" className="bg-black/60 text-white border-0 backdrop-blur-sm">
                                <TypeIcon className="h-3 w-3 mr-1" />
                                {getTypeLabel(movie.type)}
                            </Badge>
                        </div>

                        {/* Action Buttons */}
                        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 delay-200 transform translate-x-8 group-hover:translate-x-0">
                            <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-full bg-black/40 backdrop-blur-md border-0 hover:bg-red-500/80 transition-all duration-300"
                                onClick={(e) => {
                                    e.preventDefault()
                                    setIsLiked(!isLiked)
                                }}
                            >
                                <Heart className={`h-4 w-4 transition-all duration-300 ${
                                    isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-white'
                                }`} />
                            </Button>
                            <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-full bg-black/40 backdrop-blur-md border-0 hover:bg-blue-500/80 transition-all duration-300"
                                onClick={(e) => {
                                    e.preventDefault()
                                    setIsBookmarked(!isBookmarked)
                                }}
                            >
                                <Bookmark className={`h-4 w-4 transition-all duration-300 ${
                                    isBookmarked ? 'fill-blue-500 text-blue-500 scale-110' : 'text-white'
                                }`} />
                            </Button>
                        </div>

                        {/* Play Button */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                            <Link href={`/movie/${movie.slug}`}>
                                <Button 
                                    size="icon" 
                                    className="h-16 w-16 rounded-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-2xl border-4 border-white/20 transform scale-75 group-hover:scale-100 transition-transform duration-500"
                                >
                                    <Play className="h-7 w-7 ml-1 text-white fill-current" />
                                </Button>
                            </Link>
                        </div>

                        {/* Movie Info Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out">
                            <div className="space-y-2">
                                <h3 className="text-lg font-bold text-white line-clamp-2 leading-tight">
                                    {movie.name}
                                </h3>
                                {movie.origin_name && movie.origin_name !== movie.name && (
                                    <p className="text-sm text-white/80 line-clamp-1 font-medium">
                                        {movie.origin_name}
                                    </p>
                                )}
                                <div className="flex items-center justify-between text-sm text-white/90">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-3 w-3" />
                                        <span>{movie.year}</span>
                                    </div>
                                    {movie.time && (
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-3 w-3" />
                                            <span>{movie.time}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <Link href={`/movie/${movie.slug}`} className="flex-1">
                                        <Button 
                                            size="sm"
                                            className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-medium"
                                        >
                                            <Info className="h-4 w-4 mr-2" />
                                            Chi tiết
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Expanded Info Card (appears on hover) */}
                <div className="absolute top-0 left-full ml-4 w-80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-500 delay-300 transform translate-x-4 group-hover:translate-x-0 z-20 hidden lg:block">
                    <Card className="bg-gradient-to-br from-card via-card to-card/90 backdrop-blur-xl border border-border/50 shadow-2xl">
                        <CardContent className="p-6 space-y-4">
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-foreground line-clamp-2">
                                    {movie.name}
                                </h3>
                                {movie.origin_name && movie.origin_name !== movie.name && (
                                    <p className="text-muted-foreground font-medium">
                                        {movie.origin_name}
                                    </p>
                                )}
                            </div>

                            {movie.content && (
                                <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed">
                                    {movie.content}
                                </p>
                            )}

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Năm:</span>
                                        <span className="font-medium">{movie.year}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Thời lượng:</span>
                                        <span className="font-medium">{movie.time || 'N/A'}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Chất lượng:</span>
                                        <span className="font-medium">{movie.quality}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Ngôn ngữ:</span>
                                        <span className="font-medium">{movie.lang}</span>
                                    </div>
                                </div>
                            </div>

                            {movie.category && movie.category.length > 0 && (
                                <div className="space-y-2">
                                    <span className="text-sm font-medium text-muted-foreground">Thể loại:</span>
                                    <div className="flex flex-wrap gap-1">
                                        {movie.category.slice(0, 4).map((genre) => (
                                            <Badge key={genre.id} variant="outline" className="text-xs">
                                                {genre.name}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2 pt-2">
                                <Link href={`/movie/${movie.slug}`} className="flex-1">
                                    <Button className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90">
                                        <Play className="h-4 w-4 mr-2" />
                                        Xem ngay
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    // Default variant (simple card)
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

                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <Button
                        size="icon"
                        className="h-12 w-12 rounded-full bg-white/90 text-black hover:bg-white hover:scale-110 transition-transform duration-300"
                    >
                        <Play className="h-6 w-6 fill-current" />
                    </Button>
                </div>

                {showInfo && (
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
                )}
            </div>

            {!showInfo && (
                <div className="mt-2 space-y-1 text-center">
                    <h3 className="font-medium text-foreground line-clamp-2">
                        {movie.name}
                    </h3>
                    {movie.origin_name && movie.origin_name !== movie.name && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                            {movie.origin_name}
                        </p>
                    )}
                </div>
            )}
        </Link>
    )
}