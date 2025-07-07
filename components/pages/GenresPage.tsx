'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { fetchGenres, Genre } from '@/lib/api'
import { Grid3X3, ChevronRight, Hash } from 'lucide-react'
import Link from 'next/link'

export function GenresPage() {
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
            <div className="container mx-auto px-4 py-8">
                <SectionHeader 
                    title="Thể Loại Phim" 
                    subtitle="Khám phá theo sở thích của bạn"
                    icon={Grid3X3}
                />
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 mt-8">
                    {Array.from({ length: 24 }).map((_, i) => (
                        <Skeleton key={i} className="h-32 rounded-xl" />
                    ))}
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <SectionHeader 
                    title="Thể Loại Phim" 
                    subtitle="Khám phá theo sở thích của bạn"
                    icon={Grid3X3}
                />
                <div className="text-center py-12">
                    <p className="text-muted-foreground">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <SectionHeader 
                title="Thể Loại Phim" 
                subtitle={`Khám phá ${genres.length} thể loại phim đa dạng theo sở thích của bạn`}
                icon={Grid3X3}
                showViewAll={false}
            />
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 mt-8">
                {genres.map((genre, index) => {
                    const gradientClass = getGradientColor(index)
                    
                    return (
                        <Link key={genre._id} href={`/genre/${genre.slug}`}>
                            <Card className="group h-32 relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl border-0">
                                <CardContent className="p-0 h-full">
                                    <div className={`h-full w-full bg-gradient-to-br ${gradientClass} flex flex-col items-center justify-center text-white relative overflow-hidden`}>
                                        {/* Background pattern */}
                                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors duration-300" />
                                        
                                        {/* Content */}
                                        <div className="relative z-10 text-center px-2">
                                            <h3 className="text-xs sm:text-sm font-bold leading-tight line-clamp-2 group-hover:scale-105 transition-transform duration-300">
                                                {genre.name}
                                            </h3>
                                        </div>

                                        {/* Hover arrow */}
                                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <ChevronRight className="h-4 w-4" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    )
                })}
            </div>

            {/* Statistics */}
            <div className="mt-12 text-center">
                <div className="inline-flex items-center space-x-2 bg-muted/50 rounded-full px-6 py-3">
                    <Hash className="h-5 w-5 text-primary" />
                    <span className="text-sm text-muted-foreground">
                        Tổng cộng <span className="font-semibold text-foreground">{genres.length}</span> thể loại phim khác nhau
                    </span>
                </div>
            </div>
        </div>
    )
} 