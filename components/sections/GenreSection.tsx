'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Film } from 'lucide-react'
import { fetchGenres, Genre } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'

export function GenreSection() {
    const [genres, setGenres] = useState<Genre[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Gradient colors for genre cards - modern style without emojis
    const gradientColors = [
        "from-blue-500 to-purple-600",
        "from-purple-500 to-pink-600", 
        "from-green-500 to-teal-600",
        "from-orange-500 to-red-600",
        "from-indigo-500 to-blue-600",
        "from-pink-500 to-rose-600",
        "from-gray-500 to-slate-600",
        "from-cyan-500 to-blue-500",
        "from-emerald-500 to-green-600",
        "from-violet-500 to-purple-600",
        "from-amber-500 to-orange-600",
        "from-teal-500 to-cyan-600"
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
            <section className="space-y-4 sm:space-y-6">
                <SectionHeader 
                    title="Thể loại phim" 
                    subtitle="Khám phá theo sở thích của bạn"
                    icon={Film}
                />
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
                    {Array.from({ length: 24 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 sm:h-20 rounded-lg" />
                    ))}
                </div>
            </section>
        )
    }

    if (error) {
        return (
            <section className="space-y-4 sm:space-y-6">
                <SectionHeader 
                    title="Thể loại phim" 
                    subtitle="Khám phá theo sở thích của bạn"
                    icon={Film}
                />
                <div className="text-center py-8 sm:py-12">
                    <p className="text-muted-foreground text-sm sm:text-base">{error}</p>
                </div>
            </section>
        )
    }

    return (
        <section className="space-y-4 sm:space-y-6">
            <SectionHeader 
                title="Thể loại phim" 
                subtitle="Khám phá theo sở thích của bạn"
                icon={Film}
            />
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
                {genres.map((genre, index) => {
                    const gradientColor = getGradientColor(index)
                    return (
                        <Link key={genre._id} href={`/genre/${genre.slug}`}>
                            <Card className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg border-0 overflow-hidden h-16 sm:h-20">
                                <CardContent className="p-0 h-full">
                                    <div className={`bg-gradient-to-br ${gradientColor} h-full flex items-center justify-center text-white relative overflow-hidden rounded-lg`}>
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors rounded-lg" />
                                        <div className="relative z-10 text-center px-3">
                                            <h3 className="font-semibold text-xs sm:text-sm leading-tight">
                                                {genre.name}
                                            </h3>
                                            <div className="text-xs opacity-80 mt-1 hidden sm:block">
                                                Xem chi tiết →
                                            </div>
                                        </div>
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