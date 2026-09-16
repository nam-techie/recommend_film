import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  plan: 'ultra' as 'normal' | 'premium' | 'ultra',
}))

vi.mock('server-only', () => ({}))
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ updateUser: vi.fn() }) }))
vi.mock('firebase-admin/database', () => ({
  getDatabase: () => ({
    ref: (path: string) => ({
      get: async () => {
        const exists = state.values.has(path)
        const value = state.values.get(path)
        return {
          exists: () => exists && value !== null && value !== undefined,
          val: () => value,
        }
      },
    }),
  }),
}))
vi.mock('@/lib/server/firebase-admin', () => ({
  AdminAccessError: class AdminAccessError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
  getFirebaseAdminApp: () => ({}),
}))
vi.mock('@/lib/server/monetization', () => ({
  getUserEntitlement: async () => ({ plan: state.plan }),
}))

import { getOwnShareCardContext } from '@/lib/server/profile'

const uid = 'share-card-user'

function vietnamDayKey(value: number) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
}

function seedBase() {
  state.values.set('publicProfiles/' + uid, {
    uid,
    username: 'cine_user',
    displayName: 'Cine User',
    avatar: 'https://example.com/avatar.webp',
    favoriteGenres: ['Hành động'],
    createdAt: 1_700_000_000_000,
  })
  state.values.set('watchlists/' + uid, {
    newest: {
      movieSlug: 'newest',
      title: 'Newest Favorite',
      poster: 'https://phimimg.com/newest.webp',
      status: 'planned',
      favorite: true,
      updatedAt: 300,
    },
    legacyFavorite: {
      movieSlug: 'legacy-favorite',
      title: 'Legacy Favorite',
      poster: 'https://phimimg.com/legacy.webp',
      status: 'favorite',
      updatedAt: 200,
    },
    ignored: {
      movieSlug: 'ignored',
      title: 'Not Favorite',
      poster: 'https://phimimg.com/ignored.webp',
      status: 'planned',
      favorite: false,
      updatedAt: 400,
    },
  })
  state.values.set('users/' + uid + '/watchProgressV2', {
    movieOne: {
      resume: { secondsWatched: 900 },
      episodes: {
        first: { secondsWatched: 900 },
        second: { secondsWatched: 600 },
      },
    },
    movieTwo: {
      resume: { secondsWatched: 300 },
      episodes: {
        first: { secondsWatched: 300 },
      },
    },
  })
}

describe('Share Card context statistics', () => {
  beforeEach(() => {
    state.values.clear()
    state.plan = 'ultra'
    seedBase()
  })

  it('prefers verified activeSeconds and derives collection start from the oldest included day', async () => {
    const currentDay = vietnamDayKey(Date.now())
    const outsideRange = vietnamDayKey(Date.now() - 120 * 86_400_000)
    state.values.set('analytics/aggregates/userDaily/' + uid, {
      [outsideRange]: { qualifiedViews: 99, activeSeconds: 99_000, completedViews: 99 },
      [currentDay]: { qualifiedViews: 2, activeSeconds: 7_200, completedViews: 1 },
    })

    const context = await getOwnShareCardContext(uid, '30d')

    expect(context.analytics).toEqual({
      available: true,
      collectedFrom: new Date(currentDay + 'T00:00:00+07:00').getTime(),
      qualifiedViews: 2,
      watchHours: 2,
      completionRate: 50,
    })
    expect(context.activity).toEqual({
      moviesOpened: 2,
      episodesWatched: 3,
      watchHours: 2,
      source: 'verified',
    })
  })

  it('uses clearly labelled legacy resume hours when verified aggregates do not exist', async () => {
    state.values.set('analytics/aggregates/userDaily/' + uid, {})

    const context = await getOwnShareCardContext(uid, '90d')

    expect(context.analytics.available).toBe(false)
    expect(context.analytics.collectedFrom).toBeNull()
    expect(context.activity).toEqual({
      moviesOpened: 2,
      episodesWatched: 3,
      watchHours: 0.5,
      source: 'legacy_resume',
    })
  })

  it('does not replace resume hours with empty or future analytics buckets', async () => {
    state.values.set('analytics/aggregates/userDaily/' + uid, {
      [vietnamDayKey(Date.now())]: { activeSeconds: 0, qualifiedViews: 0 },
      [vietnamDayKey(Date.now() + 86400000)]: { activeSeconds: 36000, qualifiedViews: 20 },
    })
    const context = await getOwnShareCardContext(uid, '30d')
    expect(context.analytics.available).toBe(false)
    expect(context.activity.source).toBe('legacy_resume')
    expect(context.activity.watchHours).toBe(0.5)
  })

  it('returns none for activity without verified or resume data and preserves favorite poster order', async () => {
    state.values.set('analytics/aggregates/userDaily/' + uid, {})
    state.values.set('users/' + uid + '/watchProgressV2', {})

    const context = await getOwnShareCardContext(uid, '30d')

    expect(context.activity).toEqual({
      moviesOpened: 0,
      episodesWatched: 0,
      watchHours: 0,
      source: 'none',
    })
    expect(context.favoriteMovies).toEqual([
      { movieSlug: 'newest', title: 'Newest Favorite', poster: 'https://phimimg.com/newest.webp' },
      { movieSlug: 'legacy-favorite', title: 'Legacy Favorite', poster: 'https://phimimg.com/legacy.webp' },
    ])
  })
})
