export interface KaraokeSavedSong { videoId: string; url: string; title: string; savedAt: number; favorite: boolean }
export interface KaraokePlaylist { id: string; name: string; videoIds: string[] }
export interface KaraokeLibrary { revision: number; songs: Record<string, KaraokeSavedSong>; playlists: Record<string, KaraokePlaylist> }
export const emptyKaraokeLibrary = (): KaraokeLibrary => ({ revision: 0, songs: {}, playlists: {} })
export const validSongTitle = (title: string, id: string) => !!title.trim() && title.trim() !== id && !/https?:\/\//i.test(title) && !/[\u0000-\u001f\ufffe\uffff]/.test(title)
