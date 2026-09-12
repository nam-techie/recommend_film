import 'server-only'

import sharp from 'sharp'
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary'
import { getAuth } from 'firebase-admin/auth'
import { getDatabase } from 'firebase-admin/database'
import { AdminAccessError, getFirebaseAdminApp } from '@/lib/server/firebase-admin'
import type { ProfileMediaKind, ProfileMediaRecord } from '@/lib/profile'
import type { PublicProfile } from '@/lib/account-types'

const MAX_UPLOAD_BYTES = 6 * 1024 * 1024
const MAX_INPUT_PIXELS = 30_000_000

function configureCloudinary() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME?.trim()
  const api_key = process.env.CLOUDINARY_API_KEY?.trim()
  const api_secret = process.env.CLOUDINARY_API_SECRET?.trim()
  if (!cloud_name || !api_key || !api_secret) throw new AdminAccessError(503, 'Upload ảnh đang tạm tắt vì Cloudinary chưa được cấu hình.')
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true })
}

async function normalizeImage(file: File, kind: ProfileMediaKind) {
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) throw new AdminAccessError(413, 'Ảnh phải nhỏ hơn 6 MB.')
  const input = Buffer.from(await file.arrayBuffer())
  let metadata: Awaited<ReturnType<ReturnType<typeof sharp>['metadata']>>
  try { metadata = await sharp(input, { animated: true, limitInputPixels: MAX_INPUT_PIXELS }).metadata() }
  catch { throw new AdminAccessError(415, 'File không phải ảnh hợp lệ.') }
  if (!metadata.width || !metadata.height) throw new AdminAccessError(415, 'Không đọc được kích thước ảnh.')
  if ((metadata.pages || 1) > 1) throw new AdminAccessError(415, 'Ảnh động không được hỗ trợ.')
  if (metadata.width * metadata.height > MAX_INPUT_PIXELS) throw new AdminAccessError(413, 'Ảnh có độ phân giải quá lớn.')
  const image = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).rotate()
  return kind === 'avatar'
    ? image.resize(512, 512, { fit: 'cover', position: 'attention' }).webp({ quality: 82 }).toBuffer()
    : image.resize(1600, 600, { fit: 'cover', position: 'attention' }).webp({ quality: 80 }).toBuffer()
}

function uploadBuffer(buffer: Buffer, options: { publicId: string; type: 'upload' | 'authenticated' }) {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      public_id: options.publicId,
      resource_type: 'image',
      type: options.type,
      format: 'webp',
      overwrite: false,
      invalidate: true,
      tags: ['cinemind-profile'],
    }, (error, result) => error || !result ? reject(error || new Error('Cloudinary không trả kết quả upload.')) : resolve(result))
    stream.end(buffer)
  })
}

export async function uploadProfileMedia(uid: string, formData: FormData) {
  configureCloudinary()
  const kind = formData.get('kind')
  const file = formData.get('file')
  if (kind !== 'avatar' && kind !== 'cover') throw new AdminAccessError(400, 'Loại ảnh không hợp lệ.')
  if (!(file instanceof File)) throw new AdminAccessError(400, 'Thiếu file ảnh.')

  const buffer = await normalizeImage(file, kind)
  const db = getDatabase(getFirebaseAdminApp())
  const profileRef = db.ref(`publicProfiles/${uid}`)
  const [profileSnapshot, previousSnapshot] = await Promise.all([profileRef.get(), db.ref(`profileMedia/${uid}/${kind}`).get()])
  if (!profileSnapshot.exists()) throw new AdminAccessError(404, 'Hồ sơ chưa được khởi tạo.')
  const previous = previousSnapshot.exists() ? previousSnapshot.val() as ProfileMediaRecord : null
  const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  const result = await uploadBuffer(buffer, { publicId: `cinemind/profiles/${uid}/${kind}_${uniqueId}`, type: kind === 'cover' ? 'authenticated' : 'upload' })
  const record: ProfileMediaRecord = {
    kind,
    publicId: result.public_id,
    assetId: result.asset_id,
    version: result.version,
    deliveryType: kind === 'cover' ? 'authenticated' : 'upload',
    width: result.width,
    height: result.height,
    bytes: result.bytes,
    format: 'webp',
    updatedAt: Date.now(),
  }
  const url = kind === 'avatar'
    ? cloudinary.url(record.publicId, { secure: true, version: record.version, type: 'upload', format: 'webp' })
    : `/api/public/profile-media/${encodeURIComponent(uid)}/cover?v=${record.version}`
  try {
    await db.ref().update({ [`profileMedia/${uid}/${kind}`]: record, [`publicProfiles/${uid}/${kind === 'avatar' ? 'avatar' : 'cover'}`]: url, [`publicProfiles/${uid}/updatedAt`]: record.updatedAt })
  } catch (error) {
    await cloudinary.uploader.destroy(record.publicId, { type: record.deliveryType, invalidate: true }).catch(() => undefined)
    throw error
  }
  if (previous?.publicId) await cloudinary.uploader.destroy(previous.publicId, { type: previous.deliveryType, invalidate: true }).catch(() => undefined)
  return { kind, url, record: { width: record.width, height: record.height, bytes: record.bytes, updatedAt: record.updatedAt } }
}

export async function resetProfileMedia(uid: string, kind: ProfileMediaKind) {
  configureCloudinary()
  const db = getDatabase(getFirebaseAdminApp())
  const [recordSnapshot, authUser] = await Promise.all([db.ref(`profileMedia/${uid}/${kind}`).get(), getAuth(getFirebaseAdminApp()).getUser(uid)])
  const record = recordSnapshot.exists() ? recordSnapshot.val() as ProfileMediaRecord : null
  const googleAvatar = authUser.providerData.find((provider) => provider.providerId === 'google.com')?.photoURL || null
  const updates: Record<string, unknown> = { [`profileMedia/${uid}/${kind}`]: null, [`publicProfiles/${uid}/updatedAt`]: Date.now() }
  updates[`publicProfiles/${uid}/${kind === 'avatar' ? 'avatar' : 'cover'}`] = kind === 'avatar' ? googleAvatar : null
  await db.ref().update(updates)
  if (record?.publicId) await cloudinary.uploader.destroy(record.publicId, { type: record.deliveryType, invalidate: true }).catch(() => undefined)
  return { kind, url: kind === 'avatar' ? googleAvatar : null }
}

export async function getCoverProxy(uid: string, allowPrivate: boolean) {
  configureCloudinary()
  const db = getDatabase(getFirebaseAdminApp())
  const [profileSnapshot, mediaSnapshot] = await Promise.all([db.ref(`publicProfiles/${uid}`).get(), db.ref(`profileMedia/${uid}/cover`).get()])
  if (!profileSnapshot.exists() || !mediaSnapshot.exists()) throw new AdminAccessError(404, 'Không tìm thấy ảnh bìa.')
  const profile = profileSnapshot.val() as PublicProfile
  if (!profile.isPublic && !allowPrivate) throw new AdminAccessError(404, 'Không tìm thấy ảnh bìa.')
  const record = mediaSnapshot.val() as ProfileMediaRecord
  const signedUrl = cloudinary.url(record.publicId, { secure: true, sign_url: true, version: record.version, type: 'authenticated', format: 'webp' })
  const response = await fetch(signedUrl, { cache: 'no-store' })
  if (!response.ok) throw new AdminAccessError(502, 'Không tải được ảnh bìa.')
  return { bytes: await response.arrayBuffer(), contentType: response.headers.get('content-type') || 'image/webp' }
}

export async function deleteAllProfileMedia(uid: string) {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) return
  configureCloudinary()
  const db = getDatabase(getFirebaseAdminApp())
  const snapshot = await db.ref(`profileMedia/${uid}`).get()
  const records = Object.values((snapshot.val() || {}) as Record<string, ProfileMediaRecord>)
  await Promise.all(records.map((record) => cloudinary.uploader.destroy(record.publicId, { type: record.deliveryType, invalidate: true }).catch(() => undefined)))
  await db.ref(`profileMedia/${uid}`).remove()
}
