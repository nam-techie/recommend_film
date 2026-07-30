import { DirectoryProfile, WatchPartyInviteResult } from '@/lib/account-types'

const serviceUrl = () => (process.env.NEXT_PUBLIC_WATCH_PARTY_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:4001' : '')).trim().replace(/\/$/, '')

export class SocialApiError extends Error {
  constructor(message: string, public status: number, public code: string) {
    super(message)
    this.name = 'SocialApiError'
  }
}

async function request<T>(path: string, token: string, body: unknown): Promise<T> {
  const baseUrl = serviceUrl()
  if (!baseUrl) throw new SocialApiError('Dịch vụ cộng đồng chưa được cấu hình.', 0, 'SERVICE_NOT_CONFIGURED')
  let response: Response
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 20_000)
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new SocialApiError('Dịch vụ phản hồi quá lâu. Hãy thử lại.', 0, 'TIMEOUT')
    }
    throw new SocialApiError('Không kết nối được dịch vụ cộng đồng. Hãy kiểm tra watch-party server.', 0, 'NETWORK_ERROR')
  } finally {
    window.clearTimeout(timeout)
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const code = typeof payload.code === 'string' ? payload.code : `HTTP_${response.status}`
    const message = response.status === 404 && path === '/api/friends/lookup-email'
      ? 'Server Render đang chạy bản cũ, chưa có tính năng tìm email. Cần deploy lại watch-party service.'
      : response.status === 503 && code === 'SOCIAL_DATABASE_NOT_CONFIGURED'
        ? 'Server chưa cấu hình Firebase Admin nên chưa thể tìm bằng email.'
        : response.status === 503 && code === 'FIREBASE_ADMIN_UNAVAILABLE'
          ? 'Firebase Admin trên Render chưa có credential hợp lệ. Kiểm tra Secret File hoặc service-account rồi deploy lại.'
        : typeof payload.error === 'string' ? payload.error : 'Không thể kết nối dịch vụ cộng đồng.'
    throw new SocialApiError(message, response.status, code)
  }
  return payload as T
}

export async function lookupProfileByEmail(email: string, token: string) {
  return request<{ found: boolean; profile?: DirectoryProfile }>('/api/friends/lookup-email', token, { email })
}

export async function inviteFriendToRoom(roomId: string, friendUid: string, token: string) {
  return request<WatchPartyInviteResult>(`/api/rooms/${encodeURIComponent(roomId)}/invites`, token, { friendUid })
}
