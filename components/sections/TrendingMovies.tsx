'use client'

import React, { useState, useEffect } from 'react'
import { MovieCard } from '@/components/ui/MovieCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { TrendingUp } from 'lucide-react'
import { fetchTrendingMovies, Movie } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'

export function TrendingMovies() {
    const [movies, setMovies] = useState<Movie[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const loadTrendingMovies = async () => {
            try {
                setLoading(true)
                const response = await fetchTrendingMovies(1)
                if (response.items) {
                    setMovies(response.items.slice(0, 12))
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
            <section className="space-y-6 sm:space-y-8">
                <SectionHeader 
                    title="Đang thịnh hành" 
                    subtitle="Phim hot nhất tuần này"
                    icon={TrendingUp}
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-6">
                    {Array.from({ length: 12 }).map((_, i) => (
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
            <section className="space-y-6 sm:space-y-8">
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
        <section className="space-y-6 sm:space-y-8">
            <SectionHeader 
                title="Đang thịnh hành" 
                subtitle="Phim hot nhất tuần này"
                icon={TrendingUp}
            />
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-6">
                {movies.map((movie) => (
                    <MovieCard 
                        key={movie._id} 
                        movie={movie} 
                        variant="hover-expand"
                    />
                ))}
            </div>
        </section>
    )
}