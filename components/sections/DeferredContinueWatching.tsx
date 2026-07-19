'use client'

import dynamic from 'next/dynamic'

const ContinueWatching = dynamic(
  () => import('@/components/sections/ContinueWatching').then((module) => module.ContinueWatching),
  { ssr: false }
)

export function DeferredContinueWatching() {
  return <ContinueWatching />
}
