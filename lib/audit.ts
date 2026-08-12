export type AuditStatus = 'pending' | 'succeeded' | 'failed'
export type AuditSeverity = 'info' | 'success' | 'warning' | 'error'
export type AuditCategory = 'account' | 'entitlement' | 'payment' | 'discount' | 'plan' | 'affiliate' | 'security' | 'email' | 'system'

export interface AuditEvent {
  id: string
  action: string
  category: AuditCategory
  severity: AuditSeverity
  status: AuditStatus
  actorUid: string
  actorType: 'admin' | 'user' | 'system'
  targetUid?: string
  targetId?: string
  reason: string
  before?: unknown
  after?: unknown
  createdAt: number
  completedAt?: number
  errorCode?: string
  idempotencyKey?: string
}

export interface AuditPresentation {
  title: string
  href: string
  category: AuditCategory
  severity: AuditSeverity
}

const ACTIONS: Record<string, Omit<AuditPresentation, 'severity'> & { severity?: AuditSeverity }> = {
  account_created: { title: 'Tài khoản mới được tạo', href: '/admin/users', category: 'account' },
  user_disabled: { title: 'Tài khoản đã bị khóa', href: '/admin/users', category: 'security', severity: 'warning' },
  user_enabled: { title: 'Tài khoản đã được mở khóa', href: '/admin/users', category: 'security' },
  user_sessions_revoked: { title: 'Đã thu hồi toàn bộ phiên đăng nhập', href: '/admin/users', category: 'security', severity: 'warning' },
  entitlement_granted: { title: 'Đã cấp gói tài khoản', href: '/admin/users', category: 'entitlement' },
  entitlement_replaced: { title: 'Đã thay đổi gói tài khoản', href: '/admin/users', category: 'entitlement' },
  entitlement_extended: { title: 'Đã gia hạn gói tài khoản', href: '/admin/users', category: 'entitlement' },
  entitlement_cancelled: { title: 'Đã hủy gói trả phí', href: '/admin/users', category: 'entitlement', severity: 'warning' },
  discount_redeemed: { title: 'Mã giảm giá đã được sử dụng', href: '/admin/discounts', category: 'discount' },
  discount_code_created: { title: 'Đã tạo mã giảm giá', href: '/admin/discounts', category: 'discount' },
  discount_code_updated: { title: 'Đã cập nhật mã giảm giá', href: '/admin/discounts', category: 'discount' },
  plan_version_created: { title: 'Đã phát hành phiên bản giá', href: '/admin/plans', category: 'plan' },
  plan_version_cancelled: { title: 'Đã hủy phiên bản giá', href: '/admin/plans', category: 'plan', severity: 'warning' },
  affiliate_link_created: { title: 'Đã tạo liên kết affiliate', href: '/admin/affiliate', category: 'affiliate' },
  affiliate_link_updated: { title: 'Đã cập nhật liên kết affiliate', href: '/admin/affiliate', category: 'affiliate' },
  affiliate_enabled: { title: 'Đã bật affiliate', href: '/admin/affiliate', category: 'affiliate' },
  affiliate_disabled: { title: 'Đã tắt affiliate', href: '/admin/affiliate', category: 'affiliate', severity: 'warning' },
  transactional_email_failed: { title: 'Email giao dịch gửi thất bại', href: '/admin/audit?category=email&status=failed', category: 'email', severity: 'error' },
}

function categoryFromAction(action: string): AuditCategory {
  if (action.startsWith('user_') || action === 'account_created') return 'account'
  if (action.startsWith('entitlement_')) return 'entitlement'
  if (action.startsWith('payment_')) return 'payment'
  if (action.startsWith('discount_')) return 'discount'
  if (action.startsWith('plan_')) return 'plan'
  if (action.startsWith('affiliate_')) return 'affiliate'
  if (action.includes('email') || action.includes('receipt')) return 'email'
  return 'system'
}

export function auditPresentation(event: Pick<AuditEvent, 'action' | 'status' | 'category' | 'severity'>): AuditPresentation {
  const configured = ACTIONS[event.action]
  const category = configured?.category || event.category || categoryFromAction(event.action)
  const severity = event.status === 'failed' ? 'error' : configured?.severity || event.severity || (event.status === 'succeeded' ? 'success' : 'info')
  return {
    title: configured?.title || event.action.replaceAll('_', ' '),
    href: configured?.href || '/admin/audit',
    category,
    severity,
  }
}

export function normalizeAuditEvent(value: Partial<AuditEvent> & { id?: string; action?: string; createdAt?: number }): AuditEvent {
  const action = value.action || 'unknown_event'
  const status: AuditStatus = value.status === 'failed' || value.status === 'pending' ? value.status : 'succeeded'
  const category = value.category || ACTIONS[action]?.category || categoryFromAction(action)
  const severity = value.severity || (status === 'failed' ? 'error' : ACTIONS[action]?.severity || (status === 'succeeded' ? 'success' : 'info'))
  return {
    id: value.id || '',
    action,
    category,
    severity,
    status,
    actorUid: value.actorUid || 'system',
    actorType: value.actorType || (value.actorUid && value.actorUid !== 'system' ? 'admin' : 'system'),
    ...(value.targetUid ? { targetUid: value.targetUid } : {}),
    ...(value.targetId ? { targetId: value.targetId } : {}),
    reason: value.reason || (value.actorUid === value.targetUid ? 'Người dùng thực hiện thao tác.' : 'Sự kiện hệ thống.'),
    ...(value.before !== undefined ? { before: value.before } : {}),
    ...(value.after !== undefined ? { after: value.after } : {}),
    createdAt: Number(value.createdAt) || Date.now(),
    ...(value.completedAt ? { completedAt: Number(value.completedAt) } : {}),
    ...(value.errorCode ? { errorCode: value.errorCode } : {}),
    ...(value.idempotencyKey ? { idempotencyKey: value.idempotencyKey } : {}),
  }
}
