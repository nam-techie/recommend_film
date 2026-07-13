export function playableHlsUrl(source?: string) {
  if (!source) return undefined
  const base = process.env.NEXT_PUBLIC_WATCH_PARTY_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:4001' : '')
  // Direct CDN playback is intentionally not used: some KKPhim hosts are
  // blocked client-side and their CORS policy is not stable. Production must
  // point this at the deployed watch-party service (Railway, Render, etc.).
  if (!base) return undefined
  return `${base}/api/media/proxy?url=${encodeURIComponent(source)}`
}
