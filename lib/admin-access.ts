export interface AdminTokenIdentity {
  uid: string
  admin?: unknown
  adminRole?: unknown
  adminPermissions?: unknown
}

export const ADMIN_PERMISSIONS = ['content.manage', 'analytics.read', 'analytics.read_sensitive', 'community.moderate', 'support.manage', 'entitlement.manage', 'entitlement.revoke', 'super_admin'] as const
export type AdminPermission = typeof ADMIN_PERMISSIONS[number]

export function parseAdminUidAllowlist(value = '') {
  return [...new Set(value.split(/[\s,;]+/).map((uid) => uid.trim()).filter(Boolean))]
}

export function isAllowedAdmin(identity: AdminTokenIdentity, allowlist: string[]) {
  return identity.admin === true || identity.adminRole === 'super_admin' || allowlist.includes(identity.uid)
}

export function adminPermissionsFor(identity: AdminTokenIdentity, allowlist: string[]): AdminPermission[] {
  // Backward-compatible migration: existing `admin: true` claims keep owner
  // access until every administrator is issued explicit role/permissions.
  if (allowlist.includes(identity.uid) || identity.adminRole === 'super_admin' || identity.admin === true) return [...ADMIN_PERMISSIONS]
  const requested = Array.isArray(identity.adminPermissions) ? identity.adminPermissions : []
  return ADMIN_PERMISSIONS.filter((permission) => requested.includes(permission))
}

export function hasAdminPermission(identity: AdminTokenIdentity, allowlist: string[], permission: AdminPermission) {
  const permissions = adminPermissionsFor(identity, allowlist)
  return permissions.includes('super_admin') || permissions.includes(permission)
}
