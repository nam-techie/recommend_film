import { Metadata } from 'next'
import { CountryDetailPage } from '@/components/pages/CountryDetailPage'
import { fetchCountries } from '@/lib/api'
import { notFound } from 'next/navigation'

interface PageProps {
  params: { slug: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = params
  
  try {
    // Fetch countries to get the country name
    const countries = await fetchCountries()
    const country = countries.find(c => c.slug === slug)
    
    if (!country) {
      return {
        title: 'Quốc gia không tồn tại - MovieWiser',
        description: 'Quốc gia bạn tìm kiếm không tồn tại trên MovieWiser.'
      }
    }

    return {
      title: `Phim ${country.name} - MovieWiser`,
      description: `Khám phá bộ sưu tập phim ${country.name} chất lượng cao với phụ đề tiếng Việt tại MovieWiser. Xem phim ${country.name} mới nhất và hay nhất.`,
      keywords: [
        `phim ${country.name}`,
        `xem phim ${country.name}`,
        `phim ${country.name} mới nhất`,
        `phim ${country.name} hay nhất`,
        'xem phim online',
        'phim vietsub',
        'MovieWiser'
      ],
      openGraph: {
        title: `Phim ${country.name} - MovieWiser`,
        description: `Khám phá bộ sưu tập phim ${country.name} chất lượng cao với phụ đề tiếng Việt tại MovieWiser.`,
        type: 'website',
        url: `https://moviewiser.com/country/${slug}`,
        siteName: 'MovieWiser'
      },
      twitter: {
        card: 'summary_large_image',
        title: `Phim ${country.name} - MovieWiser`,
        description: `Khám phá bộ sưu tập phim ${country.name} chất lượng cao với phụ đề tiếng Việt.`,
      },
      alternates: {
        canonical: `https://moviewiser.com/country/${slug}`
      }
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Phim theo quốc gia - MovieWiser',
      description: 'Khám phá phim theo quốc gia tại MovieWiser.'
    }
  }
}

// Generate static params for popular countries
export async function generateStaticParams() {
  try {
    const countries = await fetchCountries()
    // Generate static params for popular countries only
    const popularCountrySlugs = [
      'han-quoc', 'trung-quoc', 'au-my', 'nhat-ban', 'thai-lan', 
      'viet-nam', 'anh', 'phap', 'duc', 'an-do'
    ]
    
    return countries
      .filter(country => popularCountrySlugs.includes(country.slug))
      .map((country) => ({
        slug: country.slug,
      }))
  } catch (error) {
    console.error('Error generating static params:', error)
    return []
  }
}

export default function CountryPage({ params, searchParams }: PageProps) {
  const page = searchParams.page ? parseInt(searchParams.page as string) || 1 : 1
  
  return <CountryDetailPage countrySlug={params.slug} initialPage={page} />
} 