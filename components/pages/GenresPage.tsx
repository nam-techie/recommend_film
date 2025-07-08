'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { fetchGenres, Genre } from '@/lib/api'
import { Grid3X3, ChevronRight, Hash, Users, MessageCircle, Play, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { database } from '@/lib/firebase'
import { ref, onValue, off } from 'firebase/database'

interface WatchRoom {
    id: string
    roomName?: string
    movie: {
        slug: string
        title: string
        poster?: string
        videoUrl?: string
    }
    playback: {
        currentTime: number
        isPlaying: boolean
        lastUpdated: number
        updatedBy: string
    }
    users: Record<string, any>
    messages: Record<string, any>
    createdAt: number
    hostId: string
}

export function GenresPage() {
    const [genres, setGenres] = useState<Genre[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeRooms, setActiveRooms] = useState<WatchRoom[]>([])
    const [roomsLoading, setRoomsLoading] = useState(true)

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

    // Helper functions for watch rooms
    const getActiveUserCount = (room: WatchRoom) => {
        if (!room.users) return 0
        const now = Date.now()
        const ACTIVE_THRESHOLD = 2 * 60 * 1000 // 2 minutes
        
        return Object.values(room.users).filter((user: any) => {
            if (!user.lastSeen) return false
            return (now - user.lastSeen) <= ACTIVE_THRESHOLD
        }).length
    }

    const getHostName = (room: WatchRoom) => {
        if (!room.users || !room.hostId) return 'Unknown'
        const host = room.users[room.hostId]
        return host?.name || 'Unknown'
    }

    const getRoomDisplayName = (room: WatchRoom) => {
        return room.roomName || room.movie.title
    }

    const getTimeAgo = (timestamp: number) => {
        const minutes = Math.floor((Date.now() - timestamp) / (1000 * 60))
        if (minutes < 1) return 'Vừa tạo'
        if (minutes < 60) return `${minutes} phút trước`
        const hours = Math.floor(minutes / 60)
        return `${hours} giờ trước`
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

    // Load active watch party rooms
    useEffect(() => {
        if (!database) {
            // Demo rooms if Firebase not available
            const demoRooms: WatchRoom[] = [
                {
                    id: 'room_demo_1',
                    roomName: 'Phòng Anime của Khang 🐉',
                    movie: {
                        slug: 'co-rong-hau-gai-cua-kobayashi-phan-2',
                        title: 'Cô Rồng Hầu Gái Của Kobayashi (Phần 2)',
                        poster: 'https://s.tmdb.org/t/p/w600_and_h900_bestv2/v0bBozhJ1PiBkYvPD7M4U6yq4A2.jpg',
                        videoUrl: 'https://vidsrc.xyz/embed/tv/kobayashi-san-chi-no-maid-dragon-s/2'
                    },
                    playback: { currentTime: 1800, isPlaying: true, lastUpdated: Date.now(), updatedBy: 'host1' },
                    users: { 
                        'host1': { name: 'Minh Khang', isHost: true, lastSeen: Date.now() - 30000 },
                        'user2': { name: 'Thanh Hoa', lastSeen: Date.now() - 60000 }
                    },
                    messages: { 'msg1': { text: 'Anime này hay quá!' } },
                    createdAt: Date.now() - 30 * 60 * 1000,
                    hostId: 'host1'
                },
                {
                    id: 'room_demo_2',
                    roomName: 'Xem cùng Nam và bạn bè',
                    movie: {
                        slug: 'co-rong-hau-gai-cua-kobayashi-phan-1',
                        title: 'Cô Rồng Hầu Gái Của Kobayashi (Phần 1)',
                        poster: 'https://s.tmdb.org/t/p/w600_and_h900_bestv2/lbdzLXmBV2VSD9nkETdc4j5cWs0.jpg',
                        videoUrl: 'https://vidsrc.xyz/embed/tv/kobayashi-san-chi-no-maid-dragon/1'
                    },
                    playback: { currentTime: 0, isPlaying: false, lastUpdated: Date.now(), updatedBy: 'host2' },
                    users: {
                        'host2': { name: 'Phương Nam', isHost: true, lastSeen: Date.now() - 10000 },
                        'user4': { name: 'Anna Nguyen', lastSeen: Date.now() - 45000 }
                    },
                    messages: { 'msg2': { text: 'Chuẩn bị xem season 1 nhé!' } },
                    createdAt: Date.now() - 5 * 60 * 1000,
                    hostId: 'host2'
                }
            ]
            setActiveRooms(demoRooms)
            setRoomsLoading(false)
            return
        }

        const roomsRef = ref(database, 'rooms')
        const unsubscribe = onValue(roomsRef, (snapshot) => {
            const data = snapshot.val()
            if (data) {
                const rooms = Object.values(data) as WatchRoom[]
                // Filter out expired rooms and sort by creation time
                const ROOM_DURATION = 4 * 60 * 60 * 1000 // 4 hours
                const activeRooms = rooms
                    .filter(room => Date.now() - room.createdAt < ROOM_DURATION)
                    .sort((a, b) => b.createdAt - a.createdAt) // Newest first
                setActiveRooms(activeRooms)
            } else {
                setActiveRooms([])
            }
            setRoomsLoading(false)
        })

        return () => off(roomsRef, 'value', unsubscribe)
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

            {/* Watch Party Rooms Section */}
            <div className="mt-16">
                <div className="flex items-center justify-between mb-8">
                    <SectionHeader 
                        title="Phòng Xem Chung" 
                        subtitle={`${activeRooms.length} phòng đang hoạt động`}
                        icon={Users}
                        showViewAll={false}
                    />
                    <Button asChild>
                        <Link href="/watch-party">
                            Xem tất cả
                        </Link>
                    </Button>
                </div>

                {roomsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Card key={i} className="animate-pulse">
                                <CardContent className="p-6">
                                    <div className="space-y-4">
                                        <div className="h-48 bg-muted rounded-lg"></div>
                                        <div className="space-y-2">
                                            <div className="h-4 bg-muted rounded w-3/4"></div>
                                            <div className="h-3 bg-muted rounded w-1/2"></div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : activeRooms.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activeRooms.slice(0, 3).map((room) => (
                            <Card key={room.id} className="group hover:shadow-lg transition-all duration-300 border-0 bg-card/50">
                                <CardContent className="p-0">
                                    <Link href={`/watch-party/${room.id}`}>
                                        <div className="relative">
                                            <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 rounded-t-lg flex items-center justify-center overflow-hidden">
                                                {room.movie.poster ? (
                                                    <img 
                                                        src={room.movie.poster} 
                                                        alt={room.movie.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                ) : (
                                                    <div className="text-4xl">🎬</div>
                                                )}
                                            </div>
                                            
                                            {/* Status badges */}
                                            <div className="absolute top-3 left-3 flex gap-2">
                                                {room.playback.isPlaying ? (
                                                    <Badge className="bg-red-500 text-white animate-pulse shadow-lg border-0">
                                                        <div className="w-2 h-2 bg-white rounded-full animate-ping mr-1"></div>
                                                        LIVE
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-gray-500/80 text-white">
                                                        <div className="w-2 h-2 bg-yellow-400 rounded-full mr-1"></div>
                                                        Tạm dừng
                                                    </Badge>
                                                )}
                                                
                                                {getActiveUserCount(room) > 3 && (
                                                    <Badge className="bg-orange-500 text-white text-xs">
                                                        🔥 HOT
                                                    </Badge>
                                                )}
                                            </div>
                                            
                                            <div className="absolute top-3 right-3">
                                                <Badge variant="secondary" className="bg-black/50 text-white">
                                                    <Users className="h-3 w-3 mr-1" />
                                                    {getActiveUserCount(room)}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="p-4 space-y-3">
                                            <div>
                                                <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                                                    {getRoomDisplayName(room)}
                                                </h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Host: {getHostName(room)}
                                                </p>
                                                {room.roomName && (
                                                    <p className="text-xs text-muted-foreground/70">
                                                        📺 {room.movie.title}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    <span>{getTimeAgo(room.createdAt)}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <MessageCircle className="h-3 w-3" />
                                                    <span>{Object.keys(room.messages || {}).length} tin nhắn</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Users className="h-3 w-3" />
                                                    <span>{getActiveUserCount(room)} đang xem</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="p-8 text-center">
                        <div className="space-y-4">
                            <div className="text-4xl">🎭</div>
                            <h3 className="text-lg font-semibold">Chưa có phòng nào</h3>
                            <p className="text-muted-foreground">
                                Hãy là người đầu tiên tạo phòng xem chung!
                            </p>
                            <Button asChild>
                                <Link href="/">
                                    <Play className="h-4 w-4 mr-2" />
                                    Tạo phòng đầu tiên
                                </Link>
                            </Button>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    )
} 