'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Film, ChevronRight } from 'lucide-react'
import { fetchGenres, Genre } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'

export function GenreSection() {
    const [genres, setGenres] = useState<Genre[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Modern gradient colors with better contrast
    const gradientColors = [
        "from-blue-600 via-blue-500 to-purple-600",
        "from-purple-600 via-pink-500 to-red-500", 
        "from-green-600 via-emerald-500 to-teal-600",
        "from-orange-600 via-red-500 to-pink-600",
        "from-indigo-600 via-purple-500 to-pink-600",
        "from-pink-600 via-rose-500 to-orange-500",
        "from-gray-700 via-gray-600 to-slate-600",
        "from-cyan-600 via-blue-500 to-indigo-600",
        "from-emerald-600 via-green-500 to-teal-600",
        "from-violet-600 via-purple-500 to-indigo-600",
        "from-amber-600 via-orange-500 to-red-600",
        "from-teal-600 via-cyan-500 to-blue-600"
    ]

 
    // Get gradient color for genre by index
    const getGradientColor = (index: number) => {
        return gradientColors[index % gradientColors.length]
    }


    useEffect(() => {
        const loadGenres = async () => {
            try {
                setLoading(true)
                const genresData = await fetchGenres()
                // Display all genres from API
                setGenres(genresData)
            } catch (err) {
                setError('Không thể tải danh sách thể loại')
                console.error('Error loading genres:', err)
            } finally {
                setLoading(false)
            }
        }

        loadGenres()
    }, [])

    if (loading) {
        return (
            <section className="space-y-6 sm:space-y-8">
                <SectionHeader 
                    title="Thể loại phim" 
                    subtitle="Khám phá theo sở thích của bạn"
                    icon={Film}
                />
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
                    {Array.from({ length: 24 }).map((_, i) => (
                        <Skeleton key={i} className="h-32 rounded-xl" />
                    ))}
                </div>
            </section>
        )
    }

    if (error) {
        return (
            <section className="space-y-6 sm:space-y-8">
                <SectionHeader 
                    title="Thể loại phim" 
                    subtitle="Khám phá theo sở thích của bạn"
                    icon={Film}
                />
                <div className="text-center py-12">
                    <p className="text-muted-foreground">{error}</p>
                </div>
            </section>
        )
    }

    return (
        <section className="space-y-6 sm:space-y-8">
            <SectionHeader 
                title="Thể loại phim" 
                subtitle="Khám phá theo sở thích của bạn"
                icon={Film}
            />
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
                {genres.map((genre, index) => {
                    const gradientColor = getGradientColor(index)
                    
                    return (
                        <Link key={genre._id} href={`/genre/${genre.slug}`}>
                            <Card className="group cursor-pointer transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-primary/20 border-0 overflow-hidden h-32 relative">
                                <CardContent className="p-0 h-full relative">
                                    {/* Background with gradient */}
                                    <div className={`bg-gradient-to-br ${gradientColor} h-full flex flex-col items-center justify-center text-white relative overflow-hidden rounded-lg`}>
                                        {/* Animated background pattern */}
                                        <div className="absolute inset-0 opacity-10">
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
                                            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(45deg,transparent_30%,rgba(255,255,255,0.1)_50%,transparent_70%)] transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                        </div>
                                        
                                        {/* Overlay */}
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300 rounded-lg" />
                                        
                                        {/* Content */}
                                        <div className="relative z-10 text-center px-3 space-y-2">
                                            <h3 className="font-bold text-sm sm:text-base leading-tight line-clamp-2">
                                                {genre.name}
                                            </h3>
                                            <div className="flex items-center justify-center text-xs opacity-80 group-hover:opacity-100 transition-opacity duration-300">
                                                <span className="mr-1">Khám phá</span>
                                                <ChevronRight className="h-3 w-3 transform group-hover:translate-x-1 transition-transform duration-300" />
                                            </div>
                                        </div>

                                        {/* Hover effect border */}
                                        <div className="absolute inset-0 border-2 border-white/0 group-hover:border-white/30 rounded-lg transition-colors duration-300" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    )
                })}
            </div>
        </section>
    )
}