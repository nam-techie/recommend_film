import { beforeEach, describe, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ data: {} as Record<string, any>, reads: [] as string[], cold: false }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/server/firebase-admin', () => ({ getFirebaseAdminApp: () => ({}) }))
vi.mock('firebase-admin/database', () => ({ getDatabase: () => ({ ref: (path: string) => ({
  get: async () => { state.reads.push(path); return { val: () => state.data[path] ?? null } },
  transaction: async (update: (value: any) => any) => {
    const current = state.data[path] ?? null
    if (state.cold && current && update(null) === undefined) return { committed: false, snapshot: { exists: () => true } }
    const next = update(structuredClone(current))
    if (next !== undefined) state.data[path] = next
    return { committed: next !== undefined, snapshot: { exists: () => next !== null && next !== undefined } }
  },
}) }) }))
import { getKaraokeLibrary, mutateKaraokeLibrary } from '@/lib/server/karaoke-library'
const url = 'https://youtu.be/abcdefghijk'
beforeEach(() => { state.data={}; state.reads=[]; state.cold=false })
describe('private karaoke library transactions', () => {
  const save = (revision: number, favorite = true) => mutateKaraokeLibrary('u', {action:'song',url,title:'Một ngày mới',favorite,revision})
  it('deduplicates by video, normalizes URL and never reads another account or movie libraries', async () => {
    await save(0); await save(1)
    const library=await getKaraokeLibrary('u')
    expect(Object.keys(library.songs)).toEqual(['abcdefghijk'])
    expect(library.songs.abcdefghijk.url).toBe('https://www.youtube.com/watch?v=abcdefghijk')
    expect((await getKaraokeLibrary('other')).songs).toEqual({})
    expect(state.reads.every(path=>path.startsWith('karaokeLibraries/'))).toBe(true)
  })
  it('keeps playlist references after removing a favorite; deleting a playlist preserves other favorites', async () => {
    await save(0)
    const created=await mutateKaraokeLibrary('u',{action:'playlist:create',name:'Hát cùng nhau',revision:1}), id=Object.keys(created.playlists)[0]
    await mutateKaraokeLibrary('u',{action:'playlist:songs',id,videoIds:['abcdefghijk'],revision:2})
    const unhearted=await save(3,false)
    expect(unhearted.playlists[id].videoIds).toEqual(['abcdefghijk']);expect(unhearted.songs.abcdefghijk.favorite).toBe(false)
    await save(4,true)
    await mutateKaraokeLibrary('u',{action:'playlist:delete',id,revision:5})
    expect((await getKaraokeLibrary('u')).songs.abcdefghijk.favorite).toBe(true)
  })
  it('handles cold transaction cache and rejects stale revisions without overwriting data', async () => {
    await save(0);state.cold=true;await save(1)
    await expect(mutateKaraokeLibrary('u',{action:'song',url,title:'Stale',favorite:true,revision:1})).rejects.toMatchObject({status:409})
    expect((await getKaraokeLibrary('u')).songs.abcdefghijk.title).toBe('Một ngày mới')
    await expect(save(99)).rejects.toMatchObject({status:409})
    await expect(mutateKaraokeLibrary('deleted',{action:'song',url,title:'Song',favorite:true,revision:9})).rejects.toMatchObject({status:409})
  })
  it('enforces the library, playlist and playlist-song limits inside the transaction', async () => {
    const songs=Object.fromEntries(Array.from({length:500},(_,i)=>[String(i).padStart(11,'0'),{videoId:String(i).padStart(11,'0'),favorite:true}]))
    state.data['karaokeLibraries/u']={revision:1,songs,playlists:{}}
    await expect(save(1)).rejects.toThrow('500')
    state.data['karaokeLibraries/u'].playlists=Object.fromEntries(Array.from({length:20},(_,i)=>['p'+i,{id:'p'+i,name:'List',videoIds:[]}]))
    await expect(mutateKaraokeLibrary('u',{action:'playlist:create',name:'21',revision:1})).rejects.toThrow('20')
    await expect(mutateKaraokeLibrary('u',{action:'playlist:songs',id:'p0',videoIds:Object.keys(songs).slice(0,101),revision:1})).rejects.toThrow('100')
  })
})
