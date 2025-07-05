'use client'

import React, { useState, useEffect } from 'react'
import { MovieCard } from '@/components/ui/MovieCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { TrendingUp } from 'lucide-react'
import { fetchMoviesByType, Movie } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'

export function TrendingMovies() {
    const [movies, setMovies] = useState<Movie[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const loadTrendingMovies = async () => {
            try {
                setLoading(true)
                const response = await fetchMoviesByType('phim-le', {
                    page: 1,
                    sort_field: 'view',
                    sort_type: 'desc',
                    limit: 10
                })
                if (response.data?.items) {
                    setMovies(response.data.items)
                } else {
                    setMovies([])
                }
            } catch (err) {
                setError('Không thể tải danh sách phim thịnh hành')
                console.error('Error loading trending movies:', err)
            } finally {
                setLoading(false)
            }
        }

        loadTrendingMovies()
    }, [])

    if (loading) {
        return (
            <section className="space-y-6">
                <SectionHeader 
                    title="Đang thịnh hành" 
                    subtitle="Phim hot nhất tuần này"
                    icon={TrendingUp}
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
                    title="Đang thịnh hành" 
                    subtitle="Phim hot nhất tuần này"
                    icon={TrendingUp}
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
                title="Đang thịnh hành" 
                subtitle="Phim hot nhất tuần này"
                icon={TrendingUp}
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {movies.map((movie) => (
                    <MovieCard key={movie._id} movie={movie} />
                ))}
            </div>
        </section>
    )
}