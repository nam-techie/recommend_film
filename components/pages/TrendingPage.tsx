'use client'

import React from 'react'
import { MovieCard } from '@/components/ui/MovieCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { TrendingUp } from 'lucide-react'

export function TrendingPage() {
    // Mock trending movies data
    const trendingMovies = [
        {
            id: 1,
            title: "Avatar: The Way of Water",
            poster: "https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg",
            rating: 7.6,
            year: 2022,
            genres: ["Khoa học viễn tưởng", "Phiêu lưu"],
            description: "Set more than a decade after the events of the first film..."
        },
        // Add more trending movies...
    ]

    return (
        <div className="space-y-8">
            <SectionHeader 
                title="Phim đang thịnh hành" 
                subtitle="Những bộ phim hot nhất hiện tại"
                icon={TrendingUp}
                showViewAll={false}
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {trendingMovies.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                ))}
            </div>
        </div>
    )
}