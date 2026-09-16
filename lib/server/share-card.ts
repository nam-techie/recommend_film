import 'server-only'

import sharp from 'sharp'
import { AdminAccessError } from '@/lib/server/firebase-admin'
import { getOwnShareCardContext } from '@/lib/server/profile'
import { buildShareCardSvg, SHARE_CARD_ACCENTS, SHARE_CARD_DIMENSIONS, shareCardFilename } from '@/lib/share-card-artwork'
import type {
  ShareCardAccent,
  ShareCardAvatarLayout,
  ShareCardFormat,
  ShareCardOptionalField,
  ShareCardRange,
  ShareCardRenderInput,
} from '@/lib/profile'

const allowedFields = new Set<ShareCardOptionalField>([
  'plan', 'joinedAt', 'favoriteGenres', 'moviesOpened', 'episodesWatched',
  'watchHours', 'completionRate', 'favoriteMovies',
])
const avatarLayouts = new Set<ShareCardAvatarLayout>(['corner', 'right', 'floating'])
const avatarHosts = new Set(['res.cloudinary.com'])
const posterHosts = new Set(['phimimg.com', 'img.ophim.live', 'media.themoviedb.org', 'img.phimapi.com'])

function parseInput(value: unknown): ShareCardRenderInput {
  const input = (value || {}) as Partial<ShareCardRenderInput>
  const range: ShareCardRange = input.range === '90d' ? '90d' : '30d'
  const format: ShareCardFormat = input.format === 'story' ? 'story' : 'portrait'
  const accent: ShareCardAccent = input.accent && Object.prototype.hasOwnProperty.call(SHARE_CARD_ACCENTS, input.accent) ? input.accent : 'fuchsia'
  const avatarLayout: ShareCardAvatarLayout = input.avatarLayout && avatarLayouts.has(input.avatarLayout) ? input.avatarLayout : 'corner'
  const fields = Array.from(new Set(Array.isArray(input.fields)
    ? input.fields.filter((field): field is ShareCardOptionalField => allowedFields.has(field as ShareCardOptionalField))
    : []))
  const favoriteMovieSlugs = Array.from(new Set(Array.isArray(input.favoriteMovieSlugs)
    ? input.favoriteMovieSlugs.map((slug) => String(slug).trim().slice(0, 160)).filter(Boolean).slice(0, 3)
    : []))
  const avatarSeed = typeof input.avatarSeed === 'number' && Number.isInteger(input.avatarSeed) && input.avatarSeed >= 0 && input.avatarSeed <= 65535 ? input.avatarSeed : 0
  const theme = input.theme === 'noir' || input.theme === 'premiere' ? input.theme : 'signature'
  return { range, format, accent, avatarLayout, avatarSeed, fields, favoriteMovieSlugs, theme }
}

async function readBodyLimited(response: Response, maxBytes: number) {
  const declared = Number(response.headers.get('content-length') || 0)
  if (declared > maxBytes) throw new Error('Remote image is too large.')
  if (!response.body) {
    const bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.length > maxBytes) throw new Error('Remote image is too large.')
    return bytes
  }
  const reader = response.body.getReader()
  const chunks: Buffer[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) throw new Error('Remote image is too large.')
      chunks.push(Buffer.from(value))
    }
  } finally {
    reader.releaseLock()
  }
  return Buffer.concat(chunks, total)
}

function isAllowedRemoteImage(url: URL, kind: 'avatar' | 'poster') {
  const allowed = kind === 'avatar'
    ? avatarHosts.has(url.hostname) || url.hostname.endsWith('.googleusercontent.com')
    : posterHosts.has(url.hostname)
  return url.protocol === 'https:' && allowed
}

async function fetchAllowedRemoteImage(value: string, kind: 'avatar' | 'poster') {
  const source = kind === 'poster' && value.startsWith('/api/img?') ? new URL(value, 'https://local.invalid').searchParams.get('u') : value
  if (!source) return undefined
  let current = new URL(source)
  for (let hop = 0; hop <= 2; hop += 1) {
    if (!isAllowedRemoteImage(current, kind)) return undefined
    const response = await fetch(current.toString(), {
      headers: { accept: 'image/avif,image/webp,image/png,image/jpeg' },
      signal: AbortSignal.timeout(5_000),
      cache: 'no-store',
      redirect: 'manual',
    })
    if (response.status < 300 || response.status >= 400) return response
    const location = response.headers.get('location')
    if (!location) return undefined
    current = new URL(location, current)
  }
  return undefined
}
async function remoteImageDataUri(url: string | undefined, kind: 'avatar' | 'poster') {
  if (!url) return undefined
  try {
    const response = await fetchAllowedRemoteImage(url, kind)
    if (!response?.ok) throw new Error('Image download failed')
    const contentType = response.headers.get('content-type') || ''
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
    if (!allowedTypes.has(contentType.toLowerCase().split(';', 1)[0])) throw new Error('Unsupported image type')
    const bytes = await readBodyLimited(response, kind === 'avatar' ? 4 * 1024 * 1024 : 6 * 1024 * 1024)
    const size = kind === 'avatar' ? { width: 420, height: 420 } : { width: 360, height: 540 }
    const image = sharp(bytes, {
      animated: false,
      failOn: 'error',
      limitInputPixels: kind === 'avatar' ? 16_000_000 : 24_000_000,
    })
    const metadata = await image.metadata()
    const allowedFormats = new Set(['jpeg', 'png', 'webp', 'avif', 'heif'])
    if (!metadata.format || !allowedFormats.has(metadata.format)) throw new Error('Unsupported image format')
    // Embed PNG: SVG rasterizers may not have a WebP image loader.
    const normalized = await image.rotate().resize({ ...size, fit: 'cover' }).png().toBuffer()
    return `data:image/png;base64,${normalized.toString('base64')}`
  } catch {
    console.error('share_card_image_failed', { kind })
    throw new AdminAccessError(502, 'Chưa tải đủ ảnh để xuất thẻ. Vui lòng thử lại sau.')
  }
}

export async function renderOwnShareCard(uid: string, raw: unknown) {
  const input = parseInput(raw)
  const context = await getOwnShareCardContext(uid, input.range)
  const allowedMovies = new Map(context.favoriteMovies.map((movie) => [movie.movieSlug, movie]))
  const requestedSlugs = input.favoriteMovieSlugs || []
  const selectedMovies = requestedSlugs.map((slug) => allowedMovies.get(slug)).filter((movie): movie is NonNullable<typeof movie> => Boolean(movie)).slice(0, 3)
  if (selectedMovies.length !== requestedSlugs.length) {
    throw new AdminAccessError(400, 'Phim trên thẻ phải thuộc danh sách Yêu thích của bạn.')
  }

  const [avatar, posterData] = await Promise.all([
    remoteImageDataUri(context.profile.avatar, 'avatar'),
    Promise.all(selectedMovies.map((movie) => remoteImageDataUri(movie.poster, 'poster'))),
  ])
  const artworkContext = { ...context, profile: { ...context.profile, avatar } }
  const artworkMovies = selectedMovies.map((movie, index) => ({ ...movie, poster: posterData[index] }))
  const svg = buildShareCardSvg({
    context: artworkContext,
    range: input.range,
    format: input.format,
    accent: input.accent,
    theme: input.theme,
    avatarLayout: input.avatarLayout,
    avatarSeed: input.avatarSeed,
    fields: input.fields,
    selectedMovies: artworkMovies,
  })
  const { width, height } = SHARE_CARD_DIMENSIONS[input.format]
  const png = await sharp(Buffer.from(svg), { limitInputPixels: width * height * 2 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer()
  return { png, width, height, filename: shareCardFilename(context.profile.displayName, input.theme || 'signature', input.format) }
}
