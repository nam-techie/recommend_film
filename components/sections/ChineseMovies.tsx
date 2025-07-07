'use client'

import React, { useEffect, useState } from 'react'
import { MovieGrid } from '@/components/ui/MovieGrid'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { fetchChineseMovies } from '@/lib/api'
import type { Movie } from '@/lib/api'

export function ChineseMovies() {
    const [movies, setMovies] = useState<Movie[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadMovies = async () => {
            try {
                setLoading(true)
                const response = await fetchChineseMovies(1, 12)
                setMovies(response.data?.items || [])
            } catch (error) {
                console.error('Error fetching Chinese movies:', error)
            } finally {
                setLoading(false)
            }
        }

        loadMovies()
    }, [])

    return (
        <section className="space-y-6">
            <SectionHeader
                title="Phim Trung Quốc mới"
                subtitle="Những bộ phim Trung Quốc đặc sắc"
                href="/category/trung-quoc"
            />
            <MovieGrid 
                movies={movies} 
                loading={loading}
                variant="hover-expand"
            />
        </section>
    )
} 