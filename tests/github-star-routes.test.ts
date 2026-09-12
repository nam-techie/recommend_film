// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/github/star/start/route'
import { GET } from '@/app/api/github/star/callback/route'
import { beginStar, STAR_COOKIE } from '@/lib/server/github-star-action'

const config = { clientId: 'test', clientSecret: 'secret', callback: 'http://localhost:3000/api/github/star/callback', origin: 'http://localhost:3000' }
function configure() {
  vi.stubEnv('GITHUB_STAR_CLIENT_ID', config.clientId)
  vi.stubEnv('GITHUB_STAR_CLIENT_SECRET', config.clientSecret)
  vi.stubEnv('GITHUB_STAR_CALLBACK_URL', config.callback)
}
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('GitHub Star routes', () => {
  it('blocks cross-site start requests', async () => {
    configure()
    const response = await POST(new NextRequest(config.origin + '/api/github/star/start', { method: 'POST', headers: { Origin: 'https://other.example' } }))
    expect(response.status).toBe(403)
  })
  it('sets a short-lived HttpOnly cookie before OAuth redirect', async () => {
    configure()
    const response = await POST(new NextRequest(config.origin + '/api/github/star/start', { method: 'POST', headers: { Origin: config.origin } }))
    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toContain('https://github.com/login/oauth/authorize?')
    expect(response.cookies.get(STAR_COOKIE)?.value).toBeTruthy()
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
    expect(response.headers.get('set-cookie')).toContain('Max-Age=600')
  })
  it('falls back honestly to the repository when not configured', async () => {
    vi.stubEnv('GITHUB_STAR_CLIENT_ID', '')
    const response = await POST(new NextRequest(config.origin + '/api/github/star/start', { method: 'POST', headers: { Origin: config.origin } }))
    expect(response.headers.get('location')).toBe('https://github.com/nam-techie/recommend_film')
    expect(response.cookies.get(STAR_COOKIE)).toBeUndefined()
  })
  it.each(['invalid-state', 'access-denied'])('does not call GitHub for %s and clears the cookie', async (scenario) => {
    configure()
    const flow = beginStar(config)
    const state = new URL(flow.url).searchParams.get('state')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const query = scenario === 'invalid-state' ? '?code=test&state=invalid' : '?error=access_denied&state=' + state
    const response = await GET(new NextRequest(config.callback + query, { headers: { Cookie: STAR_COOKIE + '=' + flow.cookie } }))
    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0')
    expect(await response.text()).not.toContain('Cảm ơn bạn đã Star')
  })
  it('reports success only after the validated GitHub mutation', async () => {
    configure()
    const flow = beginStar(config)
    const state = new URL(flow.url).searchParams.get('state')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ access_token: 'test-token', token_type: 'bearer' })).mockResolvedValueOnce(new Response(null, { status: 204 })))
    const response = await GET(new NextRequest(config.callback + '?code=test&state=' + state, { headers: { Cookie: STAR_COOKIE + '=' + flow.cookie } }))
    const body = await response.text()
    expect(response.status).toBe(200)
    expect(body).toContain('Cảm ơn bạn đã Star')
    expect(body).not.toContain('test-token')
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
})
