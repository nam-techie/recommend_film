import { requireUser } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { listJson, listRequestBody } from '@/lib/server/karaoke-request'
import { getKaraokeLibrary, mutateKaraokeLibrary } from '@/lib/server/karaoke-library'
import { MonetizationError } from '@/lib/server/monetization-error'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try {
    const { uid } = await requireUser(request), query = new URL(request.url).searchParams, after = query.get('after')
    if (after && !/^[\w-]{11}$/.test(after)) throw new MonetizationError('INVALID_CURSOR', 'Vị trí trang không hợp lệ.')
    const library = await getKaraokeLibrary(uid)
    if (query.has('revision') && query.get('revision') !== String(library.revision)) throw new MonetizationError('KARAOKE_CONFLICT', 'Thư viện đã thay đổi. Hãy tải lại.', 409)
    const keys = Object.keys(library.songs).sort().filter(id => !after || id > after), page = keys.slice(0, 50)
    return listJson({ ...library, songs: Object.fromEntries(page.map(id => [id, library.songs[id]])), next: keys.length > 50 ? page.at(-1) : null })
  }
  catch (error) { return apiError(error, 'Chưa tải được thư viện karaoke.') }
}
export async function POST(request: Request) {
  try { const { uid } = await requireUser(request); const library = await mutateKaraokeLibrary(uid, await listRequestBody(request)); return listJson({ revision: library.revision }) }
  catch (error) { return apiError(error, 'Chưa lưu được thư viện karaoke.') }
}
