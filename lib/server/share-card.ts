import 'server-only'

import sharp from 'sharp'
import { AdminAccessError } from '@/lib/server/firebase-admin'
import { getOwnShareCardContext } from '@/lib/server/profile'
import type { ShareCardAccent, ShareCardFormat, ShareCardOptionalField, ShareCardRange, ShareCardRenderInput } from '@/lib/profile'

const allowedFields = new Set<ShareCardOptionalField>(['plan', 'joinedAt', 'favoriteGenres', 'qualifiedViews', 'watchHours', 'completionRate', 'favoriteMovies'])
const accents: Record<ShareCardAccent, string> = { fuchsia: '#d946ef', violet: '#8b5cf6', cyan: '#22d3ee', amber: '#f59e0b' }

function escapeXml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!)
}

function parseInput(value: unknown): ShareCardRenderInput {
  const input = (value || {}) as Partial<ShareCardRenderInput>
  const range: ShareCardRange = input.range === '90d' ? '90d' : '30d'
  const format: ShareCardFormat = input.format === 'story' ? 'story' : 'portrait'
  const accent: ShareCardAccent = input.accent && input.accent in accents ? input.accent : 'fuchsia'
  const fields = Array.from(new Set(Array.isArray(input.fields) ? input.fields.filter((field): field is ShareCardOptionalField => allowedFields.has(field as ShareCardOptionalField)) : []))
  const favoriteMovieSlugs = Array.from(new Set(Array.isArray(input.favoriteMovieSlugs) ? input.favoriteMovieSlugs.map(String).slice(0, 3) : []))
  return { range, format, accent, fields, favoriteMovieSlugs }
}

async function avatarDataUrl(url?: string) {
  if (!url) return null
  try {
    const parsed = new URL(url, 'https://cine-mind.invalid')
    const allowed = parsed.hostname === 'res.cloudinary.com' || parsed.hostname.endsWith('.googleusercontent.com')
    if (!allowed || parsed.protocol !== 'https:') return null
    const response = await fetch(parsed.toString(), { signal: AbortSignal.timeout(4_000), cache: 'no-store' })
    if (!response.ok) return null
    const bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.length > 3 * 1024 * 1024) return null
    const normalized = await sharp(bytes, { limitInputPixels: 10_000_000 }).resize(280, 280, { fit: 'cover' }).webp({ quality: 82 }).toBuffer()
    return `data:image/webp;base64,${normalized.toString('base64')}`
  } catch { return null }
}

function textRows(value: string, max = 30) {
  const words = value.split(/\s+/).filter(Boolean)
  const rows: string[] = []
  for (const word of words) {
    const previous = rows.at(-1)
    if (!previous || `${previous} ${word}`.length > max) rows.push(word)
    else rows[rows.length - 1] = `${previous} ${word}`
  }
  return rows.slice(0, 2)
}

export async function renderOwnShareCard(uid: string, raw: unknown) {
  const input = parseInput(raw)
  const context = await getOwnShareCardContext(uid, input.range)
  const fields = new Set(input.fields)
  const analyticsFields: ShareCardOptionalField[] = ['qualifiedViews', 'watchHours', 'completionRate']
  if (!context.analytics.available && analyticsFields.some((field) => fields.has(field))) throw new AdminAccessError(409, 'Chưa có analytics đã xác minh cho khoảng thời gian này.')
  const allowedMovies = new Map(context.favoriteMovies.map((movie) => [movie.movieSlug, movie]))
  const selectedMovies = input.favoriteMovieSlugs?.map((slug) => allowedMovies.get(slug)).filter(Boolean).slice(0, 3) || []
  if (selectedMovies.length !== (input.favoriteMovieSlugs?.length || 0)) throw new AdminAccessError(400, 'Phim trên thẻ phải thuộc danh sách Yêu thích của bạn.')

  const width = 1080
  const height = input.format === 'story' ? 1920 : 1350
  const accent = accents[input.accent]
  const avatar = await avatarDataUrl(context.profile.avatar)
  const initials = context.profile.displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const top = input.format === 'story' ? 260 : 150
  const stats: Array<{ label: string; value: string }> = []
  if (fields.has('qualifiedViews')) stats.push({ label: 'LƯỢT XEM ĐỦ CHUẨN', value: new Intl.NumberFormat('vi-VN').format(context.analytics.qualifiedViews) })
  if (fields.has('watchHours')) stats.push({ label: 'GIỜ XEM XÁC MINH', value: context.analytics.watchHours.toLocaleString('vi-VN', { maximumFractionDigits: 1 }) })
  if (fields.has('completionRate')) stats.push({ label: 'HOÀN THÀNH', value: `${Math.round(context.analytics.completionRate)}%` })
  const planLabel = context.plan === 'ultra' ? 'CinePass Ultra' : context.plan === 'premium' ? 'CinePass Plus' : 'CinePass'
  const joined = new Intl.DateTimeFormat('vi-VN', { month: '2-digit', year: 'numeric' }).format(context.profile.createdAt)
  const titleRows = textRows(context.profile.displayName, 22)
  const movieRows = selectedMovies.map((movie) => escapeXml(movie!.title)).join(' · ')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#06070b"/><stop offset="0.58" stop-color="#10121b"/><stop offset="1" stop-color="#171020"/></linearGradient>
      <radialGradient id="glow" cx="0.8" cy="0.05" r="0.7"><stop stop-color="${accent}" stop-opacity="0.34"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
      <clipPath id="avatar"><circle cx="190" cy="${top + 140}" r="108"/></clipPath>
    </defs>
    <rect width="100%" height="100%" rx="54" fill="url(#bg)"/><rect width="100%" height="100%" rx="54" fill="url(#glow)"/>
    <rect x="68" y="68" width="944" height="${height - 136}" rx="42" fill="#090b12" fill-opacity=".64" stroke="#fff" stroke-opacity=".12"/>
    <text x="110" y="130" fill="#fff" font-family="Arial,sans-serif" font-size="35" font-weight="700">Cine<tspan fill="${accent}">Mind</tspan></text>
    <text x="970" y="130" fill="#a8adbd" text-anchor="end" font-family="Arial,sans-serif" font-size="24">MY CINEMA PROFILE</text>
    ${avatar ? `<image href="${avatar}" x="82" y="${top + 32}" width="216" height="216" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatar)"/>` : `<circle cx="190" cy="${top + 140}" r="108" fill="${accent}" fill-opacity=".24" stroke="${accent}" stroke-width="3"/><text x="190" y="${top + 165}" fill="#fff" text-anchor="middle" font-family="Arial,sans-serif" font-size="70" font-weight="800">${escapeXml(initials)}</text>`}
    ${titleRows.map((row, index) => `<text x="340" y="${top + 96 + index * 62}" fill="#fff" font-family="Arial,sans-serif" font-size="52" font-weight="800">${escapeXml(row)}</text>`).join('')}
    <text x="340" y="${top + 220}" fill="${accent}" font-family="Arial,sans-serif" font-size="30">@${escapeXml(context.profile.username)}</text>
    ${fields.has('plan') ? `<rect x="340" y="${top + 252}" width="260" height="54" rx="27" fill="${accent}" fill-opacity=".16" stroke="${accent}"/><text x="470" y="${top + 288}" fill="${accent}" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" font-weight="700">${escapeXml(planLabel)}</text>` : ''}
    ${fields.has('joinedAt') ? `<text x="970" y="${top + 285}" fill="#a8adbd" text-anchor="end" font-family="Arial,sans-serif" font-size="23">Tham gia ${escapeXml(joined)}</text>` : ''}
    <line x1="110" y1="${top + 360}" x2="970" y2="${top + 360}" stroke="#fff" stroke-opacity=".12"/>
    ${stats.map((stat, index) => { const x = 110 + index * (860 / Math.max(stats.length, 1)); const column = 860 / Math.max(stats.length, 1); return `<text x="${x + column / 2}" y="${top + 470}" fill="#fff" text-anchor="middle" font-family="Arial,sans-serif" font-size="64" font-weight="800">${escapeXml(stat.value)}</text><text x="${x + column / 2}" y="${top + 516}" fill="#959bad" text-anchor="middle" font-family="Arial,sans-serif" font-size="19" letter-spacing="2">${escapeXml(stat.label)}</text>` }).join('')}
    ${fields.has('favoriteGenres') && context.profile.favoriteGenres.length ? `<text x="110" y="${top + 650}" fill="#959bad" font-family="Arial,sans-serif" font-size="21" letter-spacing="2">GU PHIM</text><text x="110" y="${top + 710}" fill="#fff" font-family="Arial,sans-serif" font-size="31">${escapeXml(context.profile.favoriteGenres.slice(0, 5).join('  ·  '))}</text>` : ''}
    ${fields.has('favoriteMovies') && movieRows ? `<text x="110" y="${top + 830}" fill="#959bad" font-family="Arial,sans-serif" font-size="21" letter-spacing="2">PHIM YÊU THÍCH</text><text x="110" y="${top + 890}" fill="#fff" font-family="Arial,sans-serif" font-size="27">${movieRows}</text>` : ''}
    <text x="110" y="${height - 120}" fill="#777e91" font-family="Arial,sans-serif" font-size="21">${input.range === '90d' ? '90 ngày gần nhất' : '30 ngày gần nhất'} · Số liệu playback đã xác minh</text>
    <circle cx="943" cy="${height - 128}" r="10" fill="${accent}"/><text x="920" y="${height - 120}" fill="#fff" text-anchor="end" font-family="Arial,sans-serif" font-size="21">cine-mind.namtechie.id.vn</text>
  </svg>`
  return { png: await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer(), width, height }
}
