import { NextResponse } from 'next/server'
import sharp from 'sharp'

/**
 * Bộ resize ảnh của CineMind.
 *
 * Vì sao tồn tại: poster gốc từ phimimg.com là JPEG 2000×3000 (~1MB) cho ô hiển thị
 * 186px. Hai lựa chọn có sẵn đều hỏng:
 *   - Phục vụ thẳng ảnh gốc → ~110MB cho một lần mở trang chủ.
 *   - Vercel Image Optimization → hết quota, trả 402, toàn site mất poster
 *     (đúng tình trạng production trước khi có file này).
 *
 * Route này resize một lần rồi để CDN cache vĩnh viễn (ảnh phim là bất biến).
 * Không dùng quota image optimization, chạy được cả trên Vercel lẫn Docker tự host.
 *
 * Lỗi ở bất kỳ khâu nào → redirect về ảnh gốc, tuyệt đối không trả ô trống.
 */

export const runtime = 'nodejs'

const ALLOWED_HOSTS = new Set(['phimimg.com', 'img.ophim.live', 'media.themoviedb.org', 'img.phimapi.com'])
const ALLOWED_WIDTHS = [128, 192, 256, 384, 640, 828, 1080, 1280, 1600, 1920]
const CACHE_HEADER = 'public, max-age=31536000, s-maxage=31536000, immutable'

function nearestWidth(requested: number) {
  return ALLOWED_WIDTHS.reduce((best, width) => (Math.abs(width - requested) < Math.abs(best - requested) ? width : best), ALLOWED_WIDTHS[0])
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawUrl = searchParams.get('u')
  if (!rawUrl) return new NextResponse('Thiếu tham số u', { status: 400 })

  let target: URL
  try {
    target = new URL(rawUrl)
  } catch {
    return new NextResponse('URL không hợp lệ', { status: 400 })
  }

  // Chặn SSRF: chỉ cho phép đúng các CDN ảnh phim đã khai báo.
  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) {
    return new NextResponse('Host không được phép', { status: 403 })
  }

  const width = nearestWidth(Number(searchParams.get('w')) || 256)
  const quality = Math.min(90, Math.max(40, Number(searchParams.get('q')) || 72))

  try {
    // Không dùng Next data cache: ảnh gốc ~1MB, vượt giới hạn cache entry và
    // không cần thiết — bản đã resize mới là thứ được CDN cache lâu dài.
    const upstream = await fetch(target.toString(), {
      headers: { accept: 'image/avif,image/webp,image/*,*/*;q=0.8' },
      cache: 'no-store',
    })
    if (!upstream.ok) return NextResponse.redirect(target.toString(), 302)

    const input = Buffer.from(await upstream.arrayBuffer())
    const output = await sharp(input)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality, effort: 4 })
      .toBuffer()

    return new NextResponse(output, {
      headers: {
        'content-type': 'image/webp',
        'content-length': String(output.byteLength),
        'cache-control': CACHE_HEADER,
      },
    })
  } catch (error) {
    console.error('[img] resize thất bại, trả ảnh gốc:', target.hostname, error)
    return NextResponse.redirect(target.toString(), 302)
  }
}
