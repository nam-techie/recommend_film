import { requireUser } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { listRequestBody } from '@/lib/server/karaoke-request'
import { getKaraokeLibrary } from '@/lib/server/karaoke-library'
import { karaokeDocx } from '@/lib/server/karaoke-docx'
import { validSongTitle } from '@/lib/karaoke-library'
import { MonetizationError } from '@/lib/server/monetization-error'
export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  try {
    const { uid } = await requireUser(request), body = await listRequestBody(request) as { videoIds?: unknown }
    const ids = body?.videoIds
    if (!Array.isArray(ids) || !ids.length || ids.length > 500 || new Set(ids).size !== ids.length || ids.some(id => typeof id !== 'string' || !/^[\w-]{11}$/.test(id))) throw new MonetizationError('INVALID_SELECTION', 'Hãy chọn những bài cần xuất.')
    const library = await getKaraokeLibrary(uid)
    const titles = ids.map(id => { const song = library.songs[id]; if (!song || !validSongTitle(song.title, id)) throw new MonetizationError('MISSING_TITLE', 'Hãy đặt tên hoặc lấy lại tiêu đề cho các bài chưa có tên trước khi xuất.'); return song.title })
    return new Response(new Uint8Array(karaokeDocx(titles)), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': 'attachment; filename="karaoke.docx"', 'Cache-Control': 'private, no-store' } })
  } catch (error) { return apiError(error, 'Chưa xuất được danh sách bài hát.') }
}
