'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Star, Heart, Play, Info, Calendar, Clock } from 'lucide-react'

interface Movie {
    id: number
    title: string
    poster: string
    rating: number
    year: number
    genres: string[]
    description: string
    duration?: string
}

interface MovieCardProps {
    movie: Movie
}

export function MovieCard({ movie }: MovieCardProps) {
    const [isLiked, setIsLiked] = useState(false)
    const [imageLoaded, setImageLoaded] = useState(false)

    return (
        <>
            <Card className="group overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:scale-[1.02] border border-border/50 bg-gradient-to-br from-card via-card to-card/90 backdrop-blur-xl">
                <div className="relative overflow-hidden aspect-[2/3]">
                    <img
                        src={movie.poster}
                        alt={`${movie.title} poster`}
                        className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                        onLoad={() => setImageLoaded(true)}
                    />
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    {/* Floating Heart Button */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                        <Button
                            size="icon"
                            variant="secondary"
                            className="h-9 w-9 rounded-full bg-black/40 backdrop-blur-md border-0 hover:bg-red-500/80 transition-all duration-300"
                            onClick={() => setIsLiked(!isLiked)}
                        >
                            <Heart className={`h-4 w-4 transition-all duration-300 ${isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-white'}`} />
                        </Button>
                    </div>

                    {/* Rating Badge */}
                    <div className="absolute top-3 left-3">
                        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 shadow-lg">
                            <Star className="h-3 w-3 text-white mr-1 fill-current" />
                            {movie.rating}
                        </Badge>
                    </div>

                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                        <div className="transform scale-75 group-hover:scale-100 transition-transform duration-500">
                            <Button 
                                size="icon" 
                                className="h-16 w-16 rounded-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-2xl border-4 border-white/20"
                            >
                                <Play className="h-7 w-7 ml-1 text-white" />
                            </Button>
                        </div>
                    </div>
                </div>

                <CardHeader className="pb-3 pt-4">
                    <CardTitle className="text-lg font-bold line-clamp-2 group-hover:text-primary transition-colors duration-300 leading-tight">
                        {movie.title}
                    </CardTitle>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {movie.year}
                        </span>
                        {movie.duration && (
                            <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {movie.duration}
                            </span>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                        {movie.genres.slice(0, 2).map((genre) => (
                            <Badge key={genre} variant="outline" className="text-xs">
                                {genre}
                            </Badge>
                        ))}
                    </div>
                </CardHeader>

                <CardFooter className="pt-0 pb-4">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button 
                                variant="outline" 
                                className="w-full group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-purple-600 group-hover:text-white group-hover:border-transparent transition-all duration-300 font-medium"
                            >
                                <Info className="h-4 w-4 mr-2" />
                                Chi tiết
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                                    {movie.title}
                                </DialogTitle>
                                <DialogDescription className="flex flex-wrap items-center gap-4 text-base">
                                    <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                                        <Star className="h-4 w-4 mr-1 fill-current" />
                                        {movie.rating}/10
                                    </Badge>
                                    <Badge variant="secondary">
                                        <Calendar className="h-4 w-4 mr-1" />
                                        {movie.year}
                                    </Badge>
                                    {movie.duration && (
                                        <Badge variant="outline">
                                            <Clock className="h-4 w-4 mr-1" />
                                            {movie.duration}
                                        </Badge>
                                    )}
                                </DialogDescription>
                            </DialogHeader>
                            
                            <div className="mt-6 space-y-6">
                                <div className="flex flex-wrap gap-2">
                                    {movie.genres.map((genre) => (
                                        <Badge key={genre} variant="outline">
                                            {genre}
                                        </Badge>
                                    ))}
                                </div>
                                
                                <div>
                                    <h4 className="font-semibold mb-3 text-lg">Tóm tắt</h4>
                                    <p className="text-muted-foreground leading-relaxed">{movie.description}</p>
                                </div>

                                <div className="flex gap-4">
                                    <Button className="flex-1 bg-gradient-to-r from-primary to-purple-600">
                                        <Play className="h-4 w-4 mr-2" />
                                        Xem phim
                                    </Button>
                                    <Button variant="outline" className="flex-1">
                                        <Heart className="h-4 w-4 mr-2" />
                                        Yêu thích
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardFooter>
            </Card>
        </>
    )
}