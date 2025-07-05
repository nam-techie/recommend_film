'use client'

import React from 'react'
import { MovieCard } from '@/components/ui/MovieCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Star } from 'lucide-react'

export function FeaturedMovies() {
    // Mock data - sẽ thay thế bằng API call
    const featuredMovies = [
        {
            id: 1,
            title: "Spider-Man: No Way Home",
            poster: "https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",
            rating: 8.2,
            year: 2021,
            genres: ["Hành động", "Phiêu lưu"],
            description: "Peter Parker's secret identity is revealed to the entire world..."
        },
        {
            id: 2,
            title: "Dune",
            poster: "https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
            rating: 8.0,
            year: 2021,
            genres: ["Khoa học viễn tưởng", "Phiêu lưu"],
            description: "Paul Atreides, a brilliant and gifted young man..."
        },
        {
            id: 3,
            title: "The Batman",
            poster: "https://image.tmdb.org/t/p/w500/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg",
            rating: 7.8,
            year: 2022,
            genres: ["Hành động", "Tội phạm"],
            description: "In his second year of fighting crime, Batman uncovers corruption..."
        },
        {
            id: 4,
            title: "Top Gun: Maverick",
            poster: "https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg",
            rating: 8.3,
            year: 2022,
            genres: ["Hành động", "Chính kịch"],
            description: "After more than thirty years of service as one of the Navy's top aviators..."
        },
        {
            id: 5,
            title: "Black Widow",
            poster: "https://image.tmdb.org/t/p/w500/qAZ0pzat24kLdO3o8ejmbLxyOac.jpg",
            rating: 6.7,
            year: 2021,
            genres: ["Hành động", "Phiêu lưu"],
            description: "Natasha Romanoff, also known as Black Widow, confronts the darker parts..."
        }
    ]

    return (
        <section className="space-y-6">
            <SectionHeader 
                title="Phim nổi bật" 
                subtitle="Những bộ phim được đánh giá cao nhất"
                icon={Star}
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {featuredMovies.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                ))}
            </div>
        </section>
    )
}