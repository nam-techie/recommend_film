'use client'

import React, { useEffect, useState } from 'react'
import { MovieGrid } from '@/components/ui/MovieGrid'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { fetchActionMovies } from '@/lib/api'
import type { Movie } from '@/lib/api'

export function ActionMovies() {
    const [movies, setMovies] = useState<Movie[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadMovies = async () => {
            try {
                setLoading(true)
                const response = await fetchActionMovies(1, 12)
                setMovies(response.data?.items || [])
            } catch (error) {
                console.error('Error fetching Action movies:', error)
            } finally {
                setLoading(false)
            }
        }

        loadMovies()
    }, [])

    return (
        <section className="space-y-6">
            <SectionHeader
                title="Đường về nhà là vào tim ta..."
                subtitle="Phim hành động gay cấn và kịch tính"
                href="/category/hanh-dong"
            />
            <MovieGrid 
                movies={movies} 
                loading={loading}
                variant="hover-expand"
            />
        </section>
    )
} 