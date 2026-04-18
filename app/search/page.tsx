import { Suspense } from 'react'
import { SearchPage } from "@/components/pages/SearchPage"
import { Loader2 } from 'lucide-react'

export default function Search() {
    return (
        <Suspense fallback={
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <SearchPage />
        </Suspense>
    )
}