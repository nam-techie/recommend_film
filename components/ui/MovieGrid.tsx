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
    // RESPONSIVE GRID COLUMNS - PERFECT FOR ALL DEVICES
    const gridCols = {
        sm: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8',
        md: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7',
        lg: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
    }

    return (
        <div className={`movie-grid-container ${gridCols[cardWidth]} ${className} overflow-visible`}>
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