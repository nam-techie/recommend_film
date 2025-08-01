'use client'

import React, { useEffect, useState } from 'react'
import { MovieGrid } from '@/components/ui/MovieGrid'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { fetchKoreanMovies } from '@/lib/api'
import type { Movie } from '@/lib/api'

export function KoreanMovies() {
    const [movies, setMovies] = useState<Movie[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadMovies = async () => {
            try {
                setLoading(true)
                const response = await fetchKoreanMovies(1, 12)
                setMovies(response.data?.items || [])
            } catch (error) {
                console.error('Error fetching Korean movies:', error)
            } finally {
                setLoading(false)
            }
        }

        loadMovies()
    }, [])

    return (
        <section className="space-y-6">
            <SectionHeader
                title="Phim Hàn Quốc mới"
                subtitle="Những bộ phim Hàn Quốc hot nhất"
                href="/category/han-quoc"
            />
            <MovieGrid 
                movies={movies} 
                loading={loading}
                variant="hover-expand"
            />
        </section>
    )
} 