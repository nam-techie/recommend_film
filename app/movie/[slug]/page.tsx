import { MovieDetailPage } from '@/components/pages/MovieDetailPage'

interface MoviePageProps {
    params: {
        slug: string
    }
}

export default function MoviePage({ params }: MoviePageProps) {
    return <MovieDetailPage slug={params.slug} />
}