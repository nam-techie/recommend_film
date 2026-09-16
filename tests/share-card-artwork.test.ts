import { describe, expect, it } from 'vitest'
import { buildShareCardSvg } from '@/lib/share-card-artwork'
import type {
  ShareCardAvatarLayout,
  ShareCardContext,
  ShareCardMovie,
  ShareCardOptionalField,
} from '@/lib/profile'

const context: ShareCardContext = {
  profile: {
    displayName: 'Nam Phương',
    username: 'namphuong',
    avatar: 'https://lh3.googleusercontent.com/a/avatar',
    createdAt: 1_700_000_000_000,
    favoriteGenres: ['Hành động', 'Khoa học viễn tưởng'],
  },
  plan: 'premium',
  range: '30d',
  analytics: {
    available: false,
    collectedFrom: null,
    qualifiedViews: 0,
    watchHours: 0,
    completionRate: 0,
  },
  activity: {
    moviesOpened: 12,
    episodesWatched: 17,
    watchHours: 0.6,
    source: 'legacy_resume',
  },
  favoriteMovies: [],
  mediaUploadEnabled: false,
}

const fields: ShareCardOptionalField[] = [
  'plan',
  'joinedAt',
  'favoriteGenres',
  'moviesOpened',
  'episodesWatched',
  'watchHours',
  'completionRate',
  'favoriteMovies',
]

function artwork(avatarLayout: ShareCardAvatarLayout, selectedMovies: ShareCardMovie[] = [], customContext = context) {
  return buildShareCardSvg({
    context: customContext,
    range: '30d',
    format: 'portrait',
    accent: 'fuchsia',
    avatarLayout,
    fields,
    selectedMovies,
  })
}

describe('Share Card artwork', () => {
  it('keeps randomized avatars deterministic between preview and PNG', () => {
    const input = { context, range: '30d' as const, format: 'story' as const, accent: 'violet' as const, avatarLayout: 'floating' as const, avatarSeed: 19, fields, selectedMovies: [] }
    expect(buildShareCardSvg(input)).toBe(buildShareCardSvg(input))
    expect(buildShareCardSvg(input)).not.toBe(buildShareCardSvg({ ...input, avatarSeed: 38 }))
    expect(buildShareCardSvg(input)).toContain('height="1920"')
  })
  it('renders the CineMind ticket with the authoritative Ultra crown badge and a clean poster footer', () => {
    const svg = artwork('corner', [], { ...context, plan: 'ultra' })

    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"')
    expect(svg).toContain('id="ticket-mask"')
    expect(svg).toContain('stroke-dasharray="14 13"')
    expect(svg).toContain('>CINEMIND</text>')
    expect(svg).toContain('CINEMIND MEMBER PASS')
    expect(svg).toContain('data-plan-badge="ultra"')
    expect(svg).toContain('stroke="#facc15"')
    expect(svg).toContain('M8 17h16l3-11-7 6-4-7-4 7-7-6 3 11Z')
    expect(svg).not.toContain('cine-mind.namtechie.id.vn')
    expect(svg).not.toContain('Playback đã xác minh')
    expect(svg).not.toContain('Ước tính từ tiến độ')
  })

  it('produces distinct artwork for corner, right and floating avatar layouts', () => {
    const corner = artwork('corner')
    const right = artwork('right')
    const floating = artwork('floating')

    expect(new Set([corner, right, floating])).toHaveLength(3)
    expect(corner).toContain('<circle cx="915" cy="227" r="155"/>')
    expect(right).toContain('<rect x="735" y="190" width="248" height="326" rx="42"/>')
    expect(floating).toContain('transform="rotate(7 845 333)"')
  })

  it('labels legacy metrics, renders at most three favorites, and escapes all XML text', () => {
    const unsafeContext: ShareCardContext = {
      ...context,
      profile: {
        ...context.profile,
        displayName: 'Cine & <Owner>',
        username: 'cine"owner',
        favoriteGenres: ['Drama & <Thriller>'],
      },
    }
    const selectedMovies: ShareCardMovie[] = [
      {
        movieSlug: 'poster-one',
        title: 'Poster One',
        poster: 'https://phimimg.com/poster-one.webp',
      },
      {
        movieSlug: 'fallback-title',
        title: 'Film & Friends',
      },
      {
        movieSlug: 'unsafe-title',
        title: "<script>alert('x')</script>",
        poster: 'javascript:alert(1)',
      },
      {
        movieSlug: 'must-not-render',
        title: 'Fourth Movie',
        poster: 'https://phimimg.com/fourth.webp',
      },
    ]

    const svg = artwork('floating', selectedMovies, unsafeContext)

    expect(svg).toContain('>GIỜ XEM</text>')
    expect(svg).not.toContain('GIỜ ƯỚC TÍNH')
    expect(svg).not.toContain('Ước tính từ tiến độ')
    expect(svg).toContain('href="https://phimimg.com/poster-one.webp"')
    expect(svg.match(/class="favorite-poster favorite-poster-/g)).toHaveLength(3)
    expect(svg).toContain('Film &amp; Friends')
    expect(svg).toContain('&lt;script&gt;alert(&apos;x&apos;)&lt;/script&gt;')
    expect(svg).toContain('Cine &amp; &lt;Owner&gt;')
    expect(svg).toContain('@cine&quot;owner')
    expect(svg).not.toContain('<script>')
    expect(svg).not.toContain('javascript:')
    expect(svg).not.toContain('Fourth Movie')
    expect(svg).not.toContain('fourth.webp')
  })
})
