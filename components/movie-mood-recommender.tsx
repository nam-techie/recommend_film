'use client'

import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
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
    { value: 'happy', label: '😊 Happy' },
    { value: 'sad', label: '😢 Sad' },
    { value: 'excited', label: '🤩 Excited' },
    { value: 'relaxed', label: '😌 Relaxed' },
    { value: 'scared', label: '😨 Scared' },
] as const

const MOVIES_PER_PAGE = 9

// API Functions
const TMDB_API_KEY = process.env.NEXT_PUBLIC_MOVIE_API_KEY!

const fetchMoviesByGenre = async (genreId: string | number, page: number): Promise<{ movies: Movie[], totalPages: number }> => {
    try {
        const response = await fetch(
            `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&page=${page}`
        )
        if (!response.ok) {
            throw new Error('Failed to fetch movies')
        }
        const data = await response.json()
        return {
            movies: data.results.slice(0, MOVIES_PER_PAGE),
            totalPages: Math.min(data.total_pages, 500) // TMDB API limits to 500 pages
        }
    } catch (error) {
        console.error('Error fetching movies:', error)
        return { movies: [], totalPages: 0 }
    }
}

// Components
const MovieCard = ({ movie }: MovieCardProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="truncate">{movie.title}</CardTitle>
                <CardDescription>{new Date(movie.release_date).getFullYear()}</CardDescription>
            </CardHeader>
            <CardContent>
                <img
                    src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                    alt={`${movie.title} poster`}
                    className="w-full h-64 object-cover rounded-md transition-transform duration-300 group-hover:scale-110"
                />
                <p className="flex items-center mt-2">
                    <Star className="h-5 w-5 text-yellow-400 mr-1" />
                    {movie.vote_average.toFixed(1)}
                </p>
            </CardContent>
            <CardFooter>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline">More Info</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{movie.title}</DialogTitle>
                            <DialogDescription>
                                {new Date(movie.release_date).getFullYear()} | Rating: {movie.vote_average.toFixed(1)}
                            </DialogDescription>
                        </DialogHeader>
                        <p>{movie.overview}</p>
                    </DialogContent>
                </Dialog>
            </CardFooter>
        </Card>
    )
}

const SelectionForm = ({ mood, setMood, genre, setGenre, onSubmit }: SelectionFormProps) => {
    return (
        <form onSubmit={onSubmit} className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="mood">How are you feeling?</Label>
                    <Select onValueChange={setMood} value={mood}>
                        <SelectTrigger id="mood">
                            <SelectValue placeholder="Select your mood" />
                        </SelectTrigger>
                        <SelectContent>
                            {MOODS.map(({ value, label }) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="genre">Or choose a specific genre:</Label>
                    <Select onValueChange={setGenre} value={genre}>
                        <SelectTrigger id="genre">
                            <SelectValue placeholder="Select a genre" />
                        </SelectTrigger>
                        <SelectContent>
                            {GENRES.map(({ id, name }) => (
                                <SelectItem key={id} value={id}>{name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <Button type="submit" className="mt-4">Get Recommendations</Button>
        </form>
    )
}

const MoviePagination = ({ currentPage, totalPages, onPageChange }: MoviePaginationProps) => {
    const siblingsCount = 2 // Number of siblings on each side
    const totalNumbers = siblingsCount * 2 + 3 // Total numbers to show including current, first, and last

    const getPageNumbers = () => {
        const pages: (number | 'ellipsis')[] = []

        if (totalPages <= totalNumbers) {
            return Array.from({ length: totalPages }, (_, i) => i + 1)
        }

        // Always include first page
        pages.push(1)

        // Calculate start and end of middle section
        let startPage = Math.max(2, currentPage - siblingsCount)
        let endPage = Math.min(totalPages - 1, currentPage + siblingsCount)

        // Add ellipsis if needed before middle section
        if (startPage > 2) {
            pages.push('ellipsis')
        }

        // Add middle section
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i)
        }

        // Add ellipsis if needed after middle section
        if (endPage < totalPages - 1) {
            pages.push('ellipsis')
        }

        // Always include last page
        if (totalPages > 1) {
            pages.push(totalPages)
        }

        return pages
    }

    const pages = getPageNumbers()

    return (
        <Pagination className="mt-8">
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                            e.preventDefault()
                            if (currentPage > 1) onPageChange(currentPage - 1)
                        }}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
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
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    )
}

// Main Component
export function MovieMoodRecommender() {
    const [mood, setMood] = useState('')
    const [genre, setGenre] = useState('')
    const [movies, setMovies] = useState<Movie[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    const fetchMovies = async (page: number) => {
        setLoading(true)
        setError(null)

        try {
            const genreId = MOOD_TO_GENRE[mood as keyof typeof MOOD_TO_GENRE] || genre
            const { movies: newMovies, totalPages: newTotalPages } = await fetchMoviesByGenre(genreId, page)
            setMovies(newMovies)
            setTotalPages(newTotalPages)
        } catch (err) {
            setError('Failed to fetch movies. Please try again later.')
            console.error('Error:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setCurrentPage(1)
        await fetchMovies(1)
    }

    const handlePageChange = async (page: number) => {
        setCurrentPage(page)
        await fetchMovies(page)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    useEffect(() => {
        handleSubmit(new Event('submit') as unknown as React.FormEvent);
    }, [])

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Movie Mood Recommender</h1>

            <SelectionForm
                mood={mood}
                setMood={setMood}
                genre={genre}
                setGenre={setGenre}
                onSubmit={handleSubmit}
            />

            {loading && (
                <div className="text-center py-8">
                    <p>Loading recommendations...</p>
                </div>
            )}

            {error && (
                <div className="text-center py-8">
                    <p className="text-red-500">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {movies.map(movie => (
                    <MovieCard key={movie.id} movie={movie} />
                ))}
            </div>

            {movies.length > 0 && (
                <MoviePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            )}
        </div>
    )
}
