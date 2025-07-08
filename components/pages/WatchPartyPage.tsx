'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { 
    Users, 
    Send, 
    Copy,
    Crown,
    MessageCircle
} from 'lucide-react'
import Link from 'next/link'
import { useWatchParty } from '@/hooks/useWatchParty'

interface User {
    id: string
    name: string
    isHost?: boolean
    joinedAt: number
}

interface WatchPartyPageProps {
    movieSlug?: string
    roomId?: string
}

export default function WatchPartyPage({ movieSlug, roomId }: WatchPartyPageProps) {
    // States
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [userName, setUserName] = useState('')
    const [isAnonymous, setIsAnonymous] = useState(true)
    const [message, setMessage] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showChat, setShowChat] = useState(true)
    
    // Refs
    const videoRef = useRef<HTMLIFrameElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null) // Keep for potential future use
    
    // Check for auto-join from sessionStorage
    useEffect(() => {
        const autoJoin = sessionStorage.getItem('watch_party_auto_join')
        const userInfo = sessionStorage.getItem('watch_party_user')
        
        if (autoJoin === 'true' && userInfo) {
            try {
                const user = JSON.parse(userInfo)
                setCurrentUser(user)
                console.log('🔄 Auto-joining with stored user:', user)
                
                // Clean up sessionStorage after use
                sessionStorage.removeItem('watch_party_auto_join')
                sessionStorage.removeItem('watch_party_user')
            } catch (err) {
                console.error('Failed to parse stored user info:', err)
            }
        }
    }, [])
    
    // Only init useWatchParty if we have a roomId
    const shouldInitWatchParty = Boolean(roomId && roomId !== 'demo')
    
    // Hook để quản lý watch party
    const {
        room,
        isConnected,
        error: roomError,
        sendMessage: sendMessageHook,

        leaveRoom,
        isHost,
        userCount,
        messageCount
    } = useWatchParty({
        roomId: roomId || 'placeholder', // Use placeholder when no roomId
        userId: currentUser?.id || '',
        userName: currentUser?.name || '',
        mode: shouldInitWatchParty ? 'firebase' : 'demo' // Only use Firebase when we have real roomId
    })
    
    // Debug logging
    useEffect(() => {
        console.log('🔥 Watch Party Debug:', {
            roomId,
            shouldInitWatchParty,
            currentUser,
            room,
            isConnected,
            roomError,
            userCount,
            messageCount
        })
    }, [roomId, shouldInitWatchParty, currentUser, room, isConnected, roomError, userCount, messageCount])

    // Clean up movie video URL from sessionStorage after first render
    useEffect(() => {
        if (room && sessionStorage.getItem('movie_video_url')) {
            // Clean up after video is loaded
            const timer = setTimeout(() => {
                sessionStorage.removeItem('movie_video_url')
                console.log('🧹 Cleaned up movie_video_url from sessionStorage')
            }, 5000) // Clean up after 5 seconds
            
            return () => clearTimeout(timer)
        }
    }, [room])

    // Auto scroll chat to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [room?.messages])

    // Video synchronization when joining room
    useEffect(() => {
        if (room && currentUser && !isHost) {
            // Non-host users: sync to current video time
            const currentVideoTime = room.playback?.currentTime || 0
            console.log(`🎬 Syncing video to ${currentVideoTime}s for non-host user`)
            
            // Send system message about user joining and sync instructions
            if ((room?.users && Object.keys(room.users).length > 1)) {
                const joinMessage = `${currentUser.name} đã tham gia phòng! 👋`
                const syncMessage = currentVideoTime > 30 ? 
                    `⚡ Cần tua video đến ${Math.floor(currentVideoTime / 60)}:${String(Math.floor(currentVideoTime % 60)).padStart(2, '0')} để xem cùng host!` :
                    ``
                
                setTimeout(() => {
                    sendMessageHook(joinMessage, currentVideoTime)
                    if (syncMessage) {
                        setTimeout(() => {
                            sendMessageHook(syncMessage, currentVideoTime)
                        }, 500)
                    }
                }, 1000)
            }
        }
    }, [room?.id, currentUser?.id, isHost])

    // Video synchronization when joining room
    useEffect(() => {
        if (room && currentUser && !isHost) {
            // Non-host users: sync to current video time
            const currentVideoTime = room.playback?.currentTime || 0
            console.log(`🎬 Syncing video to ${currentVideoTime}s for non-host user`)
            
            // Send system message about user joining
            if ((room?.users && Object.keys(room.users).length > 1)) {
                const joinMessage = `${currentUser.name} đã tham gia phòng! 👋`
                setTimeout(() => {
                    sendMessageHook(joinMessage, currentVideoTime)
                }, 1000)
            }
        }
    }, [room?.id, currentUser?.id, isHost])

    // Join room
    const handleJoinRoom = () => {
        if (!userName.trim() && !isAnonymous) return
        
        const newUser: User = {
            id: `user_${Date.now()}`,
            name: isAnonymous ? `Khách ${Math.floor(Math.random() * 1000)}` : userName.trim(),
            joinedAt: Date.now()
        }
        
        setCurrentUser(newUser)
        setIsLoading(false)
        
        // Show success message
        console.log('Joining Firebase room with user:', newUser)
    }

    // Send message
    const handleSendMessage = () => {
        if (!message.trim() || !currentUser) return
        
        // Add video timestamp to message
        const messageWithTimestamp = {
            text: message.trim(),
            videoTime: room?.playback?.currentTime || 0
        }
        
        sendMessageHook(messageWithTimestamp.text, messageWithTimestamp.videoTime)
        setMessage('')
    }

    // Copy room link
    const handleCopyRoomLink = () => {
        const roomLink = `${window.location.origin}/watch-party/${room?.id}`
        navigator.clipboard.writeText(roomLink)
        // Show toast notification
    }

    // Handle leaving room
    const handleLeaveRoom = () => {
        if (currentUser) {
            leaveRoom()
        }
    }

    // Room expiration helpers
    const getRoomTimeRemaining = () => {
        if (!room) return null
        
        const ROOM_DURATION = 4 * 60 * 60 * 1000 // 4 hours
        const elapsed = Date.now() - room.createdAt
        const remaining = ROOM_DURATION - elapsed
        
        if (remaining <= 0) return 'Đã hết hạn'
        
        const hours = Math.floor(remaining / (60 * 60 * 1000))
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))
        
        if (hours > 0) {
            return `${hours}h ${minutes}m còn lại`
        }
        return `${minutes}m còn lại`
    }

    const isRoomExpired = () => {
        if (!room) return false
        const ROOM_DURATION = 4 * 60 * 60 * 1000 // 4 hours  
        return Date.now() - room.createdAt > ROOM_DURATION
    }

    // If no roomId provided, show homepage/landing
    if (!roomId || roomId === 'demo') {
        return (
            <div className="container mx-auto px-4 py-8">
                <SectionHeader 
                    title="Xem Chung" 
                    subtitle="Tạo phòng xem phim cùng bạn bè"
                    icon={Users}
                    showViewAll={false}
                />
                
                <div className="mt-12 max-w-4xl mx-auto">
                    <div className="text-center space-y-8">
                        <div className="text-6xl mb-6">🎬</div>
                        <h2 className="text-3xl font-bold text-white mb-4">Chào mừng đến với Watch Party!</h2>
                        <p className="text-xl text-gray-300 mb-8 leading-relaxed max-w-2xl mx-auto">
                            Xem phim cùng bạn bè với chat real-time và đồng bộ video. 
                            Tạo phòng riêng hoặc tham gia phòng có sẵn.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                            <Card className="p-6 hover:bg-muted/50 transition-colors">
                                <CardContent className="text-center space-y-4">
                                    <div className="text-4xl">🏠</div>
                                    <h3 className="text-lg font-semibold">Tạo phòng mới</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Chọn phim và tạo phòng để mời bạn bè
                                    </p>
                                    <Button asChild className="w-full">
                                        <Link href="/">
                                            Chọn phim
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                            
                            <Card className="p-6 hover:bg-muted/50 transition-colors">
                                <CardContent className="text-center space-y-4">
                                    <div className="text-4xl">🔗</div>
                                    <h3 className="text-lg font-semibold">Có link phòng?</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Paste link vào browser để tham gia
                                    </p>
                                    <Button variant="outline" className="w-full" disabled>
                                        Paste link ở thanh địa chỉ
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                        
                        <div className="mt-12 p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
                            <h3 className="text-lg font-semibold text-blue-400 mb-2">💡 Cách sử dụng:</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-300">
                                <div>
                                    <strong>1. Chọn phim</strong><br/>
                                    Vào trang chi tiết phim bất kỳ
                                </div>
                                <div>
                                    <strong>2. Tạo phòng</strong><br/>
                                    Click "Xem chung" và tạo room
                                </div>
                                <div>
                                    <strong>3. Mời bạn bè</strong><br/>
                                    Chia sẻ link phòng với mọi người
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!room && !roomError) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center py-20">
                    <div className="animate-spin inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full mb-6"></div>
                    <h2 className="text-2xl font-bold text-white mb-4">Đang tải phòng xem...</h2>
                    <p className="text-gray-400">
                        {isConnected ? 'Đang đồng bộ dữ liệu...' : 'Đang kết nối...'}
                    </p>
                </div>
            </div>
        )
    }

    if (roomError || !room) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center py-20">
                    <div className="text-6xl mb-6">⚠️</div>
                    <h2 className="text-2xl font-bold text-white mb-4">Không thể tải phòng</h2>
                    <p className="text-gray-400 mb-6">{roomError || 'Phòng không tồn tại hoặc đã bị xóa'}</p>
                    
                    {roomError?.includes('Firebase') && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6 max-w-md mx-auto">
                            <h3 className="font-semibold text-yellow-400 mb-2">🔥 Firebase Connection Issue</h3>
                            <p className="text-sm text-yellow-300">
                                Có vấn đề kết nối Firebase. Vui lòng:
                            </p>
                            <ul className="text-xs text-yellow-200 mt-2 space-y-1 text-left">
                                <li>• Kiểm tra environment variables</li>
                                <li>• Đảm bảo Firebase project đã được setup</li>
                                <li>• Kiểm tra Realtime Database rules</li>
                            </ul>
                        </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button asChild variant="outline">
                            <Link href="/watch-party">
                                Quay lại trang chính
                            </Link>
                        </Button>
                        <Button 
                            onClick={() => window.location.reload()}
                            className="bg-gradient-to-r from-primary to-purple-600"
                        >
                            Thử lại
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    // Check if room is expired
    if (isRoomExpired()) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center py-20">
                    <div className="text-6xl mb-6">⏰</div>
                    <h2 className="text-2xl font-bold text-white mb-4">Phòng đã hết hạn</h2>
                    <p className="text-gray-400 mb-6">
                        Phòng này đã hết thời gian hoạt động (4 giờ). 
                        <br />Hãy tạo phòng mới để tiếp tục xem chung.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button asChild variant="outline">
                            <Link href="/genres">
                                Xem phòng khác
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href={`/movie/${room.movie.slug}`}>
                                Tạo phòng mới
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    // Join form
    if (!currentUser) {
        return (
            <div className="min-h-screen bg-black">
                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-6xl mx-auto">
                        {/* Header */}
                        <div className="text-center mb-12">
                            <div className="flex items-center justify-center gap-4 mb-6">
                                <div className="p-3 bg-gradient-to-r from-primary to-purple-600 rounded-xl">
                                    <Users className="h-8 w-8 text-white" />
                                </div>
                                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                                    Xem Chung
                                </h1>
                            </div>
                            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
                                Tham gia phòng xem <span className="font-semibold text-primary">"{room.movie.title}"</span> và trò chuyện cùng bạn bè trong khi xem phim!
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                            {/* Movie Info */}
                            <div className="space-y-6">
                                <Card className="overflow-hidden border border-gray-800 shadow-2xl bg-gray-900">
                                    <CardContent className="p-0">
                                        <div className="relative">
                                            <img 
                                                src={room.movie.poster || 'https://via.placeholder.com/400x600/1a1a1a/666?text=🎬'} 
                                                alt={room.movie.title}
                                                className="w-full h-80 object-cover"
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.src = 'https://via.placeholder.com/400x600/1a1a1a/666?text=🎬';
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                                            <div className="absolute bottom-6 left-6 right-6">
                                                <h2 className="text-2xl font-bold text-white mb-2">{room.movie.title}</h2>
                                                <div className="flex items-center gap-4 text-white/80">
                                                    <div className="flex items-center gap-2">
                                                        <Users className="h-4 w-4" />
                                                        <span className="text-sm font-medium">
                                                            {room?.users ? Object.keys(room.users).length : 0} người đang xem
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                        <span className="text-sm">Đang phát trực tiếp</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                
                                {/* Room Stats */}
                                <div className="grid grid-cols-2 gap-4">
                                    <Card className="p-4 bg-green-500/10 border border-green-500/20">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-500/20 rounded-lg">
                                                <Users className="h-5 w-5 text-green-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-400">Đang xem</p>
                                                <p className="text-lg font-bold text-green-400">{room?.users ? Object.keys(room.users).length : 0}</p>
                                            </div>
                                        </div>
                                    </Card>
                                    <Card className="p-4 bg-blue-500/10 border border-blue-500/20">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                                <MessageCircle className="h-5 w-5 text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-400">Tin nhắn</p>
                                                <p className="text-lg font-bold text-blue-400">{Object.keys(room.messages).length}</p>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            </div>

                            {/* Join Form */}
                            <div>
                                <Card className="border border-gray-800 shadow-2xl bg-gray-900">
                                    <CardContent className="p-8 space-y-6">
                                        <div className="text-center space-y-2">
                                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary to-purple-600 rounded-full mb-4">
                                                <Crown className="h-8 w-8 text-white" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-white">Tham gia ngay</h3>
                                            <p className="text-gray-400">
                                                Chọn cách bạn muốn xuất hiện trong phòng
                                            </p>
                                        </div>

                                        <div className="space-y-6">
                                            {/* Anonymous Option */}
                                            <div className="space-y-4">
                                                <div className="flex items-center space-x-3 p-4 border-2 border-gray-700 rounded-xl cursor-pointer transition-all hover:border-primary bg-gray-800/50"
                                                     onClick={() => setIsAnonymous(true)}>
                                                    <input
                                                        type="radio"
                                                        id="anonymous"
                                                        name="joinType"
                                                        checked={isAnonymous}
                                                        onChange={() => setIsAnonymous(true)}
                                                        className="w-4 h-4 text-primary"
                                                    />
                                                    <div className="flex-1">
                                                        <label htmlFor="anonymous" className="text-sm font-medium cursor-pointer text-white">
                                                            🎭 Tham gia ẩn danh
                                                        </label>
                                                        <p className="text-xs text-gray-400">
                                                            Hệ thống sẽ tự động tạo tên ngẫu nhiên cho bạn
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Named Option */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center space-x-3 p-4 border-2 border-gray-700 rounded-xl cursor-pointer transition-all hover:border-primary bg-gray-800/50"
                                                         onClick={() => setIsAnonymous(false)}>
                                                        <input
                                                            type="radio"
                                                            id="named"
                                                            name="joinType"
                                                            checked={!isAnonymous}
                                                            onChange={() => setIsAnonymous(false)}
                                                            className="w-4 h-4 text-primary"
                                                        />
                                                        <div className="flex-1">
                                                            <label htmlFor="named" className="text-sm font-medium cursor-pointer text-white">
                                                                👤 Sử dụng tên riêng
                                                            </label>
                                                            <p className="text-xs text-gray-400">
                                                                Nhập tên bạn muốn hiển thị trong phòng
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    {!isAnonymous && (
                                                        <div className="ml-7 space-y-2">
                                                            <Input
                                                                placeholder="Ví dụ: Phương Nam, Anna, Khang..."
                                                                value={userName}
                                                                onChange={(e) => setUserName(e.target.value)}
                                                                maxLength={20}
                                                                className="border-2 border-gray-700 bg-gray-800 text-white placeholder-gray-400 focus:border-primary"
                                                            />
                                                            {userName.length > 0 && (
                                                                <p className="text-xs text-gray-400">
                                                                    Tên hiển thị: <span className="font-medium text-primary">{userName}</span>
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Join Button */}
                                            <Button 
                                                onClick={handleJoinRoom}
                                                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg"
                                                disabled={!isAnonymous && !userName.trim()}
                                            >
                                                <Users className="h-5 w-5 mr-3" />
                                                {isAnonymous ? 'Tham gia ẩn danh' : 'Tham gia với tên'}
                                            </Button>

                                            {/* Privacy Note */}
                                            <div className="text-center">
                                                <p className="text-xs text-gray-500">
                                                    🔒 An toàn & riêng tư • Không lưu trữ thông tin cá nhân
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Main watch party interface
    return (
        <div className="min-h-screen bg-black">
            {/* Header */}
            <div className="border-b border-gray-800 bg-black/95 backdrop-blur sticky top-0 z-50">
                <div className="container mx-auto px-6 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Link href="/">
                                <Button variant="outline" size="sm" onClick={handleLeaveRoom} className="text-gray-300 border-gray-600 hover:bg-gray-800">
                                    Thoát phòng
                                </Button>
                            </Link>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="font-bold text-xl text-white">{room.movie.title}</h1>
                                    {isHost && <Badge className="text-xs bg-yellow-500 text-black font-medium">Host</Badge>}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                    <span>
                                        {isConnected ? 'Firebase Real-time' : 'Đang kết nối...'} • 
                                        Phòng: {room.id.slice(-8)} • {userCount} người xem
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleCopyRoomLink}
                                className="text-gray-300 border-gray-600 hover:bg-gray-800"
                            >
                                <Copy className="h-4 w-4 mr-2" />
                                Chia sẻ
                            </Button>
                            
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setShowChat(!showChat)}
                                className={`${showChat ? 'bg-primary text-white' : 'text-gray-300 border-gray-600 hover:bg-gray-800'}`}
                            >
                                <MessageCircle className="h-4 w-4 mr-2" />
                                Chat {!showChat && `(${messageCount})`}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex h-[calc(100vh-80px)]">
                {/* Video player */}
                <div className={`${showChat ? 'flex-1' : 'w-full'} bg-black relative`}>
                    {/* Video container */}
                    <div className="relative w-full h-full flex items-center justify-center">
                        {/* Video iframe - Use real movie URL */}
                        <div className="relative w-full h-full max-w-none">
                            <iframe
                                ref={videoRef}
                                src={
                                    (() => {
                                        const baseUrl = sessionStorage.getItem('movie_video_url') || 
                                                       room.movie.videoUrl || 
                                                       `https://vidsrc.xyz/embed/movie/${room.movie.slug}`
                                        
                                        return baseUrl
                                    })()
                                }
                                title={room.movie.title}
                                className="w-full h-full border-0"
                                allowFullScreen
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            />
                        </div>
                    </div>
                </div>

                {/* Chat sidebar */}
                {showChat && (
                    <div className="w-64 bg-gray-900 border-l border-gray-800 flex flex-col">
                        {/* Chat header with user count */}
                        <div className="px-2 py-1.5 border-b border-gray-800 bg-gray-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <MessageCircle className="h-3 w-3 text-gray-400" />
                                    <span className="text-xs font-medium text-gray-300">Chat ({messageCount})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">{room?.users ? Object.keys(room.users).length : 0} người</span>
                                    <Button 
                                        size="sm" 
                                        variant="ghost"
                                        onClick={() => setShowChat(false)}
                                        className="text-gray-400 hover:text-white h-4 w-4 p-0"
                                    >
                                        ×
                                    </Button>
                                </div>
                            </div>
                        </div>
                        
                        {/* Compact Users list */}
                        <div className="px-2 py-1.5 border-b border-gray-800 bg-gray-800/50">
                            <div className="space-y-1">
                                <div className="text-xs text-gray-400 font-medium">ONLINE ({room?.users ? Object.keys(room.users).length : 0})</div>
                                <div className="flex flex-wrap gap-1">
                                    {room?.users ? Object.values(room.users)
                                        .sort((a, b) => (b.isHost ? 1 : 0) - (a.isHost ? 1 : 0))
                                        .map((user) => {
                                            const isCurrentUser = currentUser ? user.id === currentUser.id : false
                                            const isHost = user.isHost
                                            
                                            return (
                                                <div 
                                                    key={user.id} 
                                                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${
                                                        isHost ? 'bg-yellow-500/20 text-yellow-300' :
                                                        isCurrentUser ? 'bg-primary/20 text-primary' : 
                                                        'bg-gray-700/40 text-gray-300'
                                                    }`}
                                                    title={isHost ? 'Host' : isCurrentUser ? 'Bạn' : 'Viewer'}
                                                >
                                                    {isHost && <Crown className="h-2 w-2" />}
                                                    <span className="truncate max-w-14 text-xs">{user.name}</span>
                                                </div>
                                            )
                                        }) : null}
                                </div>
                            </div>
                        </div>
                        
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-1.5 space-y-1 bg-gray-900">
                            {Object.values(room.messages).map((msg) => {
                                // Check if it's a system message
                                const isSystemMessage = msg.userName === 'System'
                                
                                if (isSystemMessage) {
                                    // System message styling - center
                                    return (
                                        <div key={msg.id} className="flex justify-center my-1">
                                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-full px-2 py-0.5">
                                                <span className="text-xs text-blue-300">{msg.text}</span>
                                            </div>
                                        </div>
                                    )
                                }
                                
                                // Regular user message
                                const isCurrentUser = msg.userName === currentUser?.name
                                const userEntry = room?.users ? Object.keys(room.users).find(id => room.users[id].name === msg.userName) : undefined
                                const isHost = userEntry ? room.users[userEntry]?.isHost : false
                                
                                return (
                                    <div key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-1`}>
                                        <div className={`max-w-[85%] ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                                            {/* Message header */}
                                            <div className={`flex items-center gap-1 mb-0.5 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                                {!isCurrentUser && isHost && <Crown className="h-2 w-2 text-yellow-400" />}
                                                <span className={`text-xs font-medium ${
                                                    isHost ? 'text-yellow-400' : 
                                                    isCurrentUser ? 'text-primary' : 
                                                    'text-gray-300'
                                                }`}>
                                                    {isCurrentUser ? 'Bạn' : msg.userName}
                                                </span>
                                                {msg.videoTime && (
                                                    <span className="text-xs text-gray-500">
                                                        {Math.floor(msg.videoTime / 60)}:{String(Math.floor(msg.videoTime % 60)).padStart(2, '0')}
                                                    </span>
                                                )}
                                                <span className="text-xs text-gray-500">
                                                    {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { 
                                                        hour: '2-digit', 
                                                        minute: '2-digit' 
                                                    })}
                                                </span>
                                            </div>
                                            
                                            {/* Message bubble */}
                                            <div className={`rounded-lg px-2 py-1 text-xs leading-snug ${
                                                isCurrentUser ? 
                                                    'bg-primary text-white' : 
                                                    'bg-gray-700 text-gray-100'
                                            }`}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                        
                        {/* Message input */}
                        <div className="p-1.5 border-t border-gray-800 bg-gray-900">
                            <div className="flex gap-1">
                                <Input
                                    placeholder="Tin nhắn..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                    maxLength={200}
                                    className="h-7 text-xs bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-primary"
                                />
                                <Button 
                                    size="sm"
                                    onClick={handleSendMessage}
                                    disabled={!message.trim()}
                                    className="h-7 w-7 p-0 bg-primary hover:bg-primary/90"
                                >
                                    <Send className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
} 