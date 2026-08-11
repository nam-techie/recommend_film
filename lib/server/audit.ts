import 'server-only'

import { getDatabase } from 'firebase-admin/database'
import { getFirebaseAdminApp } from '@/lib/server/firebase-admin'
import { MonetizationError } from '@/lib/server/monetization-error'

export interface MonetizationAuditLog {
  id: string
  action: string
  status: 'pending' | 'succeeded' | 'failed'
  actorUid: string
  targetUid?: string
  targetId?: string
  reason: string
  before?: unknown
  after?: unknown
  createdAt: number
  completedAt?: number
  errorCode?: string
}

function clean(value: unknown) {
  return JSON.parse(JSON.stringify(value))
}

export function validateAuditReason(value: string) {
  const reason = value.trim()
  if (reason.length < 3 || reason.length > 240) throw new MonetizationError('INVALID_REASON', 'Lý do cần từ 3 đến 240 ký tự.')
  return reason
}

export async function createPendingAudit(input: Omit<MonetizationAuditLog, 'id' | 'status' | 'createdAt'>) {
  const ref = getDatabase(getFirebaseAdminApp()).ref('monetization/auditLogs').push()
  const log: MonetizationAuditLog = clean({ ...input, id: ref.key!, status: 'pending', createdAt: Date.now() })
  await ref.set(log)
  return log
}

export async function finishAudit(id: string, status: 'succeeded' | 'failed', patch: Partial<Pick<MonetizationAuditLog, 'before' | 'after' | 'errorCode'>> = {}) {
  await getDatabase(getFirebaseAdminApp()).ref(`monetization/auditLogs/${id}`).update(clean({ ...patch, status, completedAt: Date.now() }))
}
