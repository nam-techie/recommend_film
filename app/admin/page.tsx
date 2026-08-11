import type { Metadata } from 'next'
import { AdminDashboardPage } from '@/components/admin/AdminDashboardPage'

export const metadata: Metadata = {
  title: 'Admin Dashboard | CineMind',
  description: 'Trung tâm vận hành CineMind.',
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return <AdminDashboardPage />
}
