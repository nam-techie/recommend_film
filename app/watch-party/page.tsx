import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Xem Chung - CineMind',
  description: 'Trang chính của tính năng Xem Chung',
}

export default function WatchPartyMainPage() {
  // Redirect to the genres page where the main watch party interface is
  redirect('/genres')
} 