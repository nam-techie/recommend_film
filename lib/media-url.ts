const serviceUrl = () => (process.env.NEXT_PUBLIC_WATCH_PARTY_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:4001' : '')).trim().replace(/\/$/, '')

export function watchPartyHlsCandidates(source?: string) {
  if (!source) return []
  const candidates = [source]
  const base = serviceUrl()
  if (base) candidates.push(`${base}/api/media/proxy?url=${encodeURIComponent(source)}`)
  return [...new Set(candidates)]
}

export function playableHlsUrl(source?: string) {
  return watchPartyHlsCandidates(source)[0]
}
