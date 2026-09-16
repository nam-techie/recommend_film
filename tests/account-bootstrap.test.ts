import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ identity: vi.fn(), user: vi.fn(), audit: vi.fn(), marker: null as unknown, AdminAccessError: class extends Error { status = 401 } }))
vi.mock('@/lib/server/firebase-admin', () => ({ AdminAccessError: mocks.AdminAccessError, requireUser: mocks.identity, getFirebaseAdminApp: () => ({}) }))
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ getUser: mocks.user }) }))
vi.mock('firebase-admin/database', () => ({ getDatabase: () => ({ ref: () => ({ transaction: async (update: (value: unknown) => unknown) => {
  const next = update(mocks.marker)
  if (next === undefined) return { committed: false }
  mocks.marker = next; return { committed: true }
} }) }) }))
vi.mock('@/lib/server/audit', () => ({ recordAuditEvent: mocks.audit }))
import { POST } from '@/app/api/me/bootstrap/route'
beforeEach(() => { vi.clearAllMocks(); mocks.marker = null; mocks.identity.mockResolvedValue({ uid: 'test-user' }); mocks.user.mockResolvedValue({ metadata: { creationTime: new Date().toISOString() }, providerData: [{ providerId: 'google.com' }], emailVerified: true }) })
it('returns a valid response and records a new account only once', async () => {
  expect(await (await POST(new Request('http://localhost/api/me/bootstrap', { method: 'POST' }))).json()).toEqual({ created: true })
  expect(await (await POST(new Request('http://localhost/api/me/bootstrap', { method: 'POST' }))).json()).toEqual({ created: false })
  expect(mocks.audit).toHaveBeenCalledTimes(1)
})
it('does not create a new-account event for existing accounts', async () => {
  mocks.user.mockResolvedValue({ metadata: { creationTime: '2020-01-01' } })
  expect(await (await POST(new Request('http://localhost/api/me/bootstrap', { method: 'POST' }))).json()).toEqual({ created: false })
  expect(mocks.audit).not.toHaveBeenCalled()
})
it('requires authentication before accessing account data', async () => {
  mocks.identity.mockRejectedValue(new mocks.AdminAccessError('Unauthenticated'))
  const response = await POST(new Request('http://localhost/api/me/bootstrap', { method: 'POST' }))
  expect(response.status).toBe(401)
  expect(mocks.user).not.toHaveBeenCalled()
})
