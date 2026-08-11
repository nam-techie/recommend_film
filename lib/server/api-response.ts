import { NextResponse } from 'next/server'
import { AdminAccessError } from '@/lib/server/firebase-admin'
import { MonetizationError } from '@/lib/server/monetization-error'

export function apiError(error: unknown, fallback = 'Đã xảy ra lỗi. Vui lòng thử lại.') {
  if (error instanceof AdminAccessError) return NextResponse.json({ error: error.message }, { status: error.status })
  if (error instanceof MonetizationError) return NextResponse.json({ error: error.message, code: error.code, ...(error.details || {}) }, { status: error.status })
  console.error('api_request_failed', { message: error instanceof Error ? error.message : 'unknown' })
  return NextResponse.json({ error: fallback }, { status: 500 })
}
