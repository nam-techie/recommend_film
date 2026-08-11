import type { AccountEntitlement } from '@/lib/monetization'

export interface AdminUserSummary {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  providers: string[]
  emailVerified: boolean
  disabled: boolean
  createdAt: number | null
  lastSignInAt: number | null
  username?: string
  entitlement: AccountEntitlement
  protectedAdmin: boolean
}

export type EntitlementAdminAction =
  | { action: 'grant' | 'replace'; plan: 'premium' | 'ultra'; billingCycle: 'monthly' | 'annual'; reason: string }
  | { action: 'extend'; billingCycle: 'monthly' | 'annual'; reason: string }
  | { action: 'cancel'; reason: string }
