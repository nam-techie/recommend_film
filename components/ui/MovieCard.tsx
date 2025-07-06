'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Star, Heart, Play, Info, Calendar, Clock, Globe, Users, Eye, Film, Award, Tv, Monitor, User, Video, MapPin, Languages } from 'lucide-react'
import { Movie, getImageUrl, fetchMovieDetail, MovieDetail } from '@/lib/api'
import Link from 'next/link'

interface MovieCardProps {
    movie: Movie
    aspectRatio?: 'portrait' | 'landscape'
    width?: 'sm' | 'md' | 'lg'
    showInfo?: boolean
}

export function MovieCard({ 
    movie, 
    aspectRatio = 'portrait',
    width = 'md',
    showInfo = true 
}: MovieCardProps) {
    const [isLiked, setIsLiked] = useState(false)
    const [imageLoaded, setImageLoaded] = useState(false)
    const [movieDetail, setMovieDetail] = useState<MovieDetail | null>(null)
    const [loadingDetail, setLoadingDetail] = useState(false)

    const widthClasses = {
        sm: 'w-[160px]',
        md: 'w-[200px]',
        lg: 'w-[240px]'
    }

    const aspectRatioClasses = {
        portrait: 'aspect-[2/3]',
        landscape: 'aspect-[16/9]'
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

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'single': return Monitor
            case 'series': return Tv
            case 'hoathinh': return Film
            default: return Film
        }
    }

    const loadMovieDetail = async () => {
        if (movieDetail || loadingDetail) return
        
        try {
            setLoadingDetail(true)
            const detail = await fetchMovieDetail(movie.slug)
            setMovieDetail(detail)
        } catch (error) {
            console.error('Error loading movie detail:', error)
        } finally {
            setLoadingDetail(false)
        }
    }

    const rating = movie.tmdb?.vote_average || 0
    const TypeIcon = getTypeIcon(movie.type)

    return (
        <Link 
            href={`/movie/${movie.slug}`}
            className={`group relative block ${widthClasses[width]} overflow-hidden rounded-lg transition-transform duration-300 hover:scale-105`}
        >
            {/* Poster Image */}
            <div className={`relative ${aspectRatioClasses[aspectRatio]} overflow-hidden bg-gray-900`}>
                <img
                    src={movie.poster_url}
                    alt={movie.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                />

                {/* Overlay on Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                
                {/* Rating Badge */}
                {rating > 0 && (
                    <div className="absolute top-2 left-2">
                        <Badge className={`bg-gradient-to-r ${getRatingColor(rating)} text-white border-0 font-bold`}>
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            {rating.toFixed(1)}
                        </Badge>
                    </div>
                )}

                {/* Play Button on Hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <Button
                        size="icon"
                        className="h-12 w-12 rounded-full bg-white/90 text-black hover:bg-white hover:scale-110 transition-transform duration-300"
                    >
                        <Play className="h-6 w-6 fill-current" />
                    </Button>
                </div>

                {/* Movie Info on Hover */}
                {showInfo && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full transition-transform duration-300 group-hover:translate-y-0">
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-white line-clamp-2">
                                {movie.name}
                            </h3>
                            {movie.origin_name && movie.origin_name !== movie.name && (
                                <p className="text-sm text-white/70 line-clamp-1">
                                    {movie.origin_name}
                                </p>
                            )}
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

            {/* Title below image (only shown when showInfo is false) */}
            {!showInfo && (
                <div className="mt-2 space-y-1 text-center">
                    <h3 className="font-medium text-white line-clamp-2">
                        {movie.name}
                    </h3>
                    {movie.origin_name && movie.origin_name !== movie.name && (
                        <p className="text-sm text-white/70 line-clamp-1">
                            {movie.origin_name}
                        </p>
                    )}
                </div>
            )}
        </Link>
    )
}