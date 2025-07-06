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

    // Predefined genre colors and emojis
    const genreStyles: { [key: string]: { color: string; emoji: string } } = {
        'hanh-dong': { color: "from-red-500 to-orange-500", emoji: "💥" },
        'hai': { color: "from-yellow-500 to-orange-500", emoji: "😂" },
        'chinh-kich': { color: "from-blue-500 to-purple-500", emoji: "🎭" },
        'kinh-di': { color: "from-purple-500 to-pink-500", emoji: "👻" },
        'tinh-cam': { color: "from-pink-500 to-red-500", emoji: "💕" },
        'khoa-hoc-vien-tuong': { color: "from-cyan-500 to-blue-500", emoji: "🚀" },
        'phieu-luu': { color: "from-green-500 to-teal-500", emoji: "🗺️" },
        'hoat-hinh': { color: "from-indigo-500 to-purple-500", emoji: "🎨" },
        'tai-lieu': { color: "from-gray-500 to-slate-500", emoji: "📚" },
        'gia-dinh': { color: "from-emerald-500 to-green-500", emoji: "👨‍👩‍👧‍👦" },
        'bi-an': { color: "from-slate-500 to-gray-500", emoji: "🔍" },
        'am-nhac': { color: "from-violet-500 to-purple-500", emoji: "🎵" }
    }

    // Default style for unknown genres
    const getGenreStyle = (slug: string) => {
        return genreStyles[slug] || { 
            color: "from-gray-500 to-slate-500", 
            emoji: "🎬" 
        }
    }

    useEffect(() => {
        const loadGenres = async () => {
            try {
                setLoading(true)
                const genresData = await fetchGenres()
                // Take first 12 genres for display
                setGenres(genresData.slice(0, 12))
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
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 sm:h-24 rounded-lg" />
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
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
                {genres.map((genre) => {
                    const style = getGenreStyle(genre.slug)
                    return (
                        <Link key={genre._id} href={`/genre/${genre.slug}`}>
                            <Card className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg border-0 overflow-hidden h-20 sm:h-24">
                                <CardContent className="p-0 h-full">
                                    <div className={`bg-gradient-to-br ${style.color} h-full flex flex-col items-center justify-center text-white relative overflow-hidden`}>
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                                        <div className="relative z-10 text-center">
                                            <div className="text-lg sm:text-2xl mb-1">{style.emoji}</div>
                                            <h3 className="font-semibold text-xs sm:text-sm leading-tight px-2">
                                                {genre.name}
                                            </h3>
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