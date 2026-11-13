'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { emptyKaraokeLibrary, type KaraokeLibrary } from '@/lib/karaoke-library'
import type { KaraokeQueueItem } from '@/lib/karaoke-types'

export function useKaraokeLibrary(uid: string | undefined, getToken: () => Promise<string | null>) {
  const [library, setLibrary] = useState<KaraokeLibrary>(emptyKaraokeLibrary), [loading, setLoading] = useState(false), [loadError, setLoadError] = useState('')
  const state = useRef(library), identity = useRef(uid), token = useRef(getToken), writing = useRef(false)
  identity.current = uid; token.current = getToken; state.current = library
  const request = useCallback(async (body?: object, exportFile = false, query = '') => {
    const expected = identity.current, bearer = await token.current()
    if (!expected || !bearer) throw Error('Hãy đăng nhập để dùng thư viện.')
    const response = await fetch('/api/me/karaoke' + (exportFile ? '/export' : query), { method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + bearer, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), cache: 'no-store' })
    if (identity.current !== expected) throw Error('Tài khoản đã thay đổi. Hãy tải lại thư viện.')
    if (!response.ok) { const error = await response.json(); throw Error(error.error || 'Chưa thực hiện được. Hãy thử lại.') }
    return response
  }, [])
  const reload = useCallback(async () => {
    const expected = identity.current
    try {
      const value = await (await request()).json()
      let next: string | null = value.next
      while (next) { const page = await (await request(undefined, false, `?after=${next}&revision=${value.revision}`)).json(); Object.assign(value.songs, page.songs); next = page.next }
      if (identity.current !== expected) return
      state.current=value; setLibrary(value); setLoadError('')
    } catch (error) { if (identity.current === expected) setLoadError((error as Error).message); throw error }
  }, [request])
  useEffect(() => { setLibrary(emptyKaraokeLibrary()); setLoadError(''); if (uid) { setLoading(true); void reload().catch(() => {}).finally(() => setLoading(false)) } }, [uid, reload])
  const mutate = async (body: object) => {
    if (writing.current) throw Error('Đang lưu thư viện. Vui lòng chờ.')
    writing.current = true
    try { await request({ ...body, revision: state.current.revision }); await reload() }
    catch (error) { await reload().catch(() => {}); throw error }
    finally { writing.current = false }
  }
  const favorite = (song: Pick<KaraokeQueueItem, 'videoId' | 'label'>) => mutate({ action:'song', url:'https://www.youtube.com/watch?v=' + song.videoId, title:song.label, favorite:!state.current.songs[song.videoId]?.favorite })
  const exportSongs = async (videoIds: string[]) => {
    const response = await request({ videoIds }, true), url = URL.createObjectURL(await response.blob()), a = document.createElement('a')
    a.href=url; a.download='karaoke.docx'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000)
  }
  return { library, loading, loadError, reload, mutate, favorite, exportSongs }
}
