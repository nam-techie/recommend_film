'use client'

import React, { useState, useEffect } from 'react'
import { fetchMovieDetail, MovieDetail, getImageUrl } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { 
    Play, 
    Star, 
    Calendar, 
    Clock, 
    Globe, 
    Users, 
    Eye, 
    Film, 
    ChevronLeft,
    Info,
    CheckCircle,
    ArrowLeft,
    Home
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface MovieDetailPageProps {
    slug: string
}

export function MovieDetailPage({ slug }: MovieDetailPageProps) {
    const [movieDetail, setMovieDetail] = useState<MovieDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedServer, setSelectedServer] = useState(0)
    const [selectedEpisode, setSelectedEpisode] = useState(0)
    const [showPlayer, setShowPlayer] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const loadMovieDetail = async () => {
            try {
                setLoading(true)
                const detail = await fetchMovieDetail(slug)
                setMovieDetail(detail)
            } catch (err) {
                setError('Không thể tải thông tin phim')
                console.error('Error loading movie detail:', err)
            } finally {
                setLoading(false)
            }
        }

        if (slug) {
            loadMovieDetail()
        }
    }, [slug])

    const getRatingColor = (rating: number) => {
        if (rating >= 8) return 'from-green-500 to-emerald-500'
        if (rating >= 7) return 'from-yellow-500 to-orange-500'
        if (rating >= 6) return 'from-orange-500 to-red-500'
        return 'from-red-500 to-pink-500'
    }

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'single': return 'Phim lẻ'
            case 'series': return 'Phim bộ'
            case 'hoathinh': return 'Hoạt hình'
            default: return 'Phim'
        }
    }

    const handleWatchEpisode = (serverIndex: number, episodeIndex: number) => {
        setSelectedServer(serverIndex)
        setSelectedEpisode(episodeIndex)
        setShowPlayer(true)
    }

    if (loading) {
        return (
            <div className="space-y-8 max-w-7xl mx-auto px-4">
                <Skeleton className="w-full h-96 rounded-xl" />
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="space-y-4">
                        <Skeleton className="w-full aspect-[2/3] rounded-lg" />
                    </div>
                    <div className="lg:col-span-3 space-y-6">
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                </div>
            </div>
        )
    }

    if (error || !movieDetail) {
        return (
            <div className="text-center py-20 max-w-7xl mx-auto px-4">
                <div className="text-6xl mb-4">😔</div>
                <h3 className="text-2xl font-bold mb-4">Không tìm thấy phim</h3>
                <p className="text-muted-foreground mb-6">{error}</p>
                <Button onClick={() => router.back()}>
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Quay lại
                </Button>
            </div>
        )
    }

    const { movie, episodes } = movieDetail
    const rating = movie.tmdb?.vote_average || 0
    const currentEpisode = episodes[selectedServer]?.server_data[selectedEpisode]

    return (
        <div className="max-w-7xl mx-auto px-4 space-y-8">
            {/* Back Navigation */}
            <div className="flex items-center gap-4 pt-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.back()}
                    className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
                >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Quay lại
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
                >
                    <Link href="/">
                        <Home className="h-4 w-4 mr-2" />
                        Trang chủ
                    </Link>
                </Button>
                <div className="h-4 w-px bg-white/20" />
                <div className="text-sm text-gray-400">
                    <Link href="/" className="hover:text-white transition-colors">Trang chủ</Link>
                    <span className="mx-2">/</span>
                    <span className="text-white">{movie?.name}</span>
                </div>
            </div>

            {/* Movie Header */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Poster */}
                <div className="lg:col-span-1">
                    <div className="sticky top-6">
                        <img
                            src={getImageUrl(movie.poster_url)}
                    alt={movie.name}
                            className="w-full aspect-[2/3] object-cover rounded-xl shadow-2xl"
                        />
                    </div>
                </div>

                {/* Movie Info */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Title and Basic Info */}
                    <div className="space-y-4">
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
                            {movie.name}
                        </h1>
                        {movie.origin_name && movie.origin_name !== movie.name && (
                            <p className="text-xl text-yellow-400 font-medium">
                                {movie.origin_name}
                            </p>
                        )}

                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-3">
                                {rating > 0 && (
                                <Badge className="bg-yellow-500 text-black font-bold px-3 py-1">
                                    IMDb {rating.toFixed(1)}
                                </Badge>
                            )}
                            <Badge variant="outline" className="text-white border-white/50 bg-black/30">
                                T{movie.year >= 2020 ? '18' : '16'}
                            </Badge>
                            <Badge variant="outline" className="text-white border-white/50 bg-black/30">
                                {movie.year}
                            </Badge>
                            <Badge variant="outline" className="text-white border-white/50 bg-black/30">
                                {getTypeLabel(movie.type)}
                            </Badge>
                            <Badge variant="outline" className="text-white border-white/50 bg-black/30">
                                {movie.episode_current}
                            </Badge>
                        </div>

                        {/* Genres */}
                            <div className="flex flex-wrap gap-2">
                                {movie.category.map((genre) => (
                                <Badge key={genre.id} variant="outline" className="text-white border-white/40 bg-black/20">
                                        {genre.name}
                                    </Badge>
                                ))}
                            </div>

                        {/* Status */}
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <span className="text-green-400 font-medium">Đã hoàn thành: {movie.episode_current}</span>
                        </div>
                    </div>

                    {/* Movie Details */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-bold mb-3 text-white">Giới thiệu:</h3>
                            <p className="text-gray-300 leading-relaxed">
                                {movie.content || 'Chưa có mô tả chi tiết cho phim này.'}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400">Thời lượng:</span>
                                    <span className="text-white font-medium">{movie.time}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400">Quốc gia:</span>
                                    <span className="text-white font-medium">
                                        {movie.country.map(c => c.name).join(', ')}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400">Networks:</span>
                                    <span className="text-white font-medium">Nam_phun</span>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400">Sản xuất:</span>
                                    <span className="text-white font-medium">Đang cập nhật</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400">Đạo diễn:</span>
                                    <span className="text-white font-medium">
                                        {movie.director?.join(', ') || 'Đang cập nhật'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400">Chất lượng:</span>
                                    <span className="text-white font-medium">{movie.quality}</span>
                                </div>
                            </div>
                        </div>

                        {/* Cast */}
                        {movie.actor && movie.actor.length > 0 && (
                            <div>
                                <h4 className="text-lg font-semibold mb-2 text-white">Diễn viên:</h4>
                                <p className="text-gray-300">{movie.actor.join(', ')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Video Player */}
            {showPlayer && currentEpisode && (
                <Card className="overflow-hidden bg-black/50 backdrop-blur border-white/10">
                    <CardContent className="p-0">
                        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                            <iframe
                                src={currentEpisode.link_embed}
                                title={`${movie.name} - ${currentEpisode.name}`}
                                className="absolute inset-0 w-full h-full"
                                allowFullScreen
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            />
                        </div>
                        <div className="p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20">
                            <h3 className="text-lg font-bold mb-2 text-white">
                                Đang xem: {currentEpisode.name}
                            </h3>
                            <p className="text-sm text-gray-300">
                                Server: Server Phuong Nam ({episodes[selectedServer]?.server_name.includes('Vietsub') ? 'Vietsub' : 'Lồng Tiếng'})
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Episodes Section */}
            {episodes.length > 0 && (
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white">Danh sách tập phim</h2>
                    
                                {/* Server Selection */}
                    <div className="flex flex-wrap gap-3">
                                            {episodes.map((server, index) => (
                                                <Button
                                                    key={index}
                                                    variant={selectedServer === index ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => setSelectedServer(index)}
                                className={selectedServer === index ? "bg-yellow-500 text-black" : "border-white/30 text-white hover:bg-white/10"}
                                                >
                                Server Phuong Nam {server.server_name.includes('Vietsub') ? '(Vietsub)' : '(Lồng Tiếng)'}
                                                </Button>
                                            ))}
                                        </div>

                    {/* Episode Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                                        {episodes[selectedServer]?.server_data.map((episode, index) => (
                                            <Button
                                                key={episode.slug}
                                                variant={selectedEpisode === index && showPlayer ? "default" : "outline"}
                                                size="sm"
                                className={`h-12 ${
                                    selectedEpisode === index && showPlayer 
                                        ? "bg-yellow-500 text-black" 
                                        : "border-white/30 text-white hover:bg-white/10"
                                }`}
                                                onClick={() => handleWatchEpisode(selectedServer, index)}
                                            >
                                                {episode.name}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
            )}

            {/* Additional Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="bg-black/50 backdrop-blur border-white/10">
                    <CardContent className="p-6">
                        <h3 className="text-lg font-bold mb-4 text-white flex items-center">
                            <Star className="h-5 w-5 mr-2 text-yellow-500" />
                            Thống kê
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Đánh giá:</span>
                                <span className="text-yellow-400 font-bold">{rating.toFixed(1)}/10</span>
                                </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Lượt vote:</span>
                                <span className="text-white">{movie.tmdb?.vote_count || 0}</span>
                                </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Năm phát hành:</span>
                                <span className="text-white">{movie.year}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Trạng thái:</span>
                                <span className="text-green-400">{movie.episode_current}</span>
                            </div>
                            </div>
                        </CardContent>
                    </Card>

                    {movie.trailer_url && (
                    <Card className="bg-black/50 backdrop-blur border-white/10">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-bold mb-4 text-white flex items-center">
                                <Film className="h-5 w-5 mr-2 text-red-500" />
                                Trailer
                            </h3>
                                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                                    <iframe
                                        src={movie.trailer_url.replace('watch?v=', 'embed/')}
                                        title={`${movie.name} Trailer`}
                                        className="absolute inset-0 w-full h-full rounded-lg"
                                        allowFullScreen
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}
            </div>
        </div>
    )
}