'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { MovieSection } from '@/components/sections/MovieSection'
import type { PersonalizedRecommendation, UserPersonalizationFeatures } from '@/lib/personalization'

export function PersonalizedMovieSection() {
  const { user } = useAuth()
  const [data, setData] = useState<{ features: UserPersonalizationFeatures; items: PersonalizedRecommendation[] } | null>(null)
  const loggedSignature = useRef('')
  useEffect(() => {
    if (!user) { setData(null); return }
    let active = true
    void user.getIdToken().then((token) => fetch('/api/me/recommendations?limit=12', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }))
      .then(async (response) => response.ok ? response.json() : null).then((payload) => { if (active && payload) setData(payload) }).catch(() => undefined)
    return () => { active = false }
  }, [user])
  useEffect(() => {
    if (!user || !data?.items.length) return
    const signature = data.items.map((item) => `${item.movie.slug}:${item.reasonCode}`).join('|')
    if (signature === loggedSignature.current) return
    loggedSignature.current = signature
    void user.getIdToken().then((token) => fetch('/api/me/recommendations/events', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ events: data.items.map((item) => ({ type: 'impression', movieSlug: item.movie.slug, reasonCode: item.reasonCode })) }) })).catch(() => undefined)
  }, [data, user])
  const logClick = (slug: string) => {
    const item = data?.items.find((candidate) => candidate.movie.slug === slug)
    if (!user || !item) return
    void user.getIdToken().then((token) => fetch('/api/me/recommendations/events', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ events: [{ type: 'click', movieSlug: slug, reasonCode: item.reasonCode }] }) })).catch(() => undefined)
  }
  if (!data?.features.enabled || !data.items.length) return null
  const topReason = data.items.find((item) => item.reasonCode === 'because_genre_affinity')?.reason
  return <MovieSection title="Dành cho bạn" subtitle={data.features.eligible ? topReason || 'Dựa trên gu và cách bạn xem phim' : 'Đang làm quen với gu của bạn · cần 3 phim và 60 phút xem hợp lệ'} href="/search" movies={data.items.map((item) => item.movie)} onMovieClick={(movie) => logClick(movie.slug)} />
}
