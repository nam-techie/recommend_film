'use client'

import { useState, useEffect } from 'react'
import { Star, Heart, Calendar, Clock, Play, Info } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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

// Types
interface Movie {
    id: number
    title: string
    release_date: string
    poster_path: string
    vote_average: number
    overview: string
    genre_ids?: number[]
    runtime?: number
    backdrop_path?: string
}

interface MovieCardProps {
    movie: Movie
}

interface SelectionFormProps {
    mood: string
    setMood: (mood: string) => void
    genre: string
    setGenre: (genre: string) => void
    onSubmit: (e: React.FormEvent) => void
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
} as const

const GENRES = [
    { id: '12', name: 'Adventure' },
    { id: '28', name: 'Action' },
    { id: '35', name: 'Comedy' },
    { id: '18', name: 'Drama' },
    { id: '27', name: 'Horror' },
    { id: '10749', name: 'Romance' },
    { id: '878', name: 'Science Fiction' },
] as const

const MOODS = [
    { value: 'happy', label: '😊 Happy', color: 'bg-yellow-500' },
    { value: 'sad', label: '😢 Sad', color: 'bg-blue-500' },
    { value: 'excited', label: '🤩 Excited', color: 'bg-red-500' },
    { value: 'relaxed', label: '😌 Relaxed', color: 'bg-green-500' },
    { value: 'scared', label: '😨 Scared', color: 'bg-purple-500' },
] as const

const MOVIES_PER_PAGE = 12

// API Functions
const TMDB_API_KEY = process.env.NEXT_PUBLIC_MOVIE_API_KEY!

const fetchMoviesByGenre = async (genreId: string | number, page: number): Promise<{ movies: Movie[], totalPages: number }> => {
    try {
        const response = await fetch(
            `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&page=${page}&vote_count.gte=100`
        )
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

// Components
const MovieCard = ({ movie }: MovieCardProps) => {
    const [isLiked, setIsLiked] = useState(false)
    const [imageLoaded, setImageLoaded] = useState(false)

    return (
        <Card className="group overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-105 border-0 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
            <div className="relative overflow-hidden">
                {!imageLoaded && (
                    <Skeleton className="w-full h-80" />
                )}
                <img
                    src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                    alt={`${movie.title} poster`}
                    className={`w-full h-80 object-cover transition-all duration-500 group-hover:scale-110 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setImageLoaded(true)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Floating Action Buttons */}
                <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
                    <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-md border-0 hover:bg-white/30"
                        onClick={() => setIsLiked(!isLiked)}
                    >
                        <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                    </Button>
                </div>

                {/* Rating Badge */}
                <div className="absolute top-4 left-4">
                    <Badge className="bg-black/50 backdrop-blur-md text-white border-0">
                        <Star className="h-3 w-3 text-yellow-400 mr-1 fill-current" />
                        {movie.vote_average.toFixed(1)}
                    </Badge>
                </div>

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <Button size="icon" className="h-16 w-16 rounded-full bg-primary/80 backdrop-blur-md hover:bg-primary">
                        <Play className="h-8 w-8 ml-1" />
                    </Button>
                </div>
            </div>

            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold line-clamp-2 group-hover:text-primary transition-colors">
                    {movie.title}
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(movie.release_date).getFullYear()}
                </CardDescription>
            </CardHeader>

            <CardFooter className="pt-0">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                            <Info className="h-4 w-4 mr-2" />
                            More Details
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="relative">
                            {movie.backdrop_path && (
                                <img
                                    src={`https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`}
                                    alt={`${movie.title} backdrop`}
                                    className="w-full h-48 object-cover rounded-lg mb-4"
                                />
                            )}
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold">{movie.title}</DialogTitle>
                                <DialogDescription className="flex items-center gap-4 text-base">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        {new Date(movie.release_date).getFullYear()}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                        {movie.vote_average.toFixed(1)}/10
                                    </span>
                                </DialogDescription>
                            </DialogHeader>
                            <div className="mt-4">
                                <h4 className="font-semibold mb-2">Overview</h4>
                                <p className="text-muted-foreground leading-relaxed">{movie.overview}</p>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardFooter>
        </Card>
    )
}

const SelectionForm = ({ mood, setMood, genre, setGenre, onSubmit }: SelectionFormProps) => {
    return (
        <div className="mb-12">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
                    Discover Your Perfect Movie
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Let your mood guide you to the perfect cinematic experience
                </p>
            </div>

            <Card className="max-w-4xl mx-auto border-0 bg-gradient-to-r from-card/50 to-card/30 backdrop-blur-sm">
                <CardContent className="p-8">
                    <form onSubmit={onSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <Label htmlFor="mood" className="text-lg font-semibold">How are you feeling today?</Label>
                                <Select onValueChange={setMood} value={mood}>
                                    <SelectTrigger id="mood" className="h-12 text-base">
                                        <SelectValue placeholder="Select your mood" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MOODS.map(({ value, label }) => (
                                            <SelectItem key={value} value={value} className="text-base py-3">
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-4">
                                <Label htmlFor="genre" className="text-lg font-semibold">Or choose a specific genre:</Label>
                                <Select onValueChange={setGenre} value={genre}>
                                    <SelectTrigger id="genre" className="h-12 text-base">
                                        <SelectValue placeholder="Select a genre" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {GENRES.map(({ id, name }) => (
                                            <SelectItem key={id} value={id} className="text-base py-3">{name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex justify-center mt-8">
                            <Button type="submit" size="lg" className="px-12 py-6 text-lg font-semibold bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 transition-all duration-300 transform hover:scale-105">
                                <Play className="h-5 w-5 mr-2" />
                                Get My Recommendations
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

const MoviePagination = ({ currentPage, totalPages, onPageChange }: MoviePaginationProps) => {
    const siblingsCount = 2
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
        <Pagination className="mt-12">
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                            e.preventDefault()
                            if (currentPage > 1) onPageChange(currentPage - 1)
                        }}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "hover:bg-primary hover:text-primary-foreground"}
                    />
                </PaginationItem>

                {pages.map((page, index) => (
                    page === 'ellipsis' ? (
                        <PaginationItem key={`ellipsis-${index}`}>
                            <PaginationEllipsis />
                        </PaginationItem>
                    ) : (
                        <PaginationItem key={page}>
                            <PaginationLink
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault()
                                    onPageChange(page)
                                }}
                                isActive={currentPage === page}
                                className={currentPage === page ? "bg-primary text-primary-foreground" : "hover:bg-primary hover:text-primary-foreground"}
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
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "hover:bg-primary hover:text-primary-foreground"}
                    />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    )
}

const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
                <Skeleton className="w-full h-80" />
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
    const [genre, setGenre] = useState('')
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
            const genreId = MOOD_TO_GENRE[mood as keyof typeof MOOD_TO_GENRE] || genre
            const { movies: newMovies, totalPages: newTotalPages } = await fetchMoviesByGenre(genreId, page)
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

    return (
        <div className="min-h-screen">
            <SelectionForm
                mood={mood}
                setMood={setMood}
                genre={genre}
                setGenre={setGenre}
                onSubmit={handleSubmit}
            />

            {loading && <LoadingSkeleton />}

            {error && (
                <div className="text-center py-16">
                    <div className="max-w-md mx-auto">
                        <div className="text-6xl mb-4">😔</div>
                        <h3 className="text-xl font-semibold mb-2">Oops! Something went wrong</h3>
                        <p className="text-muted-foreground mb-4">{error}</p>
                        <Button onClick={() => window.location.reload()}>
                            Try Again
                        </Button>
                    </div>
                </div>
            )}

            {!loading && !error && hasSearched && movies.length === 0 && (
                <div className="text-center py-16">
                    <div className="max-w-md mx-auto">
                        <div className="text-6xl mb-4">🎬</div>
                        <h3 className="text-xl font-semibold mb-2">No movies found</h3>
                        <p className="text-muted-foreground">Try selecting a different mood or genre.</p>
                    </div>
                </div>
            )}

            {!loading && movies.length > 0 && (
                <>
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold mb-2">
                            Recommended for you
                        </h2>
                        <p className="text-muted-foreground">
                            Found {movies.length} movies that match your preferences
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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