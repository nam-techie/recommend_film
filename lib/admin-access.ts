export interface AdminTokenIdentity {
  uid: string
  admin?: unknown
}

export function parseAdminUidAllowlist(value = '') {
  return [...new Set(value.split(/[\s,;]+/).map((uid) => uid.trim()).filter(Boolean))]
}

export function isAllowedAdmin(identity: AdminTokenIdentity, allowlist: string[]) {
  return identity.admin === true || allowlist.includes(identity.uid)
}
