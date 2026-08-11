import { describe, expect, it } from 'vitest'
import { canonicalJson, isAdminApprovalAction } from '@/lib/admin-approval'

describe('admin approval payload binding', () => {
  it('canonicalizes object keys independent of insertion order', () => {
    expect(canonicalJson({ reason: 'test', enabled: true, nested: { z: 1, a: 2 } }))
      .toBe(canonicalJson({ nested: { a: 2, z: 1 }, enabled: true, reason: 'test' }))
  })

  it('changes when any bound value changes', () => {
    expect(canonicalJson({ uid: 'a', plan: 'premium' })).not.toBe(canonicalJson({ uid: 'a', plan: 'ultra' }))
  })

  it('only accepts explicit sensitive actions', () => {
    expect(isAdminApprovalAction('user_status_update')).toBe(true)
    expect(isAdminApprovalAction('arbitrary_admin_action')).toBe(false)
  })
})
