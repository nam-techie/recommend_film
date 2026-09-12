import 'server-only'

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const STAR_REPOSITORY = 'https://github.com/nam-techie/recommend_film'
export const STAR_COOKIE = 'cinemind_github_star'
const TTL = 600_000

export function getStarConfig() {
  const clientId = process.env.GITHUB_STAR_CLIENT_ID
  const clientSecret = process.env.GITHUB_STAR_CLIENT_SECRET
  const callback = process.env.GITHUB_STAR_CALLBACK_URL
  if (!clientId || !clientSecret || !callback) return null
  try {
    const url = new URL(callback)
    if (url.pathname !== '/api/github/star/callback' || url.search || url.hash || url.username || url.password) return null
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) return null
    return { clientId, clientSecret, callback: url.href, origin: url.origin }
  } catch { return null }
}

type Config = NonNullable<ReturnType<typeof getStarConfig>>
function sign(value: string, secret: string) { return createHmac('sha256', secret).update(value).digest('base64url') }
function equal(a: string, b: string) { return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b)) }

export function beginStar(config: Config, now = Date.now()) {
  const state = randomBytes(32).toString('base64url')
  const verifier = randomBytes(32).toString('base64url')
  const body = Buffer.from(JSON.stringify({ state, verifier, createdAt: now })).toString('base64url')
  const cookie = `${body}.${sign(body, config.clientSecret)}`
  const url = new URL('https://github.com/login/oauth/authorize')
  url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.callback, state,
    code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }).toString()
  return { url: url.href, cookie }
}

export function validateStarState(cookie: string | undefined, state: string | null, config: Config, now = Date.now()) {
  if (!cookie || cookie.length > 1024 || !state || !/^[a-zA-Z0-9_-]{43}$/.test(state)) return null
  try {
    const [body, signature, extra] = cookie.split('.')
    if (!signature || extra || !equal(sign(body, config.clientSecret), signature)) return null
    const record = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (typeof record.state !== 'string' || !equal(record.state, state) || !Number.isFinite(record.createdAt)
      || now < record.createdAt || now - record.createdAt > TTL || !/^[a-zA-Z0-9_-]{43}$/.test(record.verifier)) return null
    return record.verifier as string
  } catch { return null }
}

// Only the explicit Star action enters this flow. Tokens never reach the client,
// storage, logs, entitlement services or the Plus claim workflow.
export async function completeStar(config: Config, code: string, verifier: string) {
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10_000),
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret,
      redirect_uri: config.callback, code, code_verifier: verifier }),
  })
  if (!tokenResponse.ok) return false
  const token = await tokenResponse.json()
  if (token.error || typeof token.access_token !== 'string' || !token.access_token || token.token_type !== 'bearer') return false
  const response = await fetch('https://api.github.com/user/starred/nam-techie/recommend_film', {
    method: 'PUT', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10_000),
    headers: { Authorization: `Bearer ${token.access_token}`, Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28', 'Content-Length': '0', 'User-Agent': 'CineMind-Star' },
  })
  return response.status === 204
}
