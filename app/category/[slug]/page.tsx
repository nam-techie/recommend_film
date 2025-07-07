import { Metadata } from 'next'
import { CategoryDetailPage } from '@/components/pages/CategoryDetailPage'
import { getCategoryInfo, getAllCategories } from '@/lib/api'
import { notFound } from 'next/navigation'

interface PageProps {
  params: { slug: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = params
  
  try {
    const category = getCategoryInfo(slug)
    
    if (!category) {
      return {
        title: 'Danh mục không tồn tại - MovieWiser',
        description: 'Danh mục phim bạn tìm kiếm không tồn tại trên MovieWiser.'
      }
    }

    const categoryTypeVi = category.type === 'country' ? 'Quốc gia' : 'Thể loại'

    return {
      title: `${category.name} - ${categoryTypeVi} Phim Hay - MovieWiser`,
      description: `${category.description} Xem ngay tại MovieWiser với chất lượng HD và phụ đề tiếng Việt.`,
      keywords: [
        category.name.toLowerCase(),
        `phim ${category.name.toLowerCase()}`,
        `xem phim ${category.name.toLowerCase()}`,
        `${category.name} mới nhất`,
        `${category.name} hay nhất`,
        'xem phim online',
        'phim vietsub',
        'phim lồng tiếng',
        'MovieWiser'
      ],
      openGraph: {
        title: `${category.name} - MovieWiser`,
        description: category.description,
        type: 'website',
        url: `https://moviewiser.com/category/${slug}`,
        siteName: 'MovieWiser',
        images: [
          {
            url: '/og-category-default.jpg',
            width: 1200,
            height: 630,
            alt: `${category.name} - MovieWiser`
          }
        ]
      },
      twitter: {
        card: 'summary_large_image',
        title: `${category.name} - MovieWiser`,
        description: category.description,
        images: ['/og-category-default.jpg']
      },
      alternates: {
        canonical: `https://moviewiser.com/category/${slug}`
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1
        }
      }
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Danh mục phim - MovieWiser',
      description: 'Khám phá các danh mục phim đa dạng tại MovieWiser.'
    }
  }
}

// Generate static params for popular categories
export async function generateStaticParams() {
  try {
    const categories = getAllCategories()
    // Generate static pages for all predefined categories
    return categories.map((category) => ({
      slug: category.slug,
    }))
  } catch (error) {
    console.error('Error generating static params:', error)
    return []
  }
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = params
  const page = Number(searchParams.page) || 1
  
  // Validate category exists
  const category = getCategoryInfo(slug)
  
  if (!category) {
    notFound()
  }

  return (
    <CategoryDetailPage 
      categorySlug={slug} 
      initialPage={page}
    />
  )
} 