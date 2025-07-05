'use client'

import React from 'react'
import { MovieCard } from '@/components/ui/MovieCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Star } from 'lucide-react'

export function TopRatedMovies() {
    // Mock data - sẽ thay thế bằng API call
    const topRatedMovies = [
        {
            id: 16,
            title: "The Shawshank Redemption",
            poster: "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
            rating: 9.3,
            year: 1994,
            genres: ["Chính kịch"],
            description: "Two imprisoned men bond over a number of years..."
        },
        {
            id: 17,
            title: "The Godfather",
            poster: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
            rating: 9.2,
            year: 1972,
            genres: ["Chính kịch", "Tội phạm"],
            description: "The aging patriarch of an organized crime dynasty..."
        },
        {
            id: 18,
            title: "The Dark Knight",
            poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
            rating: 9.0,
            year: 2008,
            genres: ["Hành động", "Tội phạm"],
            description: "Batman raises the stakes in his war on crime..."
        },
        {
            id: 19,
            title: "Pulp Fiction",
            poster: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
            rating: 8.9,
            year: 1994,
            genres: ["Tội phạm", "Chính kịch"],
            description: "A burger-loving hit man, his philosophical partner..."
        },
        {
            id: 20,
            title: "Forrest Gump",
            poster: "https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
            rating: 8.8,
            year: 1994,
            genres: ["Chính kịch", "Tình cảm"],
            description: "A man with a low IQ has accomplished great things..."
        }
    ]

    return (
        <section className="space-y-6">
            <SectionHeader 
                title="Đánh giá cao nhất" 
                subtitle="Những kiệt tác điện ảnh"
                icon={Star}
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {topRatedMovies.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                ))}
            </div>
        </section>
    )
}