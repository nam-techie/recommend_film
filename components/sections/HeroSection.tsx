'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Play, Info, Star, Calendar, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function HeroSection() {
    // Mock data for featured movie
    const featuredMovie = {
        title: "Avengers: Endgame",
        description: "Sau những sự kiện tàn khốc của Infinity War, vũ trụ đang trong tình trạng hỗn loạn. Với sự giúp đỡ của những đồng minh còn lại, Avengers phải tập hợp một lần nữa để đảo ngược hành động của Thanos và khôi phục lại trật tự cho vũ trụ.",
        backdrop: "https://image.tmdb.org/t/p/original/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
        rating: 8.4,
        year: 2019,
        duration: "181 phút",
        genres: ["Hành động", "Phiêu lưu", "Khoa học viễn tưởng"]
    }

    return (
        <div className="relative h-[70vh] min-h-[500px] overflow-hidden rounded-2xl">
            {/* Background Image */}
            <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${featuredMovie.backdrop})` }}
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            {/* Content */}
            <div className="relative h-full flex items-center">
                <div className="container mx-auto px-4">
                    <div className="max-w-2xl space-y-6">
                        {/* Movie Info */}
                        <div className="flex items-center space-x-4 text-white/80">
                            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                                <Star className="h-3 w-3 mr-1 fill-current" />
                                {featuredMovie.rating}
                            </Badge>
                            <span className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {featuredMovie.year}
                            </span>
                            <span className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                {featuredMovie.duration}
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
                            {featuredMovie.title}
                        </h1>

                        {/* Genres */}
                        <div className="flex flex-wrap gap-2">
                            {featuredMovie.genres.map((genre) => (
                                <Badge key={genre} variant="outline" className="text-white border-white/30">
                                    {genre}
                                </Badge>
                            ))}
                        </div>

                        {/* Description */}
                        <p className="text-lg text-white/90 leading-relaxed line-clamp-3">
                            {featuredMovie.description}
                        </p>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button 
                                size="lg" 
                                className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white border-0 shadow-lg"
                            >
                                <Play className="h-5 w-5 mr-2" />
                                Xem ngay
                            </Button>
                            <Button 
                                size="lg" 
                                variant="outline" 
                                className="border-white/30 text-white hover:bg-white/10"
                            >
                                <Info className="h-5 w-5 mr-2" />
                                Thông tin chi tiết
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}