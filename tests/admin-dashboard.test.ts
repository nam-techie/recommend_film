import { describe, expect, it } from 'vitest'
import { isAllowedAdmin, parseAdminUidAllowlist } from '@/lib/admin-access'
import { buildMembershipBreakdown } from '@/lib/admin-dashboard'

describe('admin access', () => {
  it('parses a unique UID allowlist from common separators', () => {
    expect(parseAdminUidAllowlist('uid-a, uid-b;uid-a\nuid-c')).toEqual(['uid-a', 'uid-b', 'uid-c'])
  })

  it('allows the configured UID or an explicit admin claim', () => {
    expect(isAllowedAdmin({ uid: 'owner' }, ['owner'])).toBe(true)
    expect(isAllowedAdmin({ uid: 'other', admin: true }, ['owner'])).toBe(true)
    expect(isAllowedAdmin({ uid: 'other', admin: false }, ['owner'])).toBe(false)
  })
})

describe('dashboard memberships', () => {
  it('defaults every existing profile to Normal without an entitlement', () => {
    expect(buildMembershipBreakdown(['a', 'b', 'c'])).toEqual({ normal: 3, premium: 0, ultra: 0, total: 3 })
  })

  it('counts known Premium and Ultra entitlements', () => {
    expect(buildMembershipBreakdown(['a', 'b', 'c', 'd'], { b: 'premium', c: 'ultra' })).toEqual({ normal: 2, premium: 1, ultra: 1, total: 4 })
  })
})
