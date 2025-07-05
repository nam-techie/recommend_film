'use client'

import React from 'react'
import { MovieCard } from '@/components/ui/MovieCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Calendar } from 'lucide-react'

export function NewReleases() {
    // Mock data - sẽ thay thế bằng API call
    const newMovies = [
        {
            id: 11,
            title: "The Menu",
            poster: "https://image.tmdb.org/t/p/w500/v31MsWhF9WFh7Qooq6xSBbmJxoG.jpg",
            rating: 7.2,
            year: 2022,
            genres: ["Kinh dị", "Hài đen"],
            description: "A young couple travels to a remote island to eat at an exclusive restaurant..."
        },
        {
            id: 12,
            title: "Glass Onion",
            poster: "https://image.tmdb.org/t/p/w500/vDGr1YdrlfbU9wxTOdpf3zChmv9.jpg",
            rating: 7.1,
            year: 2022,
            genres: ["Bí ẩn", "Hài"],
            description: "World-famous detective Benoit Blanc heads to Greece to peel back the layers..."
        },
        {
            id: 13,
            title: "Bullet Train",
            poster: "https://image.tmdb.org/t/p/w500/j8szC8OgrejDQjjMKSVXyaAjw3V.jpg",
            rating: 7.3,
            year: 2022,
            genres: ["Hành động", "Hài"],
            description: "Unlucky assassin Ladybug is determined to do his job peacefully..."
        },
        {
            id: 14,
            title: "Nope",
            poster: "https://image.tmdb.org/t/p/w500/AcKVlWaNVVVFQwro3nLXqPljcYA.jpg",
            rating: 6.8,
            year: 2022,
            genres: ["Kinh dị", "Khoa học viễn tưởng"],
            description: "Residents in a lonely gulch of inland California bear witness..."
        },
        {
            id: 15,
            title: "Everything Everywhere All at Once",
            poster: "https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg",
            rating: 7.8,
            year: 2022,
            genres: ["Khoa học viễn tưởng", "Hài"],
            description: "An aging Chinese immigrant is swept up in an insane adventure..."
        }
    ]

    return (
        <section className="space-y-6">
            <SectionHeader 
                title="Mới phát hành" 
                subtitle="Những bộ phim mới nhất"
                icon={Calendar}
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {newMovies.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                ))}
            </div>
        </section>
    )
}