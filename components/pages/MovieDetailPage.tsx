'use client'

import React, { useState, useEffect } from 'react'
import { fetchMovieDetail, MovieDetail, getImageUrl } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
    Heart,
    Share2,
    Download,
    ChevronLeft,
    ChevronRight
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
    const [isLiked, setIsLiked] = useState(false)
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
            <div className="space-y-8">
                <Skeleton className="w-full h-96 rounded-xl" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                    <div className="space-y-4">
                        <Skeleton className="h-64 w-full" />
                    </div>
                </div>
            </div>
        )
    }

    if (error || !movieDetail) {
        return (
            <div className="text-center py-20">
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
        <div className="space-y-8">
            {/* Hero Section */}
            <div className="relative h-96 overflow-hidden rounded-2xl">
                <img
                    src={getImageUrl(movie.thumb_url)}
                    alt={movie.name}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                <div className="absolute inset-0 flex items-center">
                    <div className="container mx-auto px-4">
                        <div className="max-w-3xl space-y-6">
                            <div className="flex items-center space-x-4 text-white/80">
                                {rating > 0 && (
                                    <Badge className={`bg-gradient-to-r ${getRatingColor(rating)} text-white border-0`}>
                                        <Star className="h-4 w-4 mr-1 fill-current" />
                                        {rating.toFixed(1)}
                                    </Badge>
                                )}
                                <span className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-1" />
                                    {movie.year}
                                </span>
                                <span className="flex items-center">
                                    <Clock className="h-4 w-4 mr-1" />
                                    {movie.time}
                                </span>
                                <Badge variant="outline" className="text-white border-white/30">
                                    {getTypeLabel(movie.type)}
                                </Badge>
                            </div>

                            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
                                {movie.name}
                            </h1>

                            {movie.origin_name !== movie.name && (
                                <p className="text-xl text-white/80">{movie.origin_name}</p>
                            )}

                            <div className="flex flex-wrap gap-2">
                                {movie.category.map((genre) => (
                                    <Badge key={genre.id} variant="outline" className="text-white border-white/30">
                                        {genre.name}
                                    </Badge>
                                ))}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <Button 
                                    size="lg" 
                                    className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white"
                                    onClick={() => episodes.length > 0 && handleWatchEpisode(0, 0)}
                                >
                                    <Play className="h-5 w-5 mr-2" />
                                    Xem ngay
                                </Button>
                                <Button 
                                    size="lg" 
                                    variant="outline" 
                                    className="border-white/30 text-white hover:bg-white/10"
                                    onClick={() => setIsLiked(!isLiked)}
                                >
                                    <Heart className={`h-5 w-5 mr-2 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                                    {isLiked ? 'Đã thích' : 'Yêu thích'}
                                </Button>
                                <Button 
                                    size="lg" 
                                    variant="outline" 
                                    className="border-white/30 text-white hover:bg-white/10"
                                >
                                    <Share2 className="h-5 w-5 mr-2" />
                                    Chia sẻ
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Video Player */}
            {showPlayer && currentEpisode && (
                <Card className="overflow-hidden">
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
                        <div className="p-4 bg-gradient-to-r from-primary/10 to-purple-600/10">
                            <h3 className="text-lg font-bold mb-2">
                                Đang xem: {currentEpisode.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Server: {episodes[selectedServer]?.server_name}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Movie Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">Thông tin phim</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {movie.content && (
                                <div>
                                    <h4 className="font-semibold mb-3">Nội dung</h4>
                                    <p className="text-muted-foreground leading-relaxed">{movie.content}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-4 rounded-lg bg-muted/50">
                                    <Film className="h-6 w-6 mx-auto mb-2 text-primary" />
                                    <h5 className="font-medium mb-1">Loại phim</h5>
                                    <p className="text-sm text-muted-foreground">{getTypeLabel(movie.type)}</p>
                                </div>
                                <div className="text-center p-4 rounded-lg bg-muted/50">
                                    <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
                                    <h5 className="font-medium mb-1">Thời lượng</h5>
                                    <p className="text-sm text-muted-foreground">{movie.time}</p>
                                </div>
                                <div className="text-center p-4 rounded-lg bg-muted/50">
                                    <Globe className="h-6 w-6 mx-auto mb-2 text-primary" />
                                    <h5 className="font-medium mb-1">Ngôn ngữ</h5>
                                    <p className="text-sm text-muted-foreground">{movie.lang}</p>
                                </div>
                                <div className="text-center p-4 rounded-lg bg-muted/50">
                                    <Eye className="h-6 w-6 mx-auto mb-2 text-primary" />
                                    <h5 className="font-medium mb-1">Chất lượng</h5>
                                    <p className="text-sm text-muted-foreground">{movie.quality}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-semibold mb-3">Thể loại</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {movie.category.map((genre) => (
                                            <Badge key={genre.id} variant="outline">
                                                {genre.name}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-3">Quốc gia</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {movie.country.map((country) => (
                                            <Badge key={country.id} variant="outline">
                                                {country.name}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {movie.actor && movie.actor.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-3">Diễn viên</h4>
                                    <p className="text-muted-foreground">{movie.actor.join(', ')}</p>
                                </div>
                            )}

                            {movie.director && movie.director.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-3">Đạo diễn</h4>
                                    <p className="text-muted-foreground">{movie.director.join(', ')}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Episodes */}
                    {episodes.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-2xl">Danh sách tập phim</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Server Selection */}
                                {episodes.length > 1 && (
                                    <div>
                                        <h4 className="font-semibold mb-3">Chọn server</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {episodes.map((server, index) => (
                                                <Button
                                                    key={index}
                                                    variant={selectedServer === index ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => setSelectedServer(index)}
                                                >
                                                    {server.server_name}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Episode List */}
                                <div>
                                    <h4 className="font-semibold mb-3">
                                        {episodes[selectedServer]?.server_name || 'Tập phim'}
                                    </h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                        {episodes[selectedServer]?.server_data.map((episode, index) => (
                                            <Button
                                                key={episode.slug}
                                                variant={selectedEpisode === index && showPlayer ? "default" : "outline"}
                                                size="sm"
                                                className="h-12"
                                                onClick={() => handleWatchEpisode(selectedServer, index)}
                                            >
                                                {episode.name}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Movie Poster */}
                    <Card className="overflow-hidden">
                        <CardContent className="p-0">
                            <img
                                src={getImageUrl(movie.poster_url)}
                                alt={movie.name}
                                className="w-full aspect-[2/3] object-cover"
                            />
                        </CardContent>
                    </Card>

                    {/* Movie Stats */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Thống kê</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {rating > 0 && (
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Đánh giá</span>
                                    <Badge className={`bg-gradient-to-r ${getRatingColor(rating)} text-white`}>
                                        <Star className="h-3 w-3 mr-1 fill-current" />
                                        {rating.toFixed(1)}/10
                                    </Badge>
                                </div>
                            )}
                            {movie.tmdb?.vote_count && (
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Lượt vote</span>
                                    <span className="font-medium">{movie.tmdb.vote_count.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Năm phát hành</span>
                                <span className="font-medium">{movie.year}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Trạng thái</span>
                                <Badge variant="outline">{movie.episode_current}</Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Trailer */}
                    {movie.trailer_url && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Trailer</CardTitle>
                            </CardHeader>
                            <CardContent>
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
        </div>
    )
}