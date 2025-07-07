'use client'

import React, { useEffect, useState } from 'react'
import { MovieGrid } from '@/components/ui/MovieGrid'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { fetchVietnameseMovies } from '@/lib/api'
import type { Movie } from '@/lib/api'

export function VietnameseMovies() {
    const [movies, setMovies] = useState<Movie[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadMovies = async () => {
            try {
                setLoading(true)
                const response = await fetchVietnameseMovies(1, 12)
                setMovies(response.data?.items || [])
            } catch (error) {
                console.error('Error fetching Vietnamese movies:', error)
            } finally {
                setLoading(false)
            }
        }

        loadMovies()
    }, [])

    return (
        <section className="space-y-6">
            <SectionHeader
                title="Yêu Kiều Mỹ"
                subtitle="Phim Việt Nam chất lượng cao"
                href="/category/viet-nam"
            />
            <MovieGrid 
                movies={movies} 
                loading={loading}
                variant="hover-expand"
            />
        </section>
    )
} 