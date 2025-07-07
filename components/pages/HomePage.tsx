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

export function HomePage() {
    return (
        <>
            <div className="space-y-8 sm:space-y-12 lg:space-y-16">
                <HeroSection />
                
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
            
            {/* Scroll to top button */}
            <ScrollToTop />
        </>
    )
}