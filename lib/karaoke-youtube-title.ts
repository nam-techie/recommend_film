export function karaokeYoutubeId(input: string): string | null {
  try {
    const url = new URL(input)
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null
    const id = url.hostname === 'youtu.be' ? url.pathname.slice(1) : ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname) ? url.pathname === '/watch' ? url.searchParams.get('v') : /^\/(shorts|embed)\/([^/]+)$/.exec(url.pathname)?.[2] : null
    return id && /^[\w-]{11}$/.test(id) ? id : null
  } catch { return null }
}

export async function fetchKaraokeYoutubeTitle(id: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const response = await fetch(`/api/karaoke/youtube-title?id=${encodeURIComponent(id)}`, { signal: signal || AbortSignal.timeout(5000) })
    if (!response.ok) return null
    const data = await response.json()
    return typeof data.title === 'string' && data.title.trim() ? data.title.trim().slice(0, 120) : null
  } catch { return null }
}
