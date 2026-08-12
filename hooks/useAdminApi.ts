'use client'

import { useCallback, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'

export function useAdminApi() {
  const auth = useAuth()
  const [denied, setDenied] = useState(false)

  const request = useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    if (!auth.user) throw new Error('Bạn chưa đăng nhập.')
    const token = await auth.user.getIdToken()
    const response = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init?.headers },
      cache: 'no-store',
    })
    const payload = await response.json().catch(() => ({}))
    const isStepUpMutation = new Headers(init?.headers).has('x-admin-approval')
    if ((response.status === 401 || response.status === 403) && !isStepUpMutation) setDenied(true)
    if (!response.ok) throw new Error(payload.error || 'Yêu cầu không thành công.')
    if ((init?.method || 'GET').toUpperCase() !== 'GET') {
      window.dispatchEvent(new Event('cinemind:admin-audit-changed'))
    }
    return payload as T
  }, [auth.user])

  return { ...auth, request, denied, setDenied }
}
