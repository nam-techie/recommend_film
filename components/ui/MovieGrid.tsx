import React from 'react'
import { Movie } from '@/lib/api'
import { MovieCard } from './MovieCard'
import { Skeleton } from './skeleton'

interface MovieGridProps {
    movies: Movie[]
    aspectRatio?: 'portrait' | 'landscape'
    cardWidth?: 'sm' | 'md' | 'lg'
    showInfo?: boolean
    className?: string
    loading?: boolean
    variant?: 'default' | 'hover-expand'
}

export function MovieGrid({ 
    movies,
    aspectRatio = 'portrait',
    cardWidth = 'md',
    showInfo = true,
    className = '',
    loading = false,
    variant = 'hover-expand'
}: MovieGridProps) {
    // RESPONSIVE GRID COLUMNS - PERFECT FOR ALL DEVICES
    const gridCols = {
        sm: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8',
        md: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7',
        lg: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
    }

    if (loading) {
        return (
            <div className={`grid gap-4 ${gridCols[cardWidth]} ${className}`}>
                {Array.from({ length: 12 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                        <Skeleton className="aspect-[2/3] w-full rounded-lg" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className={`movie-grid-container ${gridCols[cardWidth]} ${className} overflow-visible`}>
            {movies.map((movie) => (
                <MovieCard
                    key={movie._id}
                    movie={movie}
                    variant={variant}
                />
            ))}
        </div>
    )
}