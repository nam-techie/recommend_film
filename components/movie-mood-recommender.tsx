'use client'

import { useState, useEffect } from 'react'
import { Star, Heart, Calendar, Clock, Play, Info, Globe, Users, Award, Sparkles, Filter } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import Link from 'next/link'

// Types
interface Movie {
    id: number
    title: string
    release_date: string
    poster_path: string
    vote_average: number
    vote_count: number
    overview: string
    genre_ids?: number[]
    runtime?: number
    backdrop_path?: string
    original_language: string
    original_title: string
    popularity: number
    adult: boolean
    video: boolean
}

interface Video {
    key: string
    site: string
    type: string
    name: string
    official: boolean
}

interface MovieCardProps {
    movie: Movie
}

interface SelectionFormProps {
    mood: string
    setMood: (mood: string) => void
    genre: string
    setGenre: (genre: string) => void
    sortBy: string
    setSortBy: (sortBy: string) => void
    year: string
    setYear: (year: string) => void
    onSubmit: (e: React.FormEvent) => void
    loading: boolean
}

interface MoviePaginationProps {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
}

// Constants
const MOOD_TO_GENRE = {
    happy: 35,    // Comedy
    sad: 18,      // Drama
    excited: 28,  // Action
    relaxed: 10749, // Romance
    scared: 27,   // Horror
    adventurous: 12, // Adventure
} as const

const GENRES = [
    { id: '12', name: '🏔️ Adventure' },
    { id: '28', name: '💥 Action' },
    { id: '35', name: '😂 Comedy' },
    { id: '18', name: '🎭 Drama' },
    { id: '27', name: '👻 Horror' },
    { id: '10749', name: '💕 Romance' },
    { id: '878', name: '🚀 Sci-Fi' },
    { id: '53', name: '🔥 Thriller' },
    { id: '16', name: '🎨 Animation' },
    { id: '80', name: '🔍 Crime' },
    { id: '99', name: '📚 Documentary' },
    { id: '14', name: '✨ Fantasy' },
] as const

const MOODS = [
    { value: 'happy', label: '😊 Happy', color: 'from-yellow-400 to-orange-400', description: 'Feel-good vibes' },
    { value: 'sad', label: '😢 Sad', color: 'from-blue-400 to-purple-400', description: 'Emotional stories' },
    { value: 'excited', label: '🤩 Excited', color: 'from-red-400 to-pink-400', description: 'High energy thrills' },
    { value: 'relaxed', label: '😌 Relaxed', color: 'from-green-400 to-emerald-400', description: 'Peaceful moments' },
    { value: 'scared', label: '😨 Scared', color: 'from-purple-400 to-indigo-400', description: 'Spine-chilling fun' },
    { value: 'adventurous', label: '🗺️ Adventurous', color: 'from-orange-400 to-red-400', description: 'Epic journeys' },
] as const

const SORT_OPTIONS = [
    { value: 'popularity.desc', label: '🔥 Most Popular', icon: '📈' },
    { value: 'vote_average.desc', label: '⭐ Highest Rated', icon: '🏆' },
    { value: 'release_date.desc', label: '🆕 Newest First', icon: '📅' },
    { value: 'release_date.asc', label: '📜 Classic First', icon: '🎬' },
    { value: 'vote_count.desc', label: '👥 Most Reviewed', icon: '💬' },
] as const

const YEARS = Array.from({ length: 30 }, (_, i) => {
    const year = new Date().getFullYear() - i
    return { value: year.toString(), label: year.toString() }
})

const MOVIES_PER_PAGE = 12

// Language mapping
const LANGUAGE_MAP: { [key: string]: string } = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'hi': 'Hindi',
    'ar': 'Arabic',
    'th': 'Thai',
    'vi': 'Vietnamese',
}

// Helper Functions
const createSlugFromTitle = (title: string): string => {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .trim()
        .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}

// API Functions
const TMDB_API_KEY = process.env.NEXT_PUBLIC_MOVIE_API_KEY!

const fetchMoviesByGenre = async (
    genreId: string | number, 
    page: number, 
    sortBy: string = 'popularity.desc',
    year?: string
): Promise<{ movies: Movie[], totalPages: number }> => {
    try {
        let url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=${sortBy}&page=${page}&vote_count.gte=50`
        
        if (year && year !== 'all') {
            url += `&year=${year}`
        }

        const response = await fetch(url)
        if (!response.ok) {
            throw new Error('Failed to fetch movies')
        }
        const data = await response.json()
        return {
            movies: data.results.slice(0, MOVIES_PER_PAGE),
            totalPages: Math.min(data.total_pages, 500)
        }
    } catch (error) {
        console.error('Error fetching movies:', error)
        return { movies: [], totalPages: 0 }
    }
}

const fetchMovieTrailer = async (movieId: number): Promise<string | null> => {
    try {
        const response = await fetch(
            `https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${TMDB_API_KEY}`
        )
        if (!response.ok) {
            throw new Error('Failed to fetch movie videos')
        }
        const data = await response.json()
        
        // Tìm trailer YouTube chính thức
        const trailer = data.results.find((video: Video) => 
            video.site === 'YouTube' && 
            video.type === 'Trailer' && 
            video.official === true
        ) || data.results.find((video: Video) => 
            video.site === 'YouTube' && 
            video.type === 'Trailer'
        )
        
        return trailer ? trailer.key : null
    } catch (error) {
        console.error('Error fetching trailer:', error)
        return null
    }
}

// Helper function to format runtime
const formatRuntime = (minutes?: number): string => {
    if (!minutes) return 'N/A'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
}

// Helper function to format popularity
const formatPopularity = (popularity: number): string => {
    if (popularity >= 1000) {
        return `${(popularity / 1000).toFixed(1)}K`
    }
    return popularity.toFixed(0)
}

// Components
const MovieCard = ({ movie }: MovieCardProps) => {
    const [isLiked, setIsLiked] = useState(false)
    const [imageLoaded, setImageLoaded] = useState(false)
    const [trailerKey, setTrailerKey] = useState<string | null>(null)
    const [showTrailerModal, setShowTrailerModal] = useState(false)
    const [loadingTrailer, setLoadingTrailer] = useState(false)

    // Tạo slug từ title để link đến trang chi tiết
    const movieSlug = createSlugFromTitle(movie.title)

    const handlePlayTrailer = async () => {
        if (trailerKey) {
            setShowTrailerModal(true)
            return
        }

        setLoadingTrailer(true)
        try {
            const trailer = await fetchMovieTrailer(movie.id)
            if (trailer) {
                setTrailerKey(trailer)
                setShowTrailerModal(true)
            } else {
                // Thông báo không tìm thấy trailer
                alert('Không tìm thấy trailer cho bộ phim này.')
            }
        } catch (error) {
            console.error('Error loading trailer:', error)
            alert('Lỗi khi tải trailer. Vui lòng thử lại sau.')
        } finally {
            setLoadingTrailer(false)
        }
    }

    return (
        <>
        <Card className="group overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:scale-[1.02] border border-border/50 bg-gradient-to-br from-card via-card to-card/90 backdrop-blur-xl">
            <div className="relative overflow-hidden aspect-[2/3]">
                {!imageLoaded && (
                    <Skeleton className="w-full h-full" />
                )}
                <img
                    src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
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
                        {movie.vote_average.toFixed(1)}
                    </Badge>
                </div>

                {/* Language Badge */}
                <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                    <Badge variant="secondary" className="bg-black/40 backdrop-blur-md text-white border-0">
                        <Globe className="h-3 w-3 mr-1" />
                        {LANGUAGE_MAP[movie.original_language] || movie.original_language.toUpperCase()}
                    </Badge>
                </div>

                {/* Popularity Badge */}
                <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                    <Badge className="bg-gradient-to-r from-primary to-purple-600 text-white border-0">
                        <Users className="h-3 w-3 mr-1" />
                        {formatPopularity(movie.popularity)}
                    </Badge>
                </div>

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                    <div className="transform scale-75 group-hover:scale-100 transition-transform duration-500">
                            <Button 
                                size="icon" 
                                className="h-16 w-16 rounded-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-2xl border-4 border-white/20 disabled:opacity-70"
                                onClick={handlePlayTrailer}
                                disabled={loadingTrailer}
                            >
                                {loadingTrailer ? (
                                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                            <Play className="h-7 w-7 ml-1 text-white" />
                                )}
                        </Button>
                    </div>
                </div>
            </div>

            <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-lg font-bold line-clamp-2 group-hover:text-primary transition-colors duration-300 leading-tight">
                    {movie.title}
                </CardTitle>
                <CardDescription className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(movie.release_date).getFullYear()}
                    </span>
                    <span className="flex items-center gap-1">
                        <Award className="h-3 w-3" />
                        {movie.vote_count.toLocaleString()} votes
                    </span>
                </CardDescription>
            </CardHeader>

            <CardFooter className="pt-0 pb-4">
                <Link href={`/movie/${movieSlug}`} className="w-full">
                        <Button 
                            variant="outline" 
                            className="w-full group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-purple-600 group-hover:text-white group-hover:border-transparent transition-all duration-300 font-medium"
                        >
                            <Info className="h-4 w-4 mr-2" />
                        Xem Chi Tiết
                        </Button>
                </Link>
            </CardFooter>
        </Card>

            {/* Trailer Modal */}
            <Dialog open={showTrailerModal} onOpenChange={setShowTrailerModal}>
                <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] p-0 bg-black border-0">
                    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                        {trailerKey && (
                            <iframe
                                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1`}
                                title={`${movie.title} Trailer`}
                                className="absolute inset-0 w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        )}
                    </div>
                    <div className="p-3 sm:p-4 bg-gradient-to-br from-background via-background to-muted/30">
                        <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">{movie.title}</h3>
                        <p className="text-sm sm:text-base text-muted-foreground">Official Trailer</p>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

const SelectionForm = ({ mood, setMood, genre, setGenre, sortBy, setSortBy, year, setYear, onSubmit, loading }: SelectionFormProps) => {
    return (
        <div className="mb-8 sm:mb-16 px-4 sm:px-6 lg:px-8">
            {/* Hero Section */}
            <div className="text-center mb-8 sm:mb-12 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple-600/10 to-pink-600/10 blur-3xl -z-10" />
                <div className="relative">
                    <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-primary/20 to-purple-600/20 border border-primary/30 mb-4 sm:mb-6">
                        <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                        <span className="text-xs sm:text-sm font-medium">AI-Powered Movie Discovery</span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold shiny-text mb-3 sm:mb-4 leading-tight">
                        CineMind
                    </h1>
                    <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-2 leading-relaxed">
                        Where <span className="font-semibold text-primary">Cinema</span> meets <span className="font-semibold text-purple-600">Mind</span>
                    </p>
                    <p className="text-base sm:text-lg text-muted-foreground/80 max-w-2xl mx-auto">
                        Discover your perfect movie based on your current mood and preferences
                    </p>
                </div>
            </div>

            {/* Selection Form */}
            <Card className="max-w-7xl mx-auto border-0 bg-gradient-to-br from-card/80 via-card to-card/60 backdrop-blur-xl shadow-2xl shadow-primary/5">
                <CardContent className="p-4 sm:p-6 md:p-8 lg:p-10">
                    <form onSubmit={onSubmit} className="space-y-6 sm:space-y-8">
                        {/* Mood Selection */}
                        <div className="space-y-3 sm:space-y-4">
                            <Label className="text-lg sm:text-xl font-bold shiny-text flex items-center gap-2">
                                <span className="text-xl sm:text-2xl">🎭</span>
                                How are you feeling today?
                            </Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                                {MOODS.map(({ value, label, color, description }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setMood(mood === value ? '' : value)}
                                        className={`p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                                            mood === value
                                                ? `border-primary bg-gradient-to-br ${color} text-white shadow-lg scale-105`
                                                : 'border-border/50 hover:border-primary/50 hover:shadow-md bg-card'
                                        }`}
                                    >
                                        <div className="text-xl sm:text-2xl mb-1.5 sm:mb-2">{label.split(' ')[0]}</div>
                                        <div className="font-medium text-xs sm:text-sm">{label.split(' ').slice(1).join(' ')}</div>
                                        <div className={`text-xs mt-1 ${mood === value ? 'text-white/80' : 'text-muted-foreground'} hidden sm:block`}>
                                            {description}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Advanced Filters */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            <div className="space-y-2 sm:space-y-3">
                                <Label htmlFor="genre" className="text-base sm:text-lg font-semibold shiny-text flex items-center gap-2">
                                    <span className="text-lg sm:text-xl">🎬</span>
                                    Genre
                                </Label>
                                <Select onValueChange={setGenre} value={genre || undefined}>
                                    <SelectTrigger id="genre" className="h-11 sm:h-14 text-sm sm:text-base bg-card/50 border-border/50 hover:border-primary/50 transition-colors">
                                        <SelectValue placeholder="Choose a genre..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all" className="text-sm sm:text-base py-2 sm:py-3">All Genres</SelectItem>
                                        {GENRES.map(({ id, name }) => (
                                            <SelectItem key={id} value={id} className="text-sm sm:text-base py-2 sm:py-3">{name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 sm:space-y-3">
                                <Label htmlFor="sortBy" className="text-base sm:text-lg font-semibold flex items-center gap-2">
                                    <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
                                    Sort by
                                </Label>
                                <Select onValueChange={setSortBy} value={sortBy}>
                                    <SelectTrigger id="sortBy" className="h-11 sm:h-14 text-sm sm:text-base bg-card/50 border-border/50 hover:border-primary/50 transition-colors">
                                        <SelectValue placeholder="Sort movies..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SORT_OPTIONS.map(({ value, label, icon }) => (
                                            <SelectItem key={value} value={value} className="text-sm sm:text-base py-2 sm:py-3">
                                                <span className="flex items-center gap-2">
                                                    <span>{icon}</span>
                                                    {label}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 sm:space-y-3">
                                <Label htmlFor="year" className="text-base sm:text-lg font-semibold flex items-center gap-2">
                                    <span className="text-lg sm:text-xl">📅</span>
                                    Release Year
                                </Label>
                                <Select onValueChange={setYear} value={year}>
                                    <SelectTrigger id="year" className="h-11 sm:h-14 text-sm sm:text-base bg-card/50 border-border/50 hover:border-primary/50 transition-colors">
                                        <SelectValue placeholder="Any year..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all" className="text-sm sm:text-base py-2 sm:py-3">Any Year</SelectItem>
                                        {YEARS.map(({ value, label }) => (
                                            <SelectItem key={value} value={value} className="text-sm sm:text-base py-2 sm:py-3">{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        
                        <div className="flex justify-center pt-2 sm:pt-4">
                            <Button 
                                type="submit" 
                                disabled={loading} 
                                className="shiny-button w-full h-12 sm:h-14 text-base sm:text-lg font-semibold bg-gradient-to-r from-primary to-purple-600 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
                            >
                                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                                Discover Amazing Movies
                                <Play className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

const MoviePagination = ({ currentPage, totalPages, onPageChange }: MoviePaginationProps) => {
    const siblingsCount = 1
    const totalNumbers = siblingsCount * 2 + 3

    const getPageNumbers = () => {
        const pages: (number | 'ellipsis')[] = []

        if (totalPages <= totalNumbers) {
            return Array.from({ length: totalPages }, (_, i) => i + 1)
        }

        pages.push(1)

        let startPage = Math.max(2, currentPage - siblingsCount)
        let endPage = Math.min(totalPages - 1, currentPage + siblingsCount)

        if (startPage > 2) {
            pages.push('ellipsis')
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i)
        }

        if (endPage < totalPages - 1) {
            pages.push('ellipsis')
        }

        if (totalPages > 1) {
            pages.push(totalPages)
        }

        return pages
    }

    const pages = getPageNumbers()

    return (
        <Pagination className="mt-8 sm:mt-16">
            <PaginationContent className="gap-1 sm:gap-2">
                <PaginationItem>
                    <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                            e.preventDefault()
                            if (currentPage > 1) onPageChange(currentPage - 1)
                        }}
                        className={`h-9 sm:h-10 px-2 sm:px-3 text-xs sm:text-sm ${
                            currentPage === 1 
                                ? "pointer-events-none opacity-50" 
                                : "hover:bg-gradient-to-r hover:from-primary hover:to-purple-600 hover:text-white"
                        } transition-all duration-300`}
                    />
                </PaginationItem>

                {pages.map((page, index) => (
                    page === 'ellipsis' ? (
                        <PaginationItem key={`ellipsis-${index}`} className="hidden sm:block">
                            <PaginationEllipsis />
                        </PaginationItem>
                    ) : (
                        <PaginationItem key={page} className={page === currentPage ? 'block' : 'hidden sm:block'}>
                            <PaginationLink
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault()
                                    onPageChange(page)
                                }}
                                isActive={currentPage === page}
                                className={`h-9 sm:h-10 w-9 sm:w-10 text-xs sm:text-sm transition-all duration-300 ${
                                    currentPage === page 
                                        ? "bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg" 
                                        : "hover:bg-gradient-to-r hover:from-primary/20 hover:to-purple-600/20"
                                }`}
                            >
                                {page}
                            </PaginationLink>
                        </PaginationItem>
                    )
                ))}

                <PaginationItem>
                    <PaginationNext
                        href="#"
                        onClick={(e) => {
                            e.preventDefault()
                            if (currentPage < totalPages) onPageChange(currentPage + 1)
                        }}
                        className={`h-9 sm:h-10 px-2 sm:px-3 text-xs sm:text-sm ${
                            currentPage === totalPages 
                                ? "pointer-events-none opacity-50" 
                                : "hover:bg-gradient-to-r hover:from-primary hover:to-purple-600 hover:text-white"
                        } transition-all duration-300`}
                    />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    )
}

const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} className="overflow-hidden border-border/50">
                <Skeleton className="w-full aspect-[2/3]" />
                <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardFooter>
                    <Skeleton className="h-10 w-full" />
                </CardFooter>
            </Card>
        ))}
    </div>
)

// Main Component
export function MovieMoodRecommender() {
    const [mood, setMood] = useState('')
    const [genre, setGenre] = useState('all')
    const [sortBy, setSortBy] = useState('popularity.desc')
    const [year, setYear] = useState('all')
    const [movies, setMovies] = useState<Movie[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [hasSearched, setHasSearched] = useState(false)

    const fetchMovies = async (page: number) => {
        setLoading(true)
        setError(null)

        try {
            const selectedGenre = genre === 'all' ? undefined : genre
            const genreId = MOOD_TO_GENRE[mood as keyof typeof MOOD_TO_GENRE] || selectedGenre
            const selectedYear = year === 'all' ? undefined : year
            const { movies: newMovies, totalPages: newTotalPages } = await fetchMoviesByGenre(genreId, page, sortBy, selectedYear)
            setMovies(newMovies)
            setTotalPages(newTotalPages)
            setHasSearched(true)
        } catch (err) {
            setError('Failed to fetch movies. Please try again later.')
            console.error('Error:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!mood && !genre) return
        setCurrentPage(1)
        await fetchMovies(1)
    }

    const handlePageChange = async (page: number) => {
        setCurrentPage(page)
        await fetchMovies(page)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // Trigger search when sortBy or year changes
    useEffect(() => {
        if (hasSearched && (mood || genre)) {
            setCurrentPage(1)
            fetchMovies(1)
        }
    }, [sortBy, year, mood, genre, hasSearched])

    return (
        <div className="min-h-screen">
            <SelectionForm
                mood={mood}
                setMood={setMood}
                genre={genre}
                setGenre={setGenre}
                sortBy={sortBy}
                setSortBy={setSortBy}
                year={year}
                setYear={setYear}
                onSubmit={handleSubmit}
                loading={loading}
            />

            {loading && <LoadingSkeleton />}

            {error && (
                <div className="text-center py-20">
                    <div className="max-w-md mx-auto">
                        <div className="text-8xl mb-6">😔</div>
                        <h3 className="text-2xl font-bold mb-4">Oops! Something went wrong</h3>
                        <p className="text-muted-foreground mb-6 text-lg">{error}</p>
                        <Button 
                            onClick={() => window.location.reload()}
                            className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                        >
                            Try Again
                        </Button>
                    </div>
                </div>
            )}

            {!loading && !error && hasSearched && movies.length === 0 && (
                <div className="text-center py-20">
                    <div className="max-w-md mx-auto">
                        <div className="text-8xl mb-6">🎬</div>
                        <h3 className="text-2xl font-bold mb-4">No movies found</h3>
                        <p className="text-muted-foreground text-lg">Try adjusting your mood, genre, or filters to discover new movies.</p>
                    </div>
                </div>
            )}

            {!loading && movies.length > 0 && (
                <>
                    <div className="mb-6 sm:mb-10 text-center px-4 sm:px-0">
                        <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                            Your Perfect Movie Collection
                        </h2>
                        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                            Found <span className="font-semibold text-primary">{movies.length}</span> amazing movies curated just for you
                            {year && year !== 'all' && (
                                <span className="block mt-1">
                                    from <span className="font-semibold">{year}</span>
                                </span>
                            )}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2 mt-3 sm:mt-4">
                            <Badge className="bg-gradient-to-r from-primary to-purple-600 text-white text-xs sm:text-sm">
                                {SORT_OPTIONS.find(opt => opt.value === sortBy)?.label}
                            </Badge>
                            {mood && (
                                <Badge variant="outline" className="text-xs sm:text-sm">
                                    {MOODS.find(m => m.value === mood)?.label}
                                </Badge>
                            )}
                            {genre && (
                                <Badge variant="outline" className="text-xs sm:text-sm">
                                    {GENRES.find(g => g.id === genre)?.name}
                                </Badge>
                            )}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 px-4 sm:px-6 lg:px-8">
                        {movies.map(movie => (
                            <MovieCard key={movie.id} movie={movie} />
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <MoviePagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                        />
                    )}
                </>
            )}
        </div>
    )
}