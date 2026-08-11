import 'server-only'

import { createHash, randomBytes } from 'node:crypto'
import type { DecodedIdToken } from 'firebase-admin/auth'
import { getDatabase } from 'firebase-admin/database'
import { canonicalJson, isAdminApprovalAction, type AdminApprovalAction, type AdminApprovalRequest } from '@/lib/admin-approval'
import { getFirebaseAdminApp, AdminAccessError } from '@/lib/server/firebase-admin'

const APPROVAL_LIFETIME_MS = 60_000
const MAX_MFA_AGE_SECONDS = 120

interface StoredAdminApproval extends Pick<AdminApprovalRequest, 'action' | 'targetId'> {
  actorUid: string
  payloadHash: string
  createdAt: number
  expiresAt: number
  consumedAt: number | null
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export function adminApprovalPayloadHash(payload: unknown) {
  return sha256(canonicalJson(payload))
}

export function adminApprovalSerializedPayloadHash(payloadJson: string) {
  return sha256(payloadJson)
}

export function parseAdminMutationJson<T>(payloadJson: string): T {
  try {
    const parsed = JSON.parse(payloadJson) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not_object')
    return parsed as T
  } catch {
    throw new AdminAccessError(400, 'Nội dung thay đổi không phải JSON hợp lệ.')
  }
}

function secondFactor(identity: DecodedIdToken) {
  const firebase = identity.firebase as (DecodedIdToken['firebase'] & { sign_in_second_factor?: string }) | undefined
  return firebase?.sign_in_second_factor
}

export function assertFreshAdminMfa(identity: DecodedIdToken, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (identity.email_verified !== true) throw new AdminAccessError(403, 'Email quản trị phải được xác minh trước khi dùng xác thực hai bước.')
  if (!secondFactor(identity)) throw new AdminAccessError(403, 'Thao tác này yêu cầu đăng nhập bằng mã Google Authenticator.')
  if (!identity.auth_time || nowSeconds - identity.auth_time > MAX_MFA_AGE_SECONDS) {
    throw new AdminAccessError(401, 'Phiên xác thực hai bước đã quá cũ. Hãy nhập lại mật khẩu và mã 6 số.')
  }
}

export async function issueAdminApproval(identity: DecodedIdToken, input: unknown) {
  assertFreshAdminMfa(identity)
  const body = input as { action?: unknown; targetId?: unknown; payloadJson?: unknown } | null
  if (!body || !isAdminApprovalAction(body.action)) throw new AdminAccessError(400, 'Loại thao tác xác nhận không hợp lệ.')
  if (typeof body.targetId !== 'string' || body.targetId.length < 1 || body.targetId.length > 256) throw new AdminAccessError(400, 'Đối tượng xác nhận không hợp lệ.')
  if (typeof body.payloadJson !== 'string' || body.payloadJson.length < 2 || body.payloadJson.length > 32_000) throw new AdminAccessError(400, 'Nội dung thay đổi không hợp lệ.')
  parseAdminMutationJson(body.payloadJson)

  const token = randomBytes(32).toString('base64url')
  const now = Date.now()
  const record: StoredAdminApproval = {
    action: body.action,
    targetId: body.targetId,
    actorUid: identity.uid,
    payloadHash: adminApprovalSerializedPayloadHash(body.payloadJson),
    createdAt: now,
    expiresAt: now + APPROVAL_LIFETIME_MS,
    consumedAt: null,
  }
  await getDatabase(getFirebaseAdminApp()).ref(`monetization/adminApprovals/${sha256(token)}`).set(record)
  return { approvalToken: token, expiresAt: record.expiresAt }
}

export async function consumeAdminApproval(request: Request, identity: DecodedIdToken, action: AdminApprovalAction, targetId: string, payloadJson: string) {
  const token = request.headers.get('x-admin-approval')?.trim() || ''
  if (!token) throw new AdminAccessError(401, 'Cần xác thực Google Authenticator trước khi thực hiện thao tác này.')

  const ref = getDatabase(getFirebaseAdminApp()).ref(`monetization/adminApprovals/${sha256(token)}`)
  const expectedPayloadHash = adminApprovalSerializedPayloadHash(payloadJson)
  // Read the immutable ticket from the server before starting the one-time
  // consume transaction. A Realtime Database transaction may initially invoke
  // its updater with an empty local cache. Treating that initial null as a
  // missing root record aborts the transaction even when the ticket exists.
  const snapshot = await ref.get()
  if (!snapshot.exists()) throw new AdminAccessError(403, 'Không tìm thấy vé xác nhận MFA. Hãy xác thực lại.')

  const approval = snapshot.val() as StoredAdminApproval
  if (approval.consumedAt) throw new AdminAccessError(409, 'Mã xác nhận đã được sử dụng. Hãy xác thực lại.')
  if (approval.expiresAt <= Date.now()) throw new AdminAccessError(401, 'Mã xác nhận đã hết hạn. Hãy xác thực lại.')
  if (approval.actorUid !== identity.uid) throw new AdminAccessError(403, 'Vé MFA thuộc một tài khoản quản trị khác.')
  if (approval.action !== action) throw new AdminAccessError(403, 'Vé MFA không đúng loại thao tác.')
  if (approval.targetId !== targetId) throw new AdminAccessError(403, 'Vé MFA không đúng đối tượng thay đổi.')
  if (approval.payloadHash !== expectedPayloadHash) {
    if (process.env.NODE_ENV !== 'production') console.warn('admin_approval_payload_mismatch', { action, targetId, storedHash: approval.payloadHash.slice(0, 12), expectedHash: expectedPayloadHash.slice(0, 12) })
    throw new AdminAccessError(403, 'Payload của vé MFA không khớp với request. Hãy xác thực lại.')
  }

  // RTDB does not persist null children, so consumedAt starts as null. Making
  // just this child transactional provides a reliable compare-and-set: only
  // the first concurrent request can replace null with a timestamp.
  const consumedAt = Date.now()
  const result = await ref.child('consumedAt').transaction((current: number | null) => current === null ? consumedAt : undefined, undefined, false)
  if (!result.committed) throw new AdminAccessError(409, 'Mã xác nhận đã được sử dụng. Hãy xác thực lại.')
}
