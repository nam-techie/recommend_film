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
                {genres.map((genre) => {
                    return (
                        <Link key={genre._id} href={`/genre/${genre.slug}`}>
                            <Card className="group h-32 relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-primary/20 hover:shadow-lg border-border/40 bg-card/40 backdrop-blur-md">
                                <CardContent className="p-0 h-full">
                                    <div className="h-full w-full flex flex-col items-center justify-center relative overflow-hidden p-4">
                                        {/* Subtle background glow on hover */}
                                        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors duration-300 pointer-events-none" />
                                        
                                        {/* Content border decoration top-left */}
                                        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/0 group-hover:border-primary/50 rounded-tl-lg transition-colors duration-500 m-2" />
                                        {/* Content border decoration bottom-right */}
                                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/0 group-hover:border-primary/50 rounded-br-lg transition-colors duration-500 m-2" />

                                        {/* Content */}
                                        <div className="relative z-10 flex flex-col items-center gap-3">
                                            <h3 className="font-bold text-sm sm:text-base leading-tight line-clamp-2 text-foreground/80 group-hover:text-primary transition-colors duration-300 text-center">
                                                {genre.name}
                                            </h3>
                                            <div className="flex items-center justify-center text-[10px] sm:text-xs text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                                                <span className="mr-1">Khám phá</span>
                                                <ChevronRight className="h-3 w-3 transform group-hover:translate-x-1 transition-transform duration-300" />
                                            </div>
                                        </div>

                                        {/* Decorative gradient blur */}
                                        <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
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