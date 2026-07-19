import { HomePage } from '@/components/pages/HomePage'
import { getHomePageData } from '@/lib/home-data'

export const revalidate = 300

export default async function Home() {
  const data = await getHomePageData()
  return <HomePage data={data} />
}
