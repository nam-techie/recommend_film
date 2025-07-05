'use client'

import React from 'react'
import { MovieCard } from '@/components/ui/MovieCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Star } from 'lucide-react'

export function TopRatedPage() {
    // Mock top rated movies data
    const topRatedMovies = [
        {
            id: 1,
            title: "The Shawshank Redemption",
            poster: "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
            rating: 9.3,
            year: 1994,
            genres: ["Chính kịch"],
            description: "Two imprisoned men bond over a number of years..."
        },
        // Add more top rated movies...
    ]

    return (
        <div className="space-y-8">
            <SectionHeader 
                title="Phim đánh giá cao nhất" 
                subtitle="Những kiệt tác điện ảnh được yêu thích nhất"
                icon={Star}
                showViewAll={false}
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {topRatedMovies.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                ))}
            </div>
        </div>
    )
}