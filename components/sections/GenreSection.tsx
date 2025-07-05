'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Film } from 'lucide-react'

export function GenreSection() {
    const genres = [
        { id: 1, name: "Hành động", color: "from-red-500 to-orange-500", emoji: "💥" },
        { id: 2, name: "Hài", color: "from-yellow-500 to-orange-500", emoji: "😂" },
        { id: 3, name: "Chính kịch", color: "from-blue-500 to-purple-500", emoji: "🎭" },
        { id: 4, name: "Kinh dị", color: "from-purple-500 to-pink-500", emoji: "👻" },
        { id: 5, name: "Tình cảm", color: "from-pink-500 to-red-500", emoji: "💕" },
        { id: 6, name: "Khoa học viễn tưởng", color: "from-cyan-500 to-blue-500", emoji: "🚀" },
        { id: 7, name: "Phiêu lưu", color: "from-green-500 to-teal-500", emoji: "🗺️" },
        { id: 8, name: "Hoạt hình", color: "from-indigo-500 to-purple-500", emoji: "🎨" },
        { id: 9, name: "Tài liệu", color: "from-gray-500 to-slate-500", emoji: "📚" },
        { id: 10, name: "Gia đình", color: "from-emerald-500 to-green-500", emoji: "👨‍👩‍👧‍👦" },
        { id: 11, name: "Bí ẩn", color: "from-slate-500 to-gray-500", emoji: "🔍" },
        { id: 12, name: "Âm nhạc", color: "from-violet-500 to-purple-500", emoji: "🎵" }
    ]

    return (
        <section className="space-y-6">
            <SectionHeader 
                title="Thể loại phim" 
                subtitle="Khám phá theo sở thích của bạn"
                icon={Film}
            />
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {genres.map((genre) => (
                    <Card key={genre.id} className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg border-0 overflow-hidden">
                        <CardContent className="p-0">
                            <div className={`bg-gradient-to-br ${genre.color} p-6 text-center text-white relative overflow-hidden`}>
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                                <div className="relative z-10">
                                    <div className="text-3xl mb-2">{genre.emoji}</div>
                                    <h3 className="font-semibold text-sm">{genre.name}</h3>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>
    )
}