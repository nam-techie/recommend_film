import 'server-only'

import { getStorage } from 'firebase-admin/storage'
import sharp from 'sharp'
import { getFirebaseAdminApp } from '@/lib/server/firebase-admin'
import { MonetizationError } from '@/lib/server/monetization-error'

export async function storePrivateScreenshot(objectPath: string, file: File, maxBytes = 1_500_000) {
  if (!file.type.startsWith('image/') || file.size <= 0 || file.size > 6_000_000) throw new MonetizationError('INVALID_IMAGE', 'Ảnh phải nhỏ hơn 6MB và đúng định dạng hình ảnh.', 400)
  let output: Buffer
  try {
    output = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: 'error' }).rotate().resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true }).webp({ quality: 75 }).toBuffer()
  } catch { throw new MonetizationError('INVALID_IMAGE', 'Không thể xử lý ảnh đã gửi.', 400) }
  if (output.byteLength > maxBytes) throw new MonetizationError('IMAGE_TOO_LARGE', 'Ảnh sau khi nén vẫn vượt quá 1,5MB.', 400)
  const metadata = await sharp(output).metadata()
  const bucket = getStorage(getFirebaseAdminApp()).bucket()
  await bucket.file(objectPath).save(output, { resumable: false, contentType: 'image/webp', metadata: { cacheControl: 'private, max-age=0, no-store' } })
  return { objectPath, width: metadata.width || 0, height: metadata.height || 0, size: output.byteLength, mime: 'image/webp' as const }
}

export async function downloadPrivateFile(objectPath: string) {
  const file = getStorage(getFirebaseAdminApp()).bucket().file(objectPath)
  const [exists] = await file.exists()
  if (!exists) throw new MonetizationError('FILE_NOT_FOUND', 'Không tìm thấy ảnh đính kèm.', 404)
  const [buffer] = await file.download()
  return buffer
}

export async function deletePrivateFile(objectPath?: string) {
  if (!objectPath) return
  await getStorage(getFirebaseAdminApp()).bucket().file(objectPath).delete({ ignoreNotFound: true })
}
