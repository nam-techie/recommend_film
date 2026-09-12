import { describe, expect, it } from 'vitest'
import { normalizeProfilePatch } from '@/lib/profile-validation'

describe('profile validation', () => {
  it('normalizes server-owned editable fields', () => {
    const value = normalizeProfilePatch({
      expectedUpdatedAt: 123,
      displayName: '  Nam Phương  ',
      username: 'Nam_Phuong',
      bio: '  CineMind member  ',
      favoriteGenres: ['Hành động', 'Hành động', 'invalid', 'Hài'],
      avatar: 'https://attacker.example/tracker.png',
      isPublic: false,
    })
    expect(value).toEqual({ expectedUpdatedAt: 123, displayName: 'Nam Phương', username: 'nam_phuong', bio: 'CineMind member', favoriteGenres: ['Hành động', 'Hài'] })
  })

  it('rejects invalid usernames and stale-less writes', () => {
    expect(() => normalizeProfilePatch({ expectedUpdatedAt: 1, displayName: 'Member', username: 'bad user', favoriteGenres: [] })).toThrow(/Username/)
    expect(() => normalizeProfilePatch({ displayName: 'Member', username: 'member_1', favoriteGenres: [] })).toThrow(/phiên bản/i)
  })
})
