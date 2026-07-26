'use client'

import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export const POSTER_FALLBACK = '/poster-fallback.svg'

/** Blur 1×1 màu surface-2 — tránh ô đen nhấp nháy trước khi ảnh về. */
const BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjYiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjYiIGZpbGw9IiMxMjE1MWYiLz48L3N2Zz4='

type MovieImageProps = Omit<ImageProps, 'src' | 'onError' | 'placeholder' | 'blurDataURL' | 'unoptimized'> & {
  src?: string | null
  /** Ảnh thay thế khi src lỗi hoặc rỗng. */
  fallbackSrc?: string
  /** Nhãn hiển thị đè lên khi ảnh không tải được (thường là tên phim). */
  fallbackLabel?: string
}

/**
 * Bọc next/image với xử lý lỗi tường minh.
 *
 * Lý do tồn tại: trước đây poster dùng <Image> trần. Khi CDN ảnh trả lỗi
 * (402/404/timeout) card chỉ còn một ô xám trống — user không biết site lỗi,
 * họ chỉ thấy web rỗng. Component này luôn đảm bảo có gì đó để nhìn.
 */
export function MovieImage({
  src,
  alt,
  className,
  fallbackSrc = POSTER_FALLBACK,
  fallbackLabel,
  ...props
}: MovieImageProps) {
  const [failed, setFailed] = useState(false)
  const resolved = !src || failed ? fallbackSrc : src
  const isLocalAsset = !resolved.startsWith('http')

  return (
    <>
      <Image
        {...props}
        src={resolved}
        alt={alt}
        unoptimized={isLocalAsset}
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        onError={() => setFailed(true)}
        className={cn(className, failed && 'object-contain p-2 opacity-70')}
      />
      {failed && fallbackLabel && (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] bg-gradient-to-t from-black/90 to-transparent p-2 text-center text-xs font-semibold leading-tight text-text-secondary">
          {fallbackLabel}
        </span>
      )}
    </>
  )
}
