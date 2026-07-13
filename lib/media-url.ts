export function playableHlsUrl(source?: string) {
  if (!source) return undefined
  const base = process.env.NEXT_PUBLIC_WATCH_PARTY_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:4001' : '')
  if (!base) return source
  return `${base}/api/media/proxy?url=${encodeURIComponent(source)}`
}
