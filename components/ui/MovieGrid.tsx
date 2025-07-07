import React from 'react'
import { Movie } from '@/lib/api'
import { MovieCard } from './MovieCard'

interface MovieGridProps {
    movies: Movie[]
    aspectRatio?: 'portrait' | 'landscape'
    cardWidth?: 'sm' | 'md' | 'lg'
    showInfo?: boolean
    className?: string
}

export function MovieGrid({ 
    movies,
    aspectRatio = 'portrait',
    cardWidth = 'md',
    showInfo = true,
    className = ''
}: MovieGridProps) {
    // Calculate gap and grid columns based on card width
    const gapClass = cardWidth === 'sm' ? 'gap-6' : 'gap-8'
    const gridCols = {
        sm: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8',
        md: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
        lg: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
    }

    return (
        <div className={`movie-grid-container grid ${gridCols[cardWidth]} ${gapClass} ${className} overflow-visible`}>
            {movies.map((movie) => (
                <MovieCard
                    key={movie._id}
                    movie={movie}
                    variant="hover-expand"
                />
            ))}
        </div>
    )
}