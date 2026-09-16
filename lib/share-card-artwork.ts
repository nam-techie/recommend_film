import type {
  ShareCardAccent,
  ShareCardAvatarLayout,
  ShareCardContext,
  ShareCardFormat,
  ShareCardMovie,
  ShareCardOptionalField,
  ShareCardRange,
  ShareCardTheme,
} from '@/lib/profile'

export const SHARE_CARD_ACCENTS: Record<ShareCardAccent, string> = {
  fuchsia: '#d946ef',
  violet: '#8b5cf6',
  cyan: '#22d3ee',
  amber: '#f59e0b',
}

export const SHARE_CARD_DIMENSIONS: Record<ShareCardFormat, { width: number; height: number }> = {
  portrait: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
}

type ArtworkInput = {
  theme?: ShareCardTheme
  context: ShareCardContext
  range: ShareCardRange
  format: ShareCardFormat
  accent: ShareCardAccent
  avatarLayout: ShareCardAvatarLayout
  avatarSeed?: number
  fields: ShareCardOptionalField[]
  selectedMovies: ShareCardMovie[]
}

const avatarHosts = new Set(['res.cloudinary.com'])
const posterHosts = new Set(['phimimg.com', 'img.ophim.live', 'media.themoviedb.org', 'img.phimapi.com'])

function xml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character]!)
}

function safeImageHref(value: string | undefined, kind: 'avatar' | 'poster') {
  if (!value) return ''
  if (/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value)) return xml(value)
  if (value.startsWith('/api/img?')) return xml(value)
  try {
    const url = new URL(value)
    const allowed = kind === 'avatar'
      ? avatarHosts.has(url.hostname) || url.hostname.endsWith('.googleusercontent.com')
      : posterHosts.has(url.hostname)
    return url.protocol === 'https:' && allowed ? xml(url.toString()) : ''
  } catch {
    return ''
  }
}

function rows(value: string, limit: number, maxRows = 2) {
  const output: string[] = []
  for (const word of value.trim().split(/\s+/).filter(Boolean)) {
    const previous = output.at(-1)
    if (!previous || `${previous} ${word}`.length > limit) output.push(word)
    else output[output.length - 1] = `${previous} ${word}`
  }
  return output.slice(0, maxRows)
}

function metric(value: number, fraction = false) {
  if (!Number.isFinite(value)) return '0'
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1).replace('.', ',')}K`
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: fraction ? 1 : 0 }).format(value)
}

function planName(plan: ShareCardContext['plan']) {
  if (plan === 'ultra') return 'CinePass Ultra'
  if (plan === 'premium') return 'CinePass Plus'
  return 'CinePass'
}

function renderPlanBadge(plan: ShareCardContext['plan'], x: number, y: number) {
  const label = planName(plan)
  const styles = {
    normal: { color: '#aeb5c5', glow: '#ffffff', width: 202 },
    premium: { color: '#e879f9', glow: '#d946ef', width: 260 },
    ultra: { color: '#facc15', glow: '#f59e0b', width: 276 },
  } as const
  const style = styles[plan]
  const icon = plan === 'ultra'
    ? `<path d="M8 17h16l3-11-7 6-4-7-4 7-7-6 3 11Z"/><path d="M8 22h16"/>`
    : plan === 'premium'
      ? `<path d="m16 5 1.5 4.5L22 11l-4.5 1.5L16 17l-1.5-4.5L10 11l4.5-1.5L16 5Z"/><path d="m7 14 .9 2.6 2.6.9-2.6.9L7 21l-.9-2.6-2.6-.9 2.6-.9L7 14Z"/>`
      : `<path d="M7 8h18v14H7z"/><path d="m7 13 5-5m1 5 5-5m1 5 5-5"/>`
  return `<g data-plan-badge="${plan}">
    <rect x="${x}" y="${y}" width="${style.width}" height="62" rx="31" fill="${style.glow}" fill-opacity=".12" stroke="${style.color}" stroke-opacity=".62" stroke-width="2"/>
    <circle cx="${x + 33}" cy="${y + 31}" r="22" fill="${style.color}" fill-opacity=".14"/>
    <g transform="translate(${x + 20} ${y + 18})" fill="none" stroke="${style.color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${icon}</g>
    <text x="${x + 64}" y="${y + 40}" fill="${style.color}" font-family="Arial,sans-serif" font-size="22" font-weight="800">${xml(label)}</text>
  </g>`
}

function renderAvatar(context: ShareCardContext, layout: ShareCardAvatarLayout, accent: string, seed = 0) {
  const href = safeImageHref(context.profile.avatar, 'avatar')
  const initials = context.profile.displayName.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const configs = {
    corner: { x: 760, y: 72, width: 310, height: 310, rx: 155, rotate: 0, cx: 915, cy: 227, font: 86 },
    right: { x: 735, y: 190, width: 248, height: 326, rx: 42, rotate: 0, cx: 859, cy: 353, font: 76 },
    floating: { x: 720, y: 168, width: 250, height: 330, rx: 46, rotate: 7, cx: 845, cy: 333, font: 76 },
  } as const
  const shift = Math.abs(Math.floor(seed)) % 49
  const config = layout === 'floating' && seed ? { ...configs.floating, x: 714 + shift / 2, y: 156 + shift, cx: 839 + shift / 2, cy: 321 + shift, rotate: shift % 17 - 8 } : configs[layout]
  const transform = config.rotate ? ` transform="rotate(${config.rotate} ${config.cx} ${config.cy})"` : ''
  const shape = config.rx === config.width / 2
    ? `<circle cx="${config.cx}" cy="${config.cy}" r="${config.width / 2}"/>`
    : `<rect x="${config.x}" y="${config.y}" width="${config.width}" height="${config.height}" rx="${config.rx}"/>`
  return `<g${transform}>
    <defs><clipPath id="avatar-clip">${shape}</clipPath></defs>
    <rect x="${config.x}" y="${config.y}" width="${config.width}" height="${config.height}" rx="${config.rx}" fill="${accent}" fill-opacity=".2" stroke="${accent}" stroke-opacity=".7" stroke-width="3"/>
    ${href
      ? `<image href="${href}" x="${config.x}" y="${config.y}" width="${config.width}" height="${config.height}" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatar-clip)"/>`
      : `<text x="${config.cx}" y="${config.cy + config.font * .34}" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="${config.font}" font-weight="800">${xml(initials)}</text>`}
  </g>`
}

function renderStats(context: ShareCardContext, fields: Set<ShareCardOptionalField>, y: number) {
  const stats: Array<{ label: string; value: string }> = []
  if (fields.has('moviesOpened')) stats.push({ label: 'PHIM ĐÃ MỞ', value: metric(context.activity.moviesOpened) })
  if (fields.has('episodesWatched')) stats.push({ label: 'TẬP ĐÃ XEM', value: metric(context.activity.episodesWatched) })
  if (fields.has('watchHours')) stats.push({ label: 'GIỜ XEM', value: metric(context.activity.watchHours, true) })
  if (fields.has('completionRate') && context.analytics.available) stats.push({ label: 'HOÀN THÀNH', value: `${Math.round(context.analytics.completionRate)}%` })
  if (!stats.length) return ''
  const width = 850 / stats.length
  return `<g>${stats.map((stat, index) => {
    const center = 115 + width * index + width / 2
    return `<text x="${center}" y="${y}" fill="#fff" text-anchor="middle" font-family="Arial,sans-serif" font-size="${stats.length > 3 ? 48 : 58}" font-weight="850">${xml(stat.value)}</text>
      <text x="${center}" y="${y + 42}" fill="#9da3b5" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" letter-spacing="1.8">${xml(stat.label)}</text>`
  }).join('')}</g>`
}

function renderPosterStack(movies: ShareCardMovie[], y: number, format: ShareCardFormat, accent: string) {
  if (!movies.length) return ''
  const width = format === 'story' ? 226 : 200
  const height = format === 'story' ? 334 : 282
  const baseX = format === 'story' ? 678 : 695
  const spread = format === 'story' ? 96 : 88
  const rotations = movies.length === 1 ? [0] : movies.length === 2 ? [-7, 7] : [-10, 0, 10]
  return `<g class="poster-stack" role="button" tabindex="0" focusable="true" aria-pressed="false" aria-label="Xòe hoặc thu gọn poster phim yêu thích">
    <text x="110" y="${y - 15}" fill="#9da3b5" font-family="Arial,sans-serif" font-size="18" font-weight="700" letter-spacing="2.4">PHIM YÊU THÍCH</text>
    <path d="M572 ${y + height - 92}v-42q0-18 18-18h92l24 22h236q20 0 20 20v38Z" fill="${accent}" fill-opacity=".2" stroke="${accent}" stroke-opacity=".35"/>
    ${movies.map((movie, index) => {
      const x = baseX + (index - (movies.length - 1) / 2) * spread
      const href = safeImageHref(movie.poster, 'poster')
      const titleRows = rows(movie.title, 16, 3)
      return `<g transform="translate(${x} ${y}) rotate(${rotations[index]} ${width / 2} ${height / 2})">
        <g class="favorite-poster favorite-poster-${index}">
          <defs><clipPath id="poster-${index}"><rect width="${width}" height="${height}" rx="24"/></clipPath></defs>
          <rect width="${width}" height="${height}" rx="24" fill="#171925" stroke="${accent}" stroke-opacity=".52" stroke-width="3"/>
          ${href
            ? `<image href="${href}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" clip-path="url(#poster-${index})"/>`
            : `<rect width="${width}" height="${height}" rx="24" fill="${accent}" fill-opacity=".12"/>${titleRows.map((row, rowIndex) => `<text x="${width / 2}" y="${height / 2 + (rowIndex - (titleRows.length - 1) / 2) * 27}" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="19" font-weight="700">${xml(row)}</text>`).join('')}`}
          <rect x="8" y="8" width="${width - 16}" height="${height - 16}" rx="18" fill="none" stroke="#fff" stroke-opacity=".16"/>
        </g>
      </g>`
    }).join('')}
    <g class="poster-folder"><rect x="572" y="${y + height - 80}" width="390" height="90" rx="20" fill="#151521" fill-opacity=".88" stroke="${accent}" stroke-opacity=".4"/><path d="M594 ${y + height - 59}h64" stroke="${accent}" stroke-width="5" stroke-linecap="round"/><text x="596" y="${y + height - 17}" fill="#fff" font-family="Arial,sans-serif" font-size="17" font-weight="700" letter-spacing="2">MY FAVORITES</text><text x="936" y="${y + height - 17}" text-anchor="end" fill="${accent}" font-family="Arial,sans-serif" font-size="22" font-weight="800">0${movies.length}</text></g>
  </g>`
}

function barcode(y: number) {
  const widths = [5, 11, 4, 8, 4, 14, 6, 5, 12, 4, 9, 5, 15, 6, 4, 10, 5, 8, 13]
  let x = 112
  return `<g opacity=".72">${widths.map((width) => {
    const result = `<rect x="${x}" y="${y}" width="${width}" height="92" fill="#fff"/>`
    x += width + 7
    return result
  }).join('')}</g>`
}

export function buildShareCardSvg({ context, range, format, accent: accentName, theme = 'signature', avatarLayout, avatarSeed = 0, fields: fieldList, selectedMovies }: ArtworkInput) {
  const { width, height } = SHARE_CARD_DIMENSIONS[format]
  const accent = SHARE_CARD_ACCENTS[accentName]
  const noir = theme === 'noir'
  const premiere = theme === 'premiere'
  const base = noir ? '#111214' : premiere ? '#17130f' : '#11101b'
  const end = noir ? '#1d1f23' : premiere ? '#242019' : '#211a30'
  const fields = new Set(fieldList)
  const story = format === 'story'
  const identityY = story ? 430 : 300
  const perforationY = story ? 1375 : 955
  const posterY = story ? 1440 : 990
  const joined = Number.isFinite(context.profile.createdAt)
    ? new Intl.DateTimeFormat('vi-VN', { month: '2-digit', year: 'numeric' }).format(context.profile.createdAt)
    : ''
  const nameRows = rows(context.profile.displayName, 17)
  const usernameY = identityY + nameRows.length * 66 + 8
  const badgeY = usernameY + 32
  const joinedY = fields.has('plan') ? badgeY + 96 : usernameY + 62
  const identityBottom = fields.has('joinedAt') && joined ? joinedY : fields.has('plan') ? badgeY + 62 : usernameY
  const statsY = Math.max(story ? 800 : 610, identityBottom + 130)
  const genresY = Math.max(story ? 990 : 785, statsY + 150)
  const genreRows = rows(context.profile.favoriteGenres.slice(0, 5).join('  ·  '), 42, !story && nameRows.length > 1 ? 1 : 2)
  const selected = fields.has('favoriteMovies') ? selectedMovies.slice(0, 3) : []

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Thẻ hồ sơ CineMind của ${xml(context.profile.displayName)}">
    <defs>
      <linearGradient id="card-bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${base}"/><stop offset="1" stop-color="${end}"/></linearGradient>
      <radialGradient id="card-glow" cx=".82" cy=".06" r=".75"><stop stop-color="${accent}" stop-opacity="${noir ? .03 : premiere ? .08 : .16}"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
      <mask id="ticket-mask"><rect x="48" y="48" width="984" height="${height - 96}" rx="50" fill="#fff"/><circle cx="48" cy="${perforationY}" r="30" fill="#000"/><circle cx="1032" cy="${perforationY}" r="30" fill="#000"/></mask>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="22" stdDeviation="28" flood-color="#000" flood-opacity=".55"/></filter>
      <style>.favorite-poster{transition:transform .28s ease}.poster-stack{cursor:pointer;outline:none}.poster-stack:is(:hover,:focus-visible,[data-expanded="true"]) .favorite-poster-0{transform:translate(-20px,-18px)}.poster-stack:is(:hover,:focus-visible,[data-expanded="true"]) .favorite-poster-1{transform:translateY(-26px)}.poster-stack:is(:hover,:focus-visible,[data-expanded="true"]) .favorite-poster-2{transform:translate(20px,-18px)}.poster-stack:focus-visible .poster-folder rect{stroke:#fff;stroke-width:3}@media (prefers-reduced-motion:reduce){.favorite-poster{transition:none}}</style>
    </defs>
    <rect width="${width}" height="${height}" fill="#030409"/>
    <g mask="url(#ticket-mask)" filter="url(#shadow)">
      <rect x="48" y="48" width="984" height="${height - 96}" rx="50" fill="url(#card-bg)"/>
      <rect x="48" y="48" width="984" height="${height - 96}" rx="50" fill="url(#card-glow)"/>
      ${premiere ? `<rect x="72" y="72" width="936" height="${height - 144}" rx="34" fill="none" stroke="${accent}" stroke-opacity=".3"/><path d="M110 210h480" stroke="${accent}" stroke-opacity=".45" stroke-width="2"/>` : ''}
      ${noir ? `<path d="M110 210h100" stroke="${accent}" stroke-width="5"/>` : ''}
      <text x="540" y="${story ? 1190 : 875}" text-anchor="middle" fill="#fff" fill-opacity=".045" font-family="Arial,sans-serif" font-size="154" font-weight="900" letter-spacing="3">CINEMIND</text>
      <text x="108" y="132" fill="#fff" font-family="Arial,sans-serif" font-size="34" font-weight="800">Cine<tspan fill="${accent}">Mind</tspan></text>
      <text x="110" y="170" fill="#9299aa" font-family="Arial,sans-serif" font-size="15" font-weight="700" letter-spacing="3">YOUR CINEMA, YOUR STORY</text>
      ${renderAvatar(context, avatarLayout, accent, avatarSeed)}
      ${nameRows.map((row, index) => `<text x="110" y="${identityY + index * 66}" fill="#fff" font-family="Arial,sans-serif" font-size="${Math.min(60, 540 / Math.max(row.length * .66, 1))}" font-weight="${premiere ? 600 : 800}">${xml(row)}</text>`).join('')}
      <text x="110" y="${usernameY}" fill="${accent}" font-family="Arial,sans-serif" font-size="${Math.min(29, 540 / Math.max((context.profile.username.length + 1) * .65, 1))}" font-weight="700">@${xml(context.profile.username)}</text>
      ${fields.has('plan') ? renderPlanBadge(context.plan, 110, badgeY) : ''}
      ${fields.has('joinedAt') && joined ? `<text x="110" y="${joinedY}" fill="#a0a6b8" font-family="Arial,sans-serif" font-size="21">Tham gia ${xml(joined)}</text>` : ''}
      <line x1="110" y1="${statsY - 100}" x2="970" y2="${statsY - 100}" stroke="#fff" stroke-opacity=".13"/>
      ${renderStats(context, fields, statsY)}
      ${fields.has('favoriteGenres') && genreRows.length ? `<text x="110" y="${genresY}" fill="#9299aa" font-family="Arial,sans-serif" font-size="18" font-weight="700" letter-spacing="2.5">GU PHIM</text>${genreRows.map((row, index) => `<text x="110" y="${genresY + 52 + index * 38}" fill="#fff" font-family="Arial,sans-serif" font-size="28">${xml(row)}</text>`).join('')}` : ''}
      <line x1="80" y1="${perforationY}" x2="1000" y2="${perforationY}" stroke="#fff" stroke-opacity=".26" stroke-width="3" stroke-dasharray="14 13"/>
      ${barcode(story ? 1510 : 1045)}
      <text x="112" y="${story ? 1635 : 1168}" fill="#8e95a8" font-family="Arial,sans-serif" font-size="17" font-weight="700" letter-spacing="2.3">CINEMIND MEMBER PASS</text>
      ${renderPosterStack(selected, posterY, format, accent)}

    </g>
    <rect x="48" y="48" width="984" height="${height - 96}" rx="50" fill="none" stroke="#fff" stroke-opacity=".15" stroke-width="2"/>
  </svg>`
}

/** ASCII filename safe for both Content-Disposition and browser downloads. */
export function shareCardFilename(name: string, theme: ShareCardTheme, format: ShareCardFormat) {
  const slug = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'member'
  return `cinemind-${slug}-${theme}-${format}.png`
}
