import React from 'react'
import { Movie } from '@/lib/api'
import { MovieGrid } from '../ui/MovieGrid'
import { Button } from '../ui/button'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface MovieSectionProps {
    title: string
    viewAllHref?: string
    movies: Movie[]
    aspectRatio?: 'portrait' | 'landscape'
    cardWidth?: 'sm' | 'md' | 'lg'
    showInfo?: boolean
    className?: string
}

export function MovieSection({
    title,
    viewAllHref,
    movies,
    aspectRatio = 'portrait',
    cardWidth = 'md',
    showInfo = true,
    className = ''
}: MovieSectionProps) {
    if (!movies.length) return null

    return (
        <section className={`space-y-6 ${className}`}>
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight text-white">
                        {title}
                    </h2>
                </div>
                
                {viewAllHref && (
                    <Link href={viewAllHref}>
                        <Button 
                            variant="ghost" 
                            className="text-white/70 hover:text-white"
                        >
                            Xem tất cả
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                )}
            </div>

            <MovieGrid
                movies={movies}
                aspectRatio={aspectRatio}
                cardWidth={cardWidth}
                showInfo={showInfo}
            />
        </section>
    )
} 