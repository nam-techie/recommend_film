'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Grid3X3, Users, MessageCircle, Play, Crown, Clock, Globe, Heart, Star } from 'lucide-react'
import Link from 'next/link'
import { database } from '@/lib/firebase'
import { ref, onValue, off } from 'firebase/database'
import { cleanupExpiredRooms } from '@/lib/watch-party-utils'

interface WatchRoom {
  id: string
  roomName?: string // Tên phòng tùy chỉnh (mặc định dùng movie title)
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

export default function GenresUpgradePage() {
  const [activeRooms, setActiveRooms] = useState<WatchRoom[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Load active rooms from Firebase
  useEffect(() => {
    // Run cleanup first to remove expired rooms
    cleanupExpiredRooms()
    
    if (!database) {
      console.log('Firebase not initialized, using demo rooms')
      setActiveRooms(demoRooms)
      setIsLoading(false)
      return
    }

    const roomsRef = ref(database, 'rooms')
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const rooms = Object.values(data) as WatchRoom[]
        // Filter out expired rooms (older than 4 hours)
        const ROOM_DURATION = 4 * 60 * 60 * 1000 // 4 hours
        const activeRooms = rooms.filter(room => 
          Date.now() - room.createdAt < ROOM_DURATION
        )
        setActiveRooms(activeRooms)
      } else {
        setActiveRooms([])
      }
      setIsLoading(false)
    })

    return () => off(roomsRef, 'value', unsubscribe)
  }, [])

  // Demo rooms for when Firebase is not available
  const demoRooms: WatchRoom[] = [
    {
      id: 'room_demo_1',
      roomName: 'Phòng Avatar của Khang', // Tên phòng tùy chỉnh
      movie: {
        slug: 'co-rong-hau-gai-cua-kobayashi-phan-2',
        title: 'Cô Rồng Hầu Gái Của Kobayashi (Phần 2)',
        poster: 'https://s.tmdb.org/t/p/w600_and_h900_bestv2/v0bBozhJ1PiBkYvPD7M4U6yq4A2.jpg',
        videoUrl: 'https://vidsrc.xyz/embed/tv/kobayashi-san-chi-no-maid-dragon-s/2'
      },
      playback: { currentTime: 1800, isPlaying: true, lastUpdated: Date.now(), updatedBy: 'host1' },
      users: { 
        'host1': { name: 'Minh Khang', isHost: true, lastSeen: Date.now() - 30000 }, // Active 30s ago
        'user2': { name: 'Thanh Hoa', lastSeen: Date.now() - 60000 }, // Active 1m ago  
        'user3': { name: 'Khách 127', lastSeen: Date.now() - 600000 } // Inactive 10m ago
      },
      messages: { 'msg1': { text: 'Anime này hay quá!' } },
      createdAt: Date.now() - 30 * 60 * 1000,
      hostId: 'host1'
    },
    {
      id: 'room_demo_2',
      movie: {
        slug: 'co-rong-hau-gai-cua-kobayashi-phan-1', 
        title: 'Cô Rồng Hầu Gái Của Kobayashi (Phần 1)',
        poster: 'https://s.tmdb.org/t/p/w600_and_h900_bestv2/lbdzLXmBV2VSD9nkETdc4j5cWs0.jpg',
        videoUrl: 'https://vidsrc.xyz/embed/tv/kobayashi-san-chi-no-maid-dragon/1'
      },
      playback: { currentTime: 0, isPlaying: false, lastUpdated: Date.now(), updatedBy: 'host2' },
      users: {
        'host2': { name: 'Phương Nam', isHost: true, lastSeen: Date.now() - 10000 }, // Active 10s ago
        'user4': { name: 'Anna Nguyen', lastSeen: Date.now() - 45000 } // Active 45s ago
      },
      messages: { 'msg2': { text: 'Chuẩn bị xem season 1 nhé!' } },
      createdAt: Date.now() - 5 * 60 * 1000,
      hostId: 'host2'
    }
  ]

  const filteredRooms = activeRooms.filter(room =>
    room.movie.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getTimeAgo = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / (1000 * 60))
    if (minutes < 1) return 'Vừa tạo'
    if (minutes < 60) return `${minutes} phút trước`
    const hours = Math.floor(minutes / 60)
    return `${hours} giờ trước`
  }

  // Count active users (last seen within 2 minutes)
  const getActiveUserCount = (room: WatchRoom) => {
    if (!room.users) return 0
    const now = Date.now()
    const ACTIVE_THRESHOLD = 2 * 60 * 1000 // 2 minutes
    
    return Object.values(room.users).filter((user: any) => {
      if (!user.lastSeen) return false
      return (now - user.lastSeen) <= ACTIVE_THRESHOLD
    }).length
  }

  // Get host name safely
  const getHostName = (room: WatchRoom) => {
    if (!room.users || !room.hostId) return 'Unknown'
    const host = room.users[room.hostId]
    return host?.name || 'Unknown'
  }

  // Get room display name
  const getRoomDisplayName = (room: WatchRoom) => {
    return room.roomName || room.movie.title
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <SectionHeader 
        title="Xem Chung" 
        subtitle="Tạo phòng hoặc tham gia phòng có sẵn"
        icon={Grid3X3}
        showViewAll={false}
      />
      
      {/* Create Room Section */}
      <div className="mt-12 mb-16">
        <Card className="border-0 bg-gradient-to-br from-primary/5 via-purple-500/5 to-yellow-500/5 shadow-2xl">
          <CardContent className="p-8 lg:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              {/* Left: Content */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                    <Crown className="h-4 w-4" />
                    Tạo phòng mới
                  </div>
                  <h2 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary via-purple-600 to-yellow-500 bg-clip-text text-transparent">
                    Xem phim cùng bạn bè
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Tạo phòng riêng tư để xem phim cùng bạn bè. Chat real-time, đồng bộ video tự động và chia sẻ những khoảnh khắc thú vị!
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">✨ Tính năng nổi bật:</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Đồng bộ video real-time</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Chat trực tiếp trong phim</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Phòng riêng tư & bảo mật</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span>Chia sẻ link dễ dàng</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button asChild className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg">
                    <Link href="/">
                      <Play className="h-4 w-4 mr-2" />
                      Chọn phim để tạo phòng
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/ai-recommender">
                      <Star className="h-4 w-4 mr-2" />
                      AI gợi ý phim
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Right: Visual */}
              <div className="relative">
                <div className="relative mx-auto w-full max-w-sm">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-purple-600 rounded-3xl blur-3xl opacity-20"></div>
                  <Card className="relative border-0 shadow-2xl">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-primary to-purple-600 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold">Phòng của bạn</p>
                            <p className="text-xs text-muted-foreground">3 người đang xem</p>
                          </div>
                        </div>
                        <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 rounded-lg flex items-center justify-center">
                          <Play className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span>Live • Đang phát</span>
                          </div>
                          <div className="space-y-1">
                            <div className="h-2 bg-muted rounded w-full"></div>
                            <div className="h-2 bg-muted rounded w-2/3"></div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Rooms Section */}
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Phòng đang hoạt động</h2>
            <p className="text-muted-foreground">Tham gia phòng có sẵn hoặc tạo phòng mới</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Input
              placeholder="Tìm kiếm phim..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full lg:w-64"
            />
            <Badge variant="secondary" className="whitespace-nowrap">
              {filteredRooms.length} phòng
            </Badge>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
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
        ) : filteredRooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map((room) => (
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
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = '<div class="text-4xl">🎬</div>';
                              }
                            }}
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

                      {/* Progress bar */}
                      {room.playback.currentTime > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                          <div 
                            className="h-full bg-primary"
                            style={{ width: `${Math.min((room.playback.currentTime / 7200) * 100, 100)}%` }}
                          ></div>
                        </div>
                      )}
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
                        
                        {room.playback.currentTime > 0 && (
                          <div className="flex items-center gap-1">
                            <Play className="h-3 w-3" />
                            <span>{formatTime(room.playback.currentTime)}</span>
                          </div>
                        )}
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
          <Card className="p-12 text-center">
            <div className="space-y-4">
              <div className="text-6xl">🎭</div>
              <h3 className="text-xl font-semibold">Chưa có phòng nào</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {searchTerm ? 
                  `Không tìm thấy phòng nào với từ khóa "${searchTerm}"` : 
                  'Hãy là người đầu tiên tạo phòng xem chung!'
                }
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