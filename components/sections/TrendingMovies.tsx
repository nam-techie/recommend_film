'use client'

import React from 'react'
import { MovieCard } from '@/components/ui/MovieCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { TrendingUp } from 'lucide-react'

export function TrendingMovies() {
    // Mock data - sẽ thay thế bằng API call
    const trendingMovies = [
        {
            id: 6,
            title: "Avatar: The Way of Water",
            poster: "https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg",
            rating: 7.6,
            year: 2022,
            genres: ["Khoa học viễn tưởng", "Phiêu lưu"],
            description: "Set more than a decade after the events of the first film..."
        },
        {
            id: 7,
            title: "Wakanda Forever",
            poster: "https://image.tmdb.org/t/p/w500/sv1xJUazXeYqALzczSZ3O6nkH75.jpg",
            rating: 6.7,
            year: 2022,
            genres: ["Hành động", "Phiêu lưu"],
            description: "Queen Ramonda, Shuri, M'Baku, Okoye and the Dora Milaje..."
        },
        {
            id: 8,
            title: "Doctor Strange 2",
            poster: "https://image.tmdb.org/t/p/w500/9Gtg2DzBhmYamXBS1hKAhiwbBKS.jpg",
            rating: 6.9,
            year: 2022,
            genres: ["Hành động", "Phiêu lưu"],
            description: "Dr. Stephen Strange casts a forbidden spell that opens the doorway..."
        },
        {
            id: 9,
            title: "Minions: The Rise of Gru",
            poster: "https://image.tmdb.org/t/p/w500/wKiOkZTN9lUUUNZLmtnwubZYONg.jpg",
            rating: 7.3,
            year: 2022,
            genres: ["Hoạt hình", "Hài"],
            description: "A fanboy of a supervillain supergroup known as the Vicious 6..."
        },
        {
            id: 10,
            title: "Thor: Love and Thunder",
            poster: "https://image.tmdb.org/t/p/w500/pIkRyD18kl4FhoCNQuWxWu5cBLM.jpg",
            rating: 6.2,
            year: 2022,
            genres: ["Hành động", "Phiêu lưu"],
            description: "After his retirement is interrupted by Gorr the God Butcher..."
        }
    ]

    return (
        <section className="space-y-6">
            <SectionHeader 
                title="Đang thịnh hành" 
                subtitle="Phim hot nhất tuần này"
                icon={TrendingUp}
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {trendingMovies.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                ))}
            </div>
        </section>
    )
}