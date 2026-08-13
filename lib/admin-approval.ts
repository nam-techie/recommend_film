export const ADMIN_APPROVAL_ACTIONS = [
  'user_status_update',
  'user_sessions_revoke',
  'user_entitlement_update',
  'plan_version_create',
  'plan_version_cancel',
  'affiliate_link_create',
  'affiliate_link_update',
  'affiliate_policy_update',
  'discount_code_create',
  'discount_code_update',
  'content_publish',
  'content_unpublish',
  'community_moderate',
  'analytics_sensitive_read',
  'entitlement_grant_update',
  'entitlement_restriction_update',
  'github_star_claim_review',
  'github_star_campaign_update',
  'feedback_update',
] as const

export type AdminApprovalAction = typeof ADMIN_APPROVAL_ACTIONS[number]

export interface AdminApprovalRequest {
  action: AdminApprovalAction
  targetId: string
  payload: Record<string, unknown>
}

export function isAdminApprovalAction(value: unknown): value is AdminApprovalAction {
  return typeof value === 'string' && (ADMIN_APPROVAL_ACTIONS as readonly string[]).includes(value)
}

export function canonicalJson(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number') return Number.isFinite(value) ? JSON.stringify(value) : 'null'
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const keys = Object.keys(record).filter((key) => record[key] !== undefined).sort()
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`
  }
  return 'null'
}
