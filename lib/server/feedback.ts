import 'server-only'

import { randomUUID } from 'node:crypto'
import { getDatabase } from 'firebase-admin/database'
import type { DecodedIdToken } from 'firebase-admin/auth'
import { feedbackDeviceClass, validFeedbackCategory, type FeedbackPriority, type FeedbackStatus, type UserFeedback } from '@/lib/feedback'
import { getFirebaseAdminApp } from '@/lib/server/firebase-admin'
import { MonetizationError } from '@/lib/server/monetization-error'
import { deletePrivateFile, downloadPrivateFile, storePrivateScreenshot } from '@/lib/server/private-storage'
import { recordAuditEvent, validateAuditReason } from '@/lib/server/audit'

const DAY = 24 * 60 * 60_000

function cleanPath(value: string) {
  const path = value.trim().slice(0, 500).split('#')[0]
  return path.startsWith('/') ? path : '/'
}

export async function createFeedback(identity: DecodedIdToken, form: FormData) {
  if (!identity.email || identity.email_verified !== true || identity.firebase?.sign_in_provider === 'anonymous') throw new MonetizationError('VERIFIED_ACCOUNT_REQUIRED', 'Bạn cần tài khoản có email đã xác minh để gửi góp ý.', 403)
  const category = form.get('category')
  const message = String(form.get('message') || '').trim()
  const requestId = String(form.get('requestId') || '').trim()
  const pagePath = cleanPath(String(form.get('pagePath') || '/'))
  const width = Math.max(1, Math.min(10_000, Number(form.get('viewportWidth') || 0)))
  const height = Math.max(1, Math.min(10_000, Number(form.get('viewportHeight') || 0)))
  if (!validFeedbackCategory(category)) throw new MonetizationError('INVALID_CATEGORY', 'Phân loại góp ý không hợp lệ.', 400)
  if (message.length < 20 || message.length > 2_000) throw new MonetizationError('INVALID_MESSAGE', 'Nội dung cần từ 20 đến 2.000 ký tự.', 400)
  if (!/^[a-zA-Z0-9_-]{12,80}$/.test(requestId)) throw new MonetizationError('INVALID_REQUEST_ID', 'Request ID không hợp lệ.', 400)
  const database = getDatabase(getFirebaseAdminApp())
  const existing = await database.ref(`support/feedbackByRequest/${identity.uid}/${requestId}`).get()
  if (existing.exists()) {
    const snapshot = await database.ref(`support/feedback/${existing.val()}`).get()
    if (snapshot.exists()) return snapshot.val() as UserFeedback
  }
  const id = randomUUID()
  let conflictingId: string | null = null
  const requestRef = database.ref(`support/feedbackByRequest/${identity.uid}/${requestId}`)
  const reservation = await requestRef.transaction((current) => {
    if (current) { conflictingId = String(current); return }
    return id
  }, undefined, false)
  if (!reservation.committed) {
    if (conflictingId) {
      const duplicate = await database.ref(`support/feedback/${conflictingId}`).get()
      if (duplicate.exists()) return duplicate.val() as UserFeedback
    }
    throw new MonetizationError('FEEDBACK_REQUEST_IN_PROGRESS', 'Góp ý này đang được xử lý. Hãy thử lại sau ít giây.', 409)
  }
  const rateRef = database.ref(`support/feedbackRate/${identity.uid}`)
  const now = Date.now()
  let limited = false
  const rate = await rateRef.transaction((stored: { timestamps?: number[] } | null) => {
    const timestamps = (stored?.timestamps || []).filter((value) => value > now - DAY)
    if (timestamps.length >= 5) { limited = true; return }
    return { timestamps: [...timestamps, now] }
  }, undefined, false)
  if (!rate.committed || limited) { await requestRef.remove(); throw new MonetizationError('FEEDBACK_RATE_LIMIT', 'Bạn đã gửi tối đa 5 góp ý trong 24 giờ.', 429) }

  const screenshotFile = form.get('screenshot')
  let screenshot: UserFeedback['screenshot']
  if (screenshotFile instanceof File && screenshotFile.size) {
    try { screenshot = await storePrivateScreenshot(`feedback/${identity.uid}/${id}.webp`, screenshotFile) }
    catch { screenshot = undefined }
  }
  const feedback: UserFeedback = {
    id, uid: identity.uid, email: identity.email, displayName: String(identity.name || identity.email), category, message, pagePath,
    viewport: { width, height, deviceClass: feedbackDeviceClass(width) }, ...(process.env.VERCEL_GIT_COMMIT_SHA ? { appVersion: process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12) } : {}),
    ...(screenshot ? { screenshot } : {}), status: 'new', priority: 'normal', requestId, revision: 1, createdAt: now, updatedAt: now,
  }
  const notificationId = randomUUID()
  try {
    await database.ref().update({ [`support/feedback/${id}`]: feedback, [`support/feedbackByRequest/${identity.uid}/${requestId}`]: id, [`support/feedbackByUid/${identity.uid}/${id}`]: now, [`notifications/${identity.uid}/${notificationId}`]: { id: notificationId, actorUid: 'system', actorName: 'CineMind', type: 'feedback_received', eventId: id, title: 'CineMind đã nhận góp ý', body: 'Bạn có thể theo dõi trạng thái trong Tài khoản.', href: '/account', severity: 'info', createdAt: now, read: false } })
  } catch (error) { if (screenshot) await deletePrivateFile(screenshot.objectPath).catch(() => undefined); await requestRef.remove().catch(() => undefined); throw error }
  return feedback
}

export async function listOwnFeedback(uid: string) {
  const database = getDatabase(getFirebaseAdminApp())
  const index = await database.ref(`support/feedbackByUid/${uid}`).get()
  const ids = Object.keys(index.val() || {})
  const rows = await Promise.all(ids.map((id) => database.ref(`support/feedback/${id}`).get()))
  return rows.filter((row) => row.exists()).map((row) => row.val() as UserFeedback).sort((a, b) => b.createdAt - a.createdAt)
}

export async function listAdminFeedback() {
  const snapshot = await getDatabase(getFirebaseAdminApp()).ref('support/feedback').get()
  return Object.values((snapshot.val() || {}) as Record<string, UserFeedback>).sort((a, b) => b.createdAt - a.createdAt)
}

export async function updateFeedback(id: string, actor: Pick<DecodedIdToken, 'uid'>, input: { status: FeedbackStatus; priority: FeedbackPriority; assigneeUid?: string; adminNote?: string; publicReply?: string; reason: string; expectedRevision: number }) {
  const reason = validateAuditReason(input.reason)
  if (!['new', 'triaged', 'planned', 'resolved', 'dismissed'].includes(input.status) || !['low', 'normal', 'high', 'urgent'].includes(input.priority)) throw new MonetizationError('INVALID_FEEDBACK_UPDATE', 'Trạng thái hoặc độ ưu tiên không hợp lệ.', 400)
  const database = getDatabase(getFirebaseAdminApp())
  const ref = database.ref(`support/feedback/${id}`)
  let failure: MonetizationError | null = null
  const result = await ref.transaction((stored: UserFeedback | null) => {
    if (!stored) { failure = new MonetizationError('FEEDBACK_NOT_FOUND', 'Không tìm thấy góp ý.', 404); return }
    if (stored.revision !== input.expectedRevision) { failure = new MonetizationError('FEEDBACK_REVISION_CONFLICT', 'Góp ý vừa được cập nhật. Hãy tải lại.', 409); return }
    const now = Date.now()
    return { ...stored, status: input.status, priority: input.priority, ...(input.assigneeUid ? { assigneeUid: input.assigneeUid } : {}), ...(input.adminNote ? { adminNote: input.adminNote.slice(0, 2_000) } : {}), ...(input.publicReply ? { publicReply: input.publicReply.slice(0, 1_000) } : {}), ...(input.status === 'resolved' || input.status === 'dismissed' ? { resolvedAt: now } : {}), updatedAt: now, revision: stored.revision + 1 }
  }, undefined, false)
  if (!result.committed) throw failure || new MonetizationError('FEEDBACK_UPDATE_FAILED', 'Không thể cập nhật góp ý.', 409)
  const updated = result.snapshot.val() as UserFeedback
  const notificationId = randomUUID()
  await database.ref(`notifications/${updated.uid}/${notificationId}`).set({ id: notificationId, actorUid: 'system', actorName: 'CineMind', type: 'feedback_status_changed', eventId: updated.id, title: 'Góp ý của bạn đã được cập nhật', body: input.publicReply || `Trạng thái mới: ${input.status}`, href: '/account?tab=notifications', severity: input.status === 'resolved' ? 'success' : 'info', createdAt: Date.now(), read: false })
  await recordAuditEvent({ action: 'feedback_updated', status: 'succeeded', actorUid: actor.uid, targetUid: updated.uid, reason, before: { revision: input.expectedRevision }, after: { id, status: updated.status, priority: updated.priority } })
  return updated
}

export async function feedbackScreenshot(id: string, requesterUid: string, admin = false) {
  const snapshot = await getDatabase(getFirebaseAdminApp()).ref(`support/feedback/${id}`).get()
  if (!snapshot.exists()) throw new MonetizationError('FEEDBACK_NOT_FOUND', 'Không tìm thấy góp ý.', 404)
  const feedback = snapshot.val() as UserFeedback
  if (!admin && feedback.uid !== requesterUid) throw new MonetizationError('FEEDBACK_FORBIDDEN', 'Bạn không có quyền xem ảnh này.', 403)
  if (!feedback.screenshot) throw new MonetizationError('SCREENSHOT_NOT_FOUND', 'Góp ý không có ảnh.', 404)
  return downloadPrivateFile(feedback.screenshot.objectPath)
}
export async function runFeedbackRetention(now = Date.now()) {
  const database = getDatabase(getFirebaseAdminApp())
  const snapshot = await database.ref('support/feedback').get()
  const items = Object.values((snapshot.val() || {}) as Record<string, UserFeedback>)
  const screenshotCutoff = now - 90 * DAY
  const metadataCutoff = now - 395 * DAY
  let screenshotsDeleted = 0
  let metadataDeleted = 0
  for (const item of items) {
    if (!['resolved', 'dismissed'].includes(item.status) || !item.resolvedAt) continue
    if (item.screenshot && item.resolvedAt <= screenshotCutoff) {
      await deletePrivateFile(item.screenshot.objectPath).catch(() => undefined)
      await database.ref(`support/feedback/${item.id}/screenshot`).remove()
      screenshotsDeleted += 1
    }
    if (item.resolvedAt <= metadataCutoff) {
      await database.ref().update({ [`support/feedback/${item.id}`]: null, [`support/feedbackByUid/${item.uid}/${item.id}`]: null, [`support/feedbackByRequest/${item.uid}/${item.requestId}`]: null })
      metadataDeleted += 1
    }
  }
  return { screenshotsDeleted, metadataDeleted }
}

export async function anonymizeFeedbackForDeletedAccount(uid: string) {
  const database = getDatabase(getFirebaseAdminApp())
  const items = await listOwnFeedback(uid)
  for (const item of items) {
    if (item.screenshot) await deletePrivateFile(item.screenshot.objectPath).catch(() => undefined)
    if (['triaged', 'planned', 'resolved', 'dismissed'].includes(item.status)) {
      await database.ref(`support/feedback/${item.id}`).update({ uid: 'deleted', email: null, displayName: 'Tài khoản đã xóa', screenshot: null, anonymizedAt: Date.now() })
    } else await database.ref(`support/feedback/${item.id}`).remove()
  }
  await database.ref(`support/feedbackByUid/${uid}`).remove()
  await database.ref(`support/feedbackByRequest/${uid}`).remove()
  await database.ref(`support/feedbackRate/${uid}`).remove()
}