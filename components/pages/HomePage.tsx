'use client'

import React from 'react'
import { HeroSection } from '@/components/sections/HeroSection'
import { FeaturedMovies } from '@/components/sections/FeaturedMovies'
import { KoreanMovies } from '@/components/sections/KoreanMovies'
import { ChineseMovies } from '@/components/sections/ChineseMovies'
import { USUKMovies } from '@/components/sections/USUKMovies'
import { VietnameseMovies } from '@/components/sections/VietnameseMovies'
import { ActionMovies } from '@/components/sections/ActionMovies'
import { AnimeMovies } from '@/components/sections/AnimeMovies'
import { NewReleases } from '@/components/sections/NewReleases'
import { GenreSection } from '@/components/sections/GenreSection'
import { ScrollToTop } from '@/components/ui/ScrollToTop'
import { ContinueWatching } from '@/components/sections/ContinueWatching'

export function HomePage() {
    return (
        <>
            <div className="space-y-8 sm:space-y-12 lg:space-y-16">
                <div className="w-full sm:container sm:mx-auto sm:px-4 sm:pt-4">
                    <HeroSection />
                </div>
                
                <div className="container mx-auto px-4 space-y-8 sm:space-y-12 lg:space-y-16 pb-8">
                    <ContinueWatching />
                    {/* Phim đánh giá cao nhất - giữ lại từ design cũ */}
                    <FeaturedMovies />
                
                {/* Phim theo quốc gia - theo ảnh mẫu */}
                <KoreanMovies />
                <ChineseMovies />
                <USUKMovies />
                
                {/* Yêu Kiều Mỹ - Phim Việt Nam */}
                <VietnameseMovies />
                
                {/* Đường về nhà là vào tim ta - Phim hành động */}
                <ActionMovies />
                
                {/* Kho tàng Anime */}
                <AnimeMovies />
                
                {/* Phim mới ra mắt */}
                <NewReleases />
                
                    {/* Section thể loại */}
                    <GenreSection />
                </div>
            </div>
            
            {/* Scroll to top button */}
            <ScrollToTop />
        </>
    )
}
