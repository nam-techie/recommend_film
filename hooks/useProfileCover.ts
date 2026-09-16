'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'

export function useProfileCover(source?: string, owner = false) {
  const { user } = useAuth()
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState<{ key: string; url: string; error: string } | null>(null)
  const key = `${user?.uid || ''}:${owner}:${source || ''}:${retry}`
  useEffect(() => {
    if (!source || !owner || !user) return
    const controller = new AbortController()
    let objectUrl = ''
    void (async () => {
      try {
        const token = await user.getIdToken()
        const response = await fetch('/api/me/profile/media', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal })
        if (!response.ok) throw new Error('Chưa tải được ảnh bìa. Hãy thử lại.')
        const blob = await response.blob()
        if (controller.signal.aborted) return
        objectUrl = URL.createObjectURL(blob)
        setResult({ key, url: objectUrl, error: '' })
      } catch { if (!controller.signal.aborted) setResult({ key, url: '', error: 'Chưa tải được ảnh bìa. Hãy thử lại.' }) }
    })()
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [source, owner, user, key])
  return {
    url: !source ? '' : !owner ? source : result?.key === key ? result.url : '',
    loading: Boolean(source && owner && user && result?.key !== key),
    error: result?.key === key ? result.error : '',
    retry: () => setRetry((n) => n + 1),
  }
}
