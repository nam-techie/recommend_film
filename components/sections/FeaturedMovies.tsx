'use client'

import React, { useState, useEffect } from 'react'
import { MovieCard } from '@/components/ui/MovieCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Star } from 'lucide-react'
import { fetchFeaturedMovies, Movie } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'

export function FeaturedMovies() {
    const [movies, setMovies] = useState<Movie[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const loadFeaturedMovies = async () => {
            try {
                setLoading(true)
                const response = await fetchFeaturedMovies(1)
                if (response.items) {
                    // Filter movies with good ratings and complete data
                    const featuredMovies = response.items
                        .filter(movie => 
                            movie.poster_url && 
                            movie.name &&
                            (movie.tmdb?.vote_average || 0) >= 6
                        )
                        .slice(0, 10)
                    setMovies(featuredMovies)
                } else {
                    setMovies([])
                }
            } catch (err) {
                setError('Không thể tải danh sách phim nổi bật')
                console.error('Error loading featured movies:', err)
            } finally {
                setLoading(false)
            }
        }

        loadFeaturedMovies()
    }, [])

    if (loading) {
        return (
            <section className="space-y-4 sm:space-y-6">
                <SectionHeader 
                    title="Phim nổi bật" 
                    subtitle="Những bộ phim được đánh giá cao nhất"
                    icon={Star}
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="space-y-2 sm:space-y-3">
                            <Skeleton className="w-full aspect-[2/3] rounded-lg" />
                            <Skeleton className="h-3 sm:h-4 w-3/4" />
                            <Skeleton className="h-2 sm:h-3 w-1/2" />
                        </div>
                    ))}
                </div>
            </section>
        )
    }

    if (error) {
        return (
            <section className="space-y-4 sm:space-y-6">
                <SectionHeader 
                    title="Phim nổi bật" 
                    subtitle="Những bộ phim được đánh giá cao nhất"
                    icon={Star}
                />
                <div className="text-center py-8 sm:py-12">
                    <p className="text-muted-foreground text-sm sm:text-base">{error}</p>
                </div>
            </section>
        )
    }

    return (
        <section className="space-y-4 sm:space-y-6">
            <SectionHeader 
                title="Phim nổi bật" 
                subtitle="Những bộ phim được đánh giá cao nhất"
                icon={Star}
            />
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
                {movies.map((movie) => (
                    <MovieCard key={movie._id} movie={movie} />
                ))}
            </div>
        </section>
    )
}