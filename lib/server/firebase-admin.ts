import 'server-only'

import { applicationDefault, cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth'
import { getDatabase } from 'firebase-admin/database'
import { isAllowedAdmin, parseAdminUidAllowlist } from '@/lib/admin-access'

function serviceAccountCredential() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
  if (json) {
    const parsed = JSON.parse(json) as { project_id: string; client_email: string; private_key: string }
    return cert({ projectId: parsed.project_id, clientEmail: parsed.client_email, privateKey: parsed.private_key.replace(/\\n/g, '\n') })
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (projectId && clientEmail && privateKey) return cert({ projectId, clientEmail, privateKey })
  return applicationDefault()
}

export function getFirebaseAdminApp(): App {
  if (getApps().length) return getApps()[0]
  return initializeApp({
    credential: serviceAccountCredential(),
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    databaseURL: process.env.FIREBASE_DATABASE_URL || process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  })
}

export async function requireAdmin(request: Request): Promise<DecodedIdToken> {
  const identity = await requireUser(request)
  const allowlist = parseAdminUidAllowlist(process.env.ADMIN_FIREBASE_UIDS)
  if (!isAllowedAdmin(identity, allowlist)) throw new AdminAccessError(403, 'Tài khoản này không có quyền quản trị.')
  return identity
}

export async function requireUser(request: Request): Promise<DecodedIdToken> {
  const authorization = request.headers.get('authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  if (!token) throw new AdminAccessError(401, 'Bạn cần đăng nhập để mở trang quản trị.')

  let identity: DecodedIdToken
  try {
    identity = await getAuth(getFirebaseAdminApp()).verifyIdToken(token, true)
  } catch {
    throw new AdminAccessError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.')
  }

  return identity
}

export async function readAdminDatabasePath<T>(path: string): Promise<T | null> {
  const snapshot = await getDatabase(getFirebaseAdminApp()).ref(path).get()
  return snapshot.exists() ? snapshot.val() as T : null
}

export class AdminAccessError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'AdminAccessError'
  }
}
