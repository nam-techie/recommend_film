'use client'

import React, { useEffect, useState } from 'react'
import { MovieGrid } from '@/components/ui/MovieGrid'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { fetchAnimeMovies } from '@/lib/api'
import type { Movie } from '@/lib/api'

export function AnimeMovies() {
    const [movies, setMovies] = useState<Movie[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadMovies = async () => {
            try {
                setLoading(true)
                const response = await fetchAnimeMovies(1, 12)
                setMovies(response.data?.items || [])
            } catch (error) {
                console.error('Error fetching Anime movies:', error)
            } finally {
                setLoading(false)
            }
        }

        loadMovies()
    }, [])

    return (
        <section className="space-y-6">
            <SectionHeader
                title="Kho Tàng Anime Mới Nhất"
                subtitle="Thế giới hoạt hình Nhật Bản đầy màu sắc"
                href="/category/hoat-hinh"
            />
            <MovieGrid 
                movies={movies} 
                loading={loading}
                variant="hover-expand"
            />
        </section>
    )
} 