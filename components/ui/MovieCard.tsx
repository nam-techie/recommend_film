'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Star, Heart, Play, Info, Calendar, Clock, Globe, Users, Eye, Film, Award, Tv, Monitor, User, Video, MapPin, Languages } from 'lucide-react'
import { Movie, getImageUrl, fetchMovieDetail, MovieDetail } from '@/lib/api'
import Link from 'next/link'

interface MovieCardProps {
    movie: Movie
}

export function MovieCard({ movie }: MovieCardProps) {
    const [isLiked, setIsLiked] = useState(false)
    const [imageLoaded, setImageLoaded] = useState(false)
    const [movieDetail, setMovieDetail] = useState<MovieDetail | null>(null)
    const [loadingDetail, setLoadingDetail] = useState(false)

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

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'single': return Monitor
            case 'series': return Tv
            case 'hoathinh': return Film
            default: return Film
        }
    }

    const loadMovieDetail = async () => {
        if (movieDetail || loadingDetail) return
        
        try {
            setLoadingDetail(true)
            const detail = await fetchMovieDetail(movie.slug)
            setMovieDetail(detail)
        } catch (error) {
            console.error('Error loading movie detail:', error)
        } finally {
            setLoadingDetail(false)
        }
    }

    const rating = movie.tmdb?.vote_average || 0
    const TypeIcon = getTypeIcon(movie.type)

    return (
        <>
            <Card className="group overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:scale-[1.02] border border-border/50 bg-gradient-to-br from-card via-card to-card/90 backdrop-blur-xl">
                <div className="relative overflow-hidden aspect-[2/3]">
                    <img
                        src={getImageUrl(movie.poster_url)}
                        alt={`${movie.name} poster`}
                        className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                        onLoad={() => setImageLoaded(true)}
                        onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = 'https://via.placeholder.com/300x450/1f2937/9ca3af?text=No+Image'
                        }}
                    />
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    {/* Floating Heart Button */}
                    <div className="absolute top-2 sm:top-3 right-2 sm:right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                        <Button
                            size="icon"
                            variant="secondary"
                            className="shiny-button h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-black/40 backdrop-blur-md border-0 hover:bg-red-500/80 transition-all duration-300 hover:scale-110"
                            onClick={() => setIsLiked(!isLiked)}
                        >
                            <Heart className={`h-3 w-3 sm:h-4 sm:w-4 transition-all duration-300 ${isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-white'}`} />
                        </Button>
                    </div>

                    {/* Rating Badge */}
                    {rating > 0 && (
                        <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
                            <Badge className={`bg-gradient-to-r ${getRatingColor(rating)} text-white border-0 shadow-lg text-xs`}>
                                <Star className="h-2 w-2 sm:h-3 sm:w-3 text-white mr-1 fill-current" />
                                {rating.toFixed(1)}
                            </Badge>
                        </div>
                    )}

                    {/* Quality Badge */}
                    <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <Badge variant="secondary" className="bg-black/40 backdrop-blur-md text-white border-0 text-xs">
                            {movie.quality}
                        </Badge>
                    </div>

                    {/* Episode Badge */}
                    <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <Badge className="bg-gradient-to-r from-primary to-purple-600 text-white border-0 text-xs">
                            {movie.episode_current}
                        </Badge>
                    </div>

                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                        <div className="transform scale-75 group-hover:scale-100 transition-transform duration-500">
                            <Link href={`/movie/${movie.slug}`}>
                                <Button 
                                    size="icon" 
                                    className="shiny-button h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-2xl border-4 border-white/20 transition-all duration-300 hover:scale-110"
                                >
                                    <Play className="h-5 w-5 sm:h-7 sm:w-7 ml-1 text-white" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                <CardHeader className="pb-2 sm:pb-3 pt-3 sm:pt-4 px-3 sm:px-6">
                    <CardTitle className="text-sm sm:text-lg font-bold line-clamp-2 group-hover:text-primary transition-colors duration-300 leading-tight">
                        {movie.name}
                    </CardTitle>
                    <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {movie.year}
                        </span>
                        <span className="flex items-center gap-1">
                            <TypeIcon className="h-3 w-3" />
                            {getTypeLabel(movie.type)}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                        {(movie.category || []).slice(0, 2).map((genre) => (
                            <Badge key={genre.id} variant="outline" className="text-xs">
                                {genre.name}
                            </Badge>
                        ))}
                        {movie.category && movie.category.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                                +{movie.category.length - 2}
                            </Badge>
                        )}
                    </div>
                </CardHeader>

                <CardFooter className="pt-0 pb-3 sm:pb-4 px-3 sm:px-6">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button 
                                variant="outline" 
                                size="sm"
                                className="shiny-button w-full group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-purple-600 group-hover:text-white group-hover:border-transparent transition-all duration-300 font-medium text-xs sm:text-sm hover:scale-105"
                                onClick={loadMovieDetail}
                            >
                                <Info className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                <span className="hidden sm:inline">Chi tiết</span>
                                <span className="sm:hidden">Xem</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-background via-background to-muted/30">
                            <div className="relative">
                                {/* Backdrop Image */}
                                {movie.thumb_url && (
                                    <div className="relative overflow-hidden rounded-xl mb-6">
                                        <img
                                            src={getImageUrl(movie.thumb_url)}
                                            alt={`${movie.name} backdrop`}
                                            className="w-full h-64 sm:h-80 object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                    </div>
                                )}

                                <DialogHeader>
                                    <DialogTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent mb-4">
                                        {movie.name}
                                    </DialogTitle>
                                    
                                    {/* Movie Info Badges */}
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm sm:text-base mb-6">
                                        {rating > 0 && (
                                            <Badge className={`bg-gradient-to-r ${getRatingColor(rating)} text-white`}>
                                                <Star className="h-3 w-3 sm:h-4 sm:w-4 mr-1 fill-current" />
                                                {rating.toFixed(1)}/10
                                            </Badge>
                                        )}
                                        <Badge variant="secondary">
                                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                            {movie.year}
                                        </Badge>
                                        <Badge variant="outline">
                                            <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                            {movie.time || 'Đang cập nhật'}
                                        </Badge>
                                        <Badge variant="outline">
                                            <TypeIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                            {getTypeLabel(movie.type)}
                                        </Badge>
                                        <Badge variant="outline">
                                            <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                            {movie.quality}
                                        </Badge>
                                        <Badge variant="outline">
                                            <Languages className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                            {movie.lang}
                                        </Badge>
                                        {movie.tmdb?.vote_count && (
                                            <Badge variant="outline">
                                                <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                                {movie.tmdb.vote_count.toLocaleString()} votes
                                            </Badge>
                                        )}
                                    </div>
                                </DialogHeader>
                                
                                <div className="space-y-6">
                                    {/* Original Name */}
                                    {movie.origin_name !== movie.name && (
                                        <div className="p-4 rounded-lg bg-muted/50">
                                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                                                <Globe className="h-4 w-4" />
                                                Tên gốc
                                            </h4>
                                            <p className="text-muted-foreground">{movie.origin_name}</p>
                                        </div>
                                    )}
                                    
                                    {/* Content/Description */}
                                    {(movieDetail?.movie.content || movie.content) && (
                                        <div>
                                            <h4 className="font-semibold mb-3 text-lg flex items-center gap-2">
                                                <Info className="h-5 w-5" />
                                                Nội dung
                                            </h4>
                                            <p className="text-muted-foreground leading-relaxed text-base">
                                                {movieDetail?.movie.content || movie.content}
                                            </p>
                                        </div>
                                    )}

                                    {/* Movie Stats Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t">
                                        <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                                            <TypeIcon className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                                            <h5 className="font-medium mb-1">Loại phim</h5>
                                            <p className="text-sm font-semibold text-blue-600">{getTypeLabel(movie.type)}</p>
                                        </div>
                                        <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10">
                                            <Clock className="h-6 w-6 text-green-500 mx-auto mb-2" />
                                            <h5 className="font-medium mb-1">Thời lượng</h5>
                                            <p className="text-sm font-semibold text-green-600">{movie.time || 'Đang cập nhật'}</p>
                                        </div>
                                        <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10">
                                            <Languages className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                                            <h5 className="font-medium mb-1">Ngôn ngữ</h5>
                                            <p className="text-sm font-semibold text-purple-600">{movie.lang}</p>
                                        </div>
                                        <div className="text-center p-4 rounded-lg bg-gradient-to-br from-orange-500/10 to-red-500/10">
                                            <Eye className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                                            <h5 className="font-medium mb-1">Chất lượng</h5>
                                            <p className="text-sm font-semibold text-orange-600">{movie.quality}</p>
                                        </div>
                                    </div>

                                    {/* Additional Info */}
                                    {movieDetail?.movie.status && (
                                        <div className="p-4 rounded-lg bg-gradient-to-br from-indigo-500/10 to-blue-500/10">
                                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                                                <Award className="h-4 w-4" />
                                                Trạng thái
                                            </h4>
                                            <p className="text-muted-foreground capitalize">{movieDetail.movie.status}</p>
                                        </div>
                                    )}

                                    {/* Episode Info */}
                                    {movie.episode_current && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="p-4 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10">
                                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                                    <Video className="h-4 w-4" />
                                                    Tập hiện tại
                                                </h4>
                                                <p className="text-muted-foreground">{movie.episode_current}</p>
                                            </div>
                                            {movie.episode_total && (
                                                <div className="p-4 rounded-lg bg-gradient-to-br from-teal-500/10 to-cyan-500/10">
                                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                                        <Film className="h-4 w-4" />
                                                        Tổng số tập
                                                    </h4>
                                                    <p className="text-muted-foreground">{movie.episode_total}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Genres and Countries */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                                <Film className="h-4 w-4" />
                                                Thể loại
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {(movie.category || []).map((genre) => (
                                                    <Badge key={genre.id} variant="outline">
                                                        {genre.name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                                <MapPin className="h-4 w-4" />
                                                Quốc gia
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {(movie.country || []).map((country) => (
                                                    <Badge key={country.id} variant="outline">
                                                        {country.name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cast and Director */}
                                    {movieDetail && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {movieDetail.movie.actor && movieDetail.movie.actor.length > 0 && (
                                                <div>
                                                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                                                        <User className="h-4 w-4" />
                                                        Diễn viên
                                                    </h4>
                                                    <p className="text-muted-foreground text-sm leading-relaxed">
                                                        {movieDetail.movie.actor.join(', ')}
                                                    </p>
                                                </div>
                                            )}

                                            {movieDetail.movie.director && movieDetail.movie.director.length > 0 && (
                                                <div>
                                                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                                                        <Award className="h-4 w-4" />
                                                        Đạo diễn
                                                    </h4>
                                                    <p className="text-muted-foreground text-sm leading-relaxed">
                                                        {movieDetail.movie.director.join(', ')}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Episodes Info */}
                                    {movieDetail?.episodes && movieDetail.episodes.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                                <Video className="h-4 w-4" />
                                                Thông tin tập phim
                                            </h4>
                                            <div className="space-y-3">
                                                {movieDetail.episodes.map((server, index) => (
                                                    <div key={index} className="p-4 rounded-lg bg-muted/50">
                                                        <h5 className="font-medium mb-2">{server.server_name}</h5>
                                                        <p className="text-sm text-muted-foreground">
                                                            {server.server_data.length} tập có sẵn
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6 border-t">
                                        <Link href={`/movie/${movie.slug}`} className="flex-1">
                                            <Button className="shiny-button w-full bg-gradient-to-r from-primary to-purple-600 text-sm sm:text-base hover:scale-105 transition-all duration-300">
                                                <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                                Xem phim
                                            </Button>
                                        </Link>
                                        <Button 
                                            variant="outline" 
                                            className="shiny-button flex-1 text-sm sm:text-base hover:scale-105 transition-all duration-300"
                                            onClick={() => setIsLiked(!isLiked)}
                                        >
                                            <Heart className={`h-3 w-3 sm:h-4 sm:w-4 mr-2 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                                            Thêm vào danh sách
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardFooter>
            </Card>
        </>
    )
}