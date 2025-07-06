'use client'

import React, { useEffect, useState } from 'react'
import { MovieCard } from '@/components/ui/MovieCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Star } from 'lucide-react'
import { Movie, fetchNewMovies } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'

export function TopRatedMovies() {
    const [movies, setMovies] = useState<Movie[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const loadTopRatedMovies = async () => {
            try {
                setLoading(true)
                // Load multiple pages and filter by rating
                const [page1, page2, page3] = await Promise.all([
                    fetchNewMovies(1),
                    fetchNewMovies(2),
                    fetchNewMovies(3)
                ])
                
                const allMovies = [
                    ...(page1.items || []),
                    ...(page2.items || []),
                    ...(page3.items || [])
                ]
                
                // Filter and sort by rating
                const topRated = allMovies
                    .filter(movie => movie.tmdb?.vote_average && movie.tmdb.vote_average >= 7)
                    .sort((a, b) => (b.tmdb?.vote_average || 0) - (a.tmdb?.vote_average || 0))
                    .slice(0, 10)
                
                setMovies(topRated)
            } catch (err) {
                setError('Không thể tải danh sách phim đánh giá cao nhất')
            } finally {
                setLoading(false)
            }
        }
        loadTopRatedMovies()
    }, [])

    if (loading) {
        return (
            <section className="space-y-4 sm:space-y-6">
                <SectionHeader 
                    title="Đánh giá cao nhất" 
                    subtitle="Những kiệt tác điện ảnh"
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
                    title="Đánh giá cao nhất" 
                    subtitle="Những kiệt tác điện ảnh"
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
                title="Đánh giá cao nhất" 
                subtitle="Những kiệt tác điện ảnh"
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