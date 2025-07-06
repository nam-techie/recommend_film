'use client'

import React from 'react'
import { HeroSection } from '@/components/sections/HeroSection'
import { FeaturedMovies } from '@/components/sections/FeaturedMovies'
import { TrendingMovies } from '@/components/sections/TrendingMovies'
import { NewReleases } from '@/components/sections/NewReleases'
import { TopRatedMovies } from '@/components/sections/TopRatedMovies'
import { GenreSection } from '@/components/sections/GenreSection'

export function HomePage() {
    return (
        <div className="space-y-8 sm:space-y-12 lg:space-y-16">
            <HeroSection />
            <FeaturedMovies />
            <TrendingMovies />
            <NewReleases />
            <TopRatedMovies />
            <GenreSection />
        </div>
    )
}