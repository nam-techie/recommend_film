'use client'

import React from 'react'
import { MovieCard } from '@/components/ui/MovieCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Calendar } from 'lucide-react'

export function NewReleasesPage() {
    // Mock new releases data
    const newReleases = [
        {
            id: 1,
            title: "The Menu",
            poster: "https://image.tmdb.org/t/p/w500/v31MsWhF9WFh7Qooq6xSBbmJxoG.jpg",
            rating: 7.2,
            year: 2022,
            genres: ["Kinh dị", "Hài đen"],
            description: "A young couple travels to a remote island to eat at an exclusive restaurant..."
        },
        // Add more new releases...
    ]

    return (
        <div className="space-y-8">
            <SectionHeader 
                title="Phim mới phát hành" 
                subtitle="Những bộ phim mới nhất vừa ra mắt"
                icon={Calendar}
                showViewAll={false}
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {newReleases.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                ))}
            </div>
        </div>
    )
}