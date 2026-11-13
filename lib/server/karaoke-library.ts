import 'server-only'
import { randomUUID } from 'node:crypto'
import { getDatabase } from 'firebase-admin/database'
import { getFirebaseAdminApp } from './firebase-admin'
import { MonetizationError } from './monetization-error'
import { emptyKaraokeLibrary, type KaraokeLibrary } from '@/lib/karaoke-library'
import { karaokeYoutubeId } from '@/lib/karaoke-youtube-title'

const root = (uid: string) => getDatabase(getFirebaseAdminApp()).ref('karaokeLibraries/' + uid)
export async function getKaraokeLibrary(uid: string): Promise<KaraokeLibrary> {
  const value = (await root(uid).get()).val()
  return { ...emptyKaraokeLibrary(), ...value, songs: value?.songs || {}, playlists: Object.fromEntries(Object.entries(value?.playlists || {}).map(([id, p]) => [id, { ...(p as any), videoIds: (p as any).videoIds || [] }])) }
}
export async function mutateKaraokeLibrary(uid: string, raw: unknown) {
  const d = raw as Record<string, any>
  if (!d || !Number.isSafeInteger(d.revision) || d.revision < 0) throw new MonetizationError('INVALID_REVISION', 'Hãy tải lại thư viện trước khi lưu.')
  const id = randomUUID(), now = Date.now()
  let message = ''
  const result = await root(uid).transaction((value: KaraokeLibrary | null) => {
    message = ''
    if (value === null && d.revision > 0) return null
    const state: KaraokeLibrary = { ...emptyKaraokeLibrary(), ...value, songs: { ...value?.songs }, playlists: { ...value?.playlists } }
    for (const [key, list] of Object.entries(state.playlists)) state.playlists[key] = { ...list, videoIds: list.videoIds || [] }
    if (state.revision !== d.revision) { message = 'Thư viện đã thay đổi ở tab khác. Hãy tải lại rồi thử lại.'; return }
    const fail = (text: string) => { message = text; return undefined }
    if (d.action === 'song') {
      const videoId = typeof d.url === 'string' ? karaokeYoutubeId(d.url) : null
      if (!videoId || typeof d.title !== 'string' || d.title.length > 120 || /[\u0000-\u001f]/.test(d.title) || typeof d.favorite !== 'boolean') return fail('Thông tin bài hát không hợp lệ.')
      const old = state.songs[videoId]
      if (!old && Object.keys(state.songs).length >= 500) return fail('Thư viện tối đa 500 bài.')
      state.songs[videoId] = { videoId, url: 'https://www.youtube.com/watch?v=' + videoId, title: d.title.trim() || videoId, savedAt: old?.savedAt || now, favorite: d.favorite }
    } else if (d.action === 'playlist:create') {
      if (Object.keys(state.playlists).length >= 20) return fail('Tối đa 20 playlist.')
      if (typeof d.name !== 'string' || !d.name.trim() || d.name.length > 80) return fail('Tên playlist cần từ 1 đến 80 ký tự.')
      state.playlists[id] = { id, name: d.name.trim(), videoIds: [] }
    } else if (['playlist:rename', 'playlist:delete', 'playlist:songs'].includes(d.action)) {
      if (typeof d.id !== 'string' || !Object.hasOwn(state.playlists, d.id)) return fail('Playlist không còn tồn tại.')
      const list = state.playlists[d.id]
      if (d.action === 'playlist:delete') delete state.playlists[d.id]
      else if (d.action === 'playlist:rename') {
        if (typeof d.name !== 'string' || !d.name.trim() || d.name.length > 80) return fail('Tên playlist cần từ 1 đến 80 ký tự.')
        state.playlists[d.id] = { ...list, name: d.name.trim() }
      } else {
        if (!Array.isArray(d.videoIds) || d.videoIds.length > 100 || new Set(d.videoIds).size !== d.videoIds.length || d.videoIds.some((key: unknown) => typeof key !== 'string' || !Object.hasOwn(state.songs, key))) return fail('Playlist tối đa 100 bài đã lưu, không trùng nhau.')
        state.playlists[d.id] = { ...list, videoIds: d.videoIds }
      }
    } else return fail('Thao tác không hợp lệ.')
    // Removing a favorite never removes a playlist reference. Unreferenced songs
    // may be discarded so they do not consume the user's library allowance.
    const referenced = new Set(Object.values(state.playlists).flatMap(p => p.videoIds || []))
    for (const [key, song] of Object.entries(state.songs)) if (!song.favorite && !referenced.has(key)) delete state.songs[key]
    state.revision++
    return state
  })
  if (!result.committed || !result.snapshot.exists()) throw new MonetizationError('KARAOKE_CONFLICT', message || 'Thư viện đã thay đổi. Hãy tải lại rồi thử lại.', 409)
  return getKaraokeLibrary(uid)
}
