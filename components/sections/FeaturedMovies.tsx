'use client'

import React, { useState, useEffect } from 'react'
import { MovieCard } from '@/components/ui/MovieCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Star } from 'lucide-react'
import { fetchNewMovies, Movie } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'

export function FeaturedMovies() {
    const [movies, setMovies] = useState<Movie[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const loadFeaturedMovies = async () => {
            try {
                setLoading(true)
                const response = await fetchNewMovies(1)
                if (response.items) {
                    // Get top rated movies from the list
                    const topRated = response.items
                        .filter(movie => movie.tmdb?.vote_average && movie.tmdb.vote_average > 7)
                        .slice(0, 10)
                    setMovies(topRated)
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
            <section className="space-y-6">
                <SectionHeader 
                    title="Phim nổi bật" 
                    subtitle="Những bộ phim được đánh giá cao nhất"
                    icon={Star}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="space-y-3">
                            <Skeleton className="w-full aspect-[2/3] rounded-lg" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                    ))}
                </div>
            </section>
        )
    }

    if (error) {
        return (
            <section className="space-y-6">
                <SectionHeader 
                    title="Phim nổi bật" 
                    subtitle="Những bộ phim được đánh giá cao nhất"
                    icon={Star}
                />
                <div className="text-center py-12">
                    <p className="text-muted-foreground">{error}</p>
                </div>
            </section>
        )
    }

    return (
        <section className="space-y-6">
            <SectionHeader 
                title="Phim nổi bật" 
                subtitle="Những bộ phim được đánh giá cao nhất"
                icon={Star}
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {movies.map((movie) => (
                    <MovieCard key={movie._id} movie={movie} />
                ))}
            </div>
        </section>
    )
}