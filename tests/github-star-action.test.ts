// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
import { beginStar, completeStar, getStarConfig, validateStarState } from '@/lib/server/github-star-action'

const config = { clientId: 'test-client', clientSecret: 'test-secret', callback: 'http://localhost:3000/api/github/star/callback', origin: 'http://localhost:3000' }
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('Explicit GitHub Star action', () => {
  it('uses signed short-lived state and PKCE, never scopes or tokens in the authorize URL', () => {
    const flow = beginStar(config, 1000)
    const url = new URL(flow.url)
    expect(url.origin).toBe('https://github.com')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('code_challenge')).toHaveLength(43)
    expect(validateStarState(flow.cookie, url.searchParams.get('state'), config, 2000)).toHaveLength(43)
    expect(flow.url).not.toContain(config.clientSecret)
    expect(url.searchParams.has('scope')).toBe(false)
  })
  it('rejects tampered, missing, cross-flow and expired state', () => {
    const flow = beginStar(config, 1000)
    const state = new URL(flow.url).searchParams.get('state')
    expect(validateStarState(flow.cookie + 'x', state, config, 2000)).toBeNull()
    expect(validateStarState(flow.cookie, 'a'.repeat(43), config, 2000)).toBeNull()
    expect(validateStarState(undefined, state, config, 2000)).toBeNull()
    expect(validateStarState(flow.cookie, state, config, 601001)).toBeNull()
    expect(validateStarState(flow.cookie, state, config, 999)).toBeNull()
  })
  it('uses the server token only for the fixed repository and accepts only GitHub 204', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ access_token: 'test-user-token', token_type: 'bearer' })).mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await completeStar(config, 'code', 'verifier')).toBe(true)
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.github.com/user/starred/nam-techie/recommend_film')
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'PUT', headers: { Authorization: 'Bearer test-user-token' } })
    expect(String(fetchMock.mock.calls[0][1].body)).toContain('code_verifier=verifier')
  })
  it.each([200, 401, 403, 429, 500])('does not claim Star success for HTTP %s', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ access_token: 'test-token', token_type: 'bearer' })).mockResolvedValueOnce(new Response(null, { status })))
    expect(await completeStar(config, 'code', 'verifier')).toBe(false)
  })
  it('never sends a Star mutation after denied authorization', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ error: 'access_denied' }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await completeStar(config, 'code', 'verifier')).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it('requires server-only configuration and a safe exact callback URL', () => {
    vi.stubEnv('GITHUB_STAR_CLIENT_ID', '')
    expect(getStarConfig()).toBeNull()
    vi.stubEnv('GITHUB_STAR_CLIENT_ID', config.clientId)
    vi.stubEnv('GITHUB_STAR_CLIENT_SECRET', config.clientSecret)
    vi.stubEnv('GITHUB_STAR_CALLBACK_URL', config.callback)
    expect(getStarConfig()).toEqual(config)
    vi.stubEnv('GITHUB_STAR_CALLBACK_URL', 'http://public.example/api/github/star/callback')
    expect(getStarConfig()).toBeNull()
    vi.stubEnv('GITHUB_STAR_CALLBACK_URL', config.callback + '?next=https://evil.example')
    expect(getStarConfig()).toBeNull()
  })
})
