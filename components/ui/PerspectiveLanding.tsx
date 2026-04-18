'use client'

import React, { useState, useEffect } from 'react'
import { fetchFeaturedMovies, Movie, getImageUrl } from '@/lib/api'
import { Loader2, Play, Compass, Star, TrendingUp, Sparkles, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface PerspectiveLandingProps {
    onEnter: () => void
}

export const PerspectiveLanding: React.FC<PerspectiveLandingProps> = ({ onEnter }) => {
    const [movies, setMovies] = useState<Movie[]>([])
    const [loading, setLoading] = useState(true)
    const [activeMovieId, setActiveMovieId] = useState<string | null>(null)
    const [isExiting, setIsExiting] = useState(false)
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

    useEffect(() => {
        const loadMovies = async () => {
            try {
                const res = await fetchFeaturedMovies(1)
                const validMovies = res.items?.filter((m: Movie) => m.poster_url && m.thumb_url).slice(0, 4) || []
                setMovies(validMovies)
                if (validMovies.length > 0) {
                    setActiveMovieId(validMovies[0]._id)
                }
            } catch (err) {
                console.error('Failed to fetch movies for landing', err)
            } finally {
                setLoading(false)
            }
        }
        loadMovies()

        // Reset mouse position to center on mouse leave
        const handleMouseLeave = () => setMousePos({ x: 0, y: 0 })
        document.addEventListener('mouseleave', handleMouseLeave)
        return () => document.removeEventListener('mouseleave', handleMouseLeave)
    }, [])

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isExiting) return
        const x = (e.clientX / window.innerWidth) * 2 - 1
        const y = (e.clientY / window.innerHeight) * 2 - 1
        // Smooth out the coordinates slightly
        setMousePos({ x, y })
    }

    const handleEnter = () => {
        setIsExiting(true)
        setTimeout(() => {
            onEnter()
        }, 800)
    }

    const activeMovie = movies.find(m => m._id === activeMovieId) || movies[0]

    if (loading) {
        return (
            <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <h2 className="text-xl font-bold shiny-text">Đang kết nối vũ trụ điện ảnh...</h2>
            </div>
        )
    }

    if (!movies.length) {
        // Fallback if API fails
        return (
            <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
                <Button onClick={handleEnter} size="lg" className="bg-gradient-to-r from-primary to-purple-600">
                    Bắt đầu xem phim
                </Button>
            </div>
        )
    }

    // Tính toán góc nghiêng dựa trên chuột (parallax effect)
    // Góc mặc định là rotateY(-12deg) rotateX(4deg), ta cộng thêm ảnh hưởng của chuột
    const baseRotateY = -12
    const baseRotateX = 4
    const hoverRotateY = baseRotateY + mousePos.x * 15 // Tối đa +/- 15 độ
    const hoverRotateX = baseRotateX - mousePos.y * 15

    return (
        <div 
            className={`fixed inset-0 z-[100] bg-background/95 backdrop-blur-2xl flex items-center justify-center overflow-hidden transition-all duration-800 ease-in-out ${isExiting ? 'opacity-0 scale-150 pointer-events-none' : 'opacity-100 scale-100'}`}
            style={{ perspective: '1500px' }}
            onMouseMove={handleMouseMove}
        >
            {/* Ambient Background Glow based on active movie */}
            {activeMovie && (
                <div className="absolute inset-0 z-0 opacity-20 transition-opacity duration-1000">
                    <img 
                        src={getImageUrl(activeMovie.thumb_url)} 
                        alt="bg" 
                        className="w-full h-full object-cover blur-[100px] scale-110"
                    />
                </div>
            )}

            {/* 3D Glass Panel Container */}
            <div 
                className="relative z-10 w-full max-w-6xl h-[85vh] sm:h-[80vh] flex flex-col lg:flex-row rounded-3xl overflow-hidden border border-white/10 shadow-[rgba(0,0,0,0.56)_0px_22px_70px_4px] bg-black/40 backdrop-blur-md transition-transform ease-out"
                style={{
                    transform: isExiting ? 'rotateY(0deg) rotateX(0deg) translateZ(500px)' : `rotateY(${hoverRotateY}deg) rotateX(${hoverRotateX}deg) translateZ(50px)`,
                    transformStyle: 'preserve-3d',
                    transitionDuration: isExiting ? '1000ms' : '150ms' // Fast transition on mouse move, slow on exit
                }}
            >
                {/* Left Panel: Information & CTA */}
                <div className="w-full lg:w-[35%] p-8 sm:p-12 flex flex-col justify-between border-r border-white/5 bg-gradient-to-b from-transparent to-black/60">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400 drop-shadow-sm">
                                CineMind
                            </h1>
                            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase opacity-80">
                                Vũ Trụ Điện Ảnh Đa Chiều
                            </p>
                        </div>
                        
                        <div className="pt-8 space-y-6">
                            <h3 className="text-sm font-medium text-white/50 uppercase tracking-widest mb-4">Trending Now</h3>
                            <div className="space-y-4">
                                {movies.map((movie) => (
                                    <button 
                                        key={movie._id}
                                        onMouseEnter={() => setActiveMovieId(movie._id)}
                                        onClick={() => setActiveMovieId(movie._id)}
                                        className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 flex items-center justify-between group ${activeMovieId === movie._id ? 'bg-white/10 shadow-lg border border-white/10' : 'hover:bg-white/5 border border-transparent'}`}
                                    >
                                        <div className="flex flex-col gap-1 pr-4">
                                            <span className={`text-sm font-medium line-clamp-1 transition-colors ${activeMovieId === movie._id ? 'text-white' : 'text-white/60 group-hover:text-white/80'}`}>
                                                {movie.name}
                                            </span>
                                            {movie.tmdb?.vote_average ? (
                                                <div className="flex items-center gap-1">
                                                    <Star className={`w-3 h-3 ${activeMovieId === movie._id ? 'text-yellow-400' : 'text-white/40'}`} fill="currentColor" />
                                                    <span className={`text-[10px] ${activeMovieId === movie._id ? 'text-yellow-400' : 'text-white/40'}`}>{movie.tmdb.vote_average.toFixed(1)}</span>
                                                </div>
                                            ) : null}
                                        </div>
                                        <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${activeMovieId === movie._id ? 'text-primary translate-x-1' : 'text-transparent -translate-x-2'}`} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/10">
                        <Button 
                            onClick={handleEnter}
                            size="lg" 
                            className="w-full h-14 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-[0_0_40px_rgba(188,24,136,0.4)] hover:shadow-[0_0_60px_rgba(188,24,136,0.6)] transition-all duration-300 text-base font-bold rounded-xl space-x-2 group overflow-hidden relative"
                        >
                            <span className="relative z-10 flex items-center justify-center">
                                Bắt đầu xem phim
                                <Compass className="w-5 h-5 ml-2 group-hover:rotate-45 transition-transform duration-500" />
                            </span>
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-0"></div>
                        </Button>
                    </div>
                </div>

                {/* Right Panel: Massive Visual */}
                <div className="w-full lg:w-[65%] relative overflow-hidden bg-black/80 flex flex-col justify-end p-8 sm:p-12">
                    {/* Crossfade Image Background */}
                    {movies.map((movie) => (
                        <div 
                            key={movie._id}
                            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${activeMovieId === movie._id ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                        >
                            <img 
                                src={getImageUrl(movie.poster_url)} 
                                alt={movie.name} 
                                className="w-full h-full object-cover sm:object-[center_top]"
                            />
                            {/* Gradients to blend with UI */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                            <div className="absolute inset-0 bg-gradient-to-l from-black/20 via-transparent to-black"></div>
                        </div>
                    ))}

                    {/* Active Movie Info overlayed on image */}
                    {activeMovie && (
                        <div className="relative z-20 transition-all duration-500 transform translate-y-0 opacity-100">
                            <Badge className="bg-primary/20 text-primary border-primary/30 mb-4 backdrop-blur-md px-3 py-1">
                                <Sparkles className="w-3 h-3 mr-1" /> Mới cập nhật
                            </Badge>
                            <h2 className="text-3xl sm:text-5xl font-bold text-white mb-3 tracking-tight drop-shadow-lg">
                                {activeMovie.name}
                            </h2>
                            <p className="text-lg text-white/80 font-serif italic mb-6 line-clamp-1 drop-shadow-md">
                                {activeMovie.origin_name}
                            </p>
                            
                            <div className="flex items-center gap-4 text-sm text-white/70">
                                <span className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                                    <TrendingUp className="w-4 h-4 text-success" />
                                    {activeMovie.year}
                                </span>
                                <span className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                                    {activeMovie.quality}
                                </span>
                                {activeMovie.time && (
                                    <span className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                                        {activeMovie.time}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
