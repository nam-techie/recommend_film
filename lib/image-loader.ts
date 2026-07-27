'use client'

/**
 * Loader tuỳ chỉnh cho next/image.
 *
 *  - Ảnh nội bộ (/poster-fallback.svg, /icons/...) → trả nguyên, không đụng tới.
 *  - Ảnh remote → đi qua /api/img để resize về đúng cỡ hiển thị.
 *
 * Đổi hành vi bằng NEXT_PUBLIC_IMAGE_PROXY:
 *    'self'   (mặc định) — dùng /api/img (không tốn quota Vercel)
 *    'none'   — phục vụ thẳng ảnh gốc (chỉ để debug; poster gốc nặng ~1MB)
 */
const MODE = process.env.NEXT_PUBLIC_IMAGE_PROXY || 'self'

export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  if (!src.startsWith('http')) return src
  if (MODE === 'none') return src
  return `/api/img?u=${encodeURIComponent(src)}&w=${width}&q=${quality || 72}`
}
