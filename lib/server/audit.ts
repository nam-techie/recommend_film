import 'server-only'

import { getDatabase } from 'firebase-admin/database'
import { getFirebaseAdminApp } from '@/lib/server/firebase-admin'
import { MonetizationError } from '@/lib/server/monetization-error'
import { auditPresentation, normalizeAuditEvent, type AuditEvent, type AuditStatus } from '@/lib/audit'

export type MonetizationAuditLog = AuditEvent

const BLOCKED_KEYS = /authorization|token|secret|password|private.?key|raw.?body|credential/i

function redact(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[truncated]'
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => redact(item, depth + 1))
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !BLOCKED_KEYS.test(key))
    .slice(0, 100)
    .map(([key, item]) => [key, redact(item, depth + 1)]))
}

function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(redact(value))) as T
}

export function validateAuditReason(value: string) {
  const reason = value.trim()
  if (reason.length < 3 || reason.length > 240) throw new MonetizationError('INVALID_REASON', 'Lý do cần từ 3 đến 240 ký tự.')
  return reason
}

export async function createPendingAudit(input: Omit<AuditEvent, 'id' | 'status' | 'category' | 'severity' | 'createdAt' | 'actorType'> & Partial<Pick<AuditEvent, 'category' | 'severity' | 'actorType' | 'idempotencyKey'>>) {
  const ref = getDatabase(getFirebaseAdminApp()).ref('monetization/auditLogs').push()
  const base = normalizeAuditEvent({ ...input, id: ref.key!, status: 'pending', createdAt: Date.now() })
  const presentation = auditPresentation(base)
  const log: AuditEvent = clean({ ...base, category: presentation.category, severity: presentation.severity })
  await ref.set(log)
  return log
}

export async function finishAudit(id: string, status: Exclude<AuditStatus, 'pending'>, patch: Partial<Pick<AuditEvent, 'before' | 'after' | 'errorCode'>> = {}) {
  await getDatabase(getFirebaseAdminApp()).ref(`monetization/auditLogs/${id}`).update(clean({ ...patch, status, severity: status === 'failed' ? 'error' : 'success', completedAt: Date.now() }))
}

export async function recordAuditEvent(input: Omit<AuditEvent, 'id' | 'category' | 'severity' | 'createdAt' | 'actorType'> & Partial<Pick<AuditEvent, 'id' | 'category' | 'severity' | 'createdAt' | 'actorType'>>) {
  const database = getDatabase(getFirebaseAdminApp())
  const id = input.id || database.ref('monetization/auditLogs').push().key!
  const event = clean(normalizeAuditEvent({ ...input, id, createdAt: input.createdAt || Date.now() }))
  const result = await database.ref(`monetization/auditLogs/${id}`).transaction((current) => current || event, undefined, false)
  return normalizeAuditEvent(result.snapshot.val() as AuditEvent)
}

export async function runAuditedMutation<T>(
  input: Parameters<typeof createPendingAudit>[0],
  mutation: (audit: AuditEvent) => Promise<T>,
  after: (result: T) => unknown = (result) => result,
) {
  const audit = await createPendingAudit(input)
  try {
    const result = await mutation(audit)
    await finishAudit(audit.id, 'succeeded', { after: after(result) })
    return { result, audit }
  } catch (error) {
    const errorCode = String((error as { code?: unknown })?.code || (error instanceof Error ? error.name : 'UNKNOWN')).slice(0, 80)
    await finishAudit(audit.id, 'failed', { errorCode }).catch(() => undefined)
    throw error
  }
}
