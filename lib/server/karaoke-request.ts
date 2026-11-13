import 'server-only'
import { NextResponse } from 'next/server'
import { MonetizationError } from './monetization-error'

export const listJson = (value: unknown) => NextResponse.json(value, { headers: { 'Cache-Control': 'private, no-store' } })
export async function listRequestBody(request: Request) {
  const reader = request.body?.getReader()
  if (!reader) throw new MonetizationError('INVALID_BODY', 'Thiếu dữ liệu danh sách.')
  const chunks: Uint8Array[] = []; let size = 0
  try {
    for (;;) {
      const part = await reader.read()
      if (part.done) break
      size += part.value.byteLength
      if (size > 65536) { await reader.cancel(); throw new MonetizationError('BODY_TOO_LARGE', 'Dữ liệu danh sách quá lớn.', 413) }
      chunks.push(part.value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size); let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  try { return JSON.parse(new TextDecoder().decode(bytes)) as unknown }
  catch { throw new MonetizationError('INVALID_BODY', 'Dữ liệu JSON không hợp lệ.') }
}
