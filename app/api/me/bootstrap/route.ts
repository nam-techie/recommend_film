import { NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { getDatabase } from 'firebase-admin/database'
import { apiError } from '@/lib/server/api-response'
import { getFirebaseAdminApp, requireUser } from '@/lib/server/firebase-admin'
import { recordAuditEvent } from '@/lib/server/audit'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const identity = await requireUser(request)
    const app = getFirebaseAdminApp()
    const user = await getAuth(app).getUser(identity.uid)
    const createdAt = Date.parse(user.metadata.creationTime)
    const recent = Number.isFinite(createdAt) && Date.now() - createdAt <= 60 * 60_000
    if (!recent) return NextResponse.json({ created: false })

    const markerRef = getDatabase(app).ref(`monetization/accountCreatedEvents/${identity.uid}`)
    let created = false
    const marker = await markerRef.transaction((current) => {
      if (current) return
      created = true
      return { createdAt, recordedAt: Date.now() }
    }, undefined, false)
    if (!marker.committed || !created) return NextResponse.json({ created: false })
    await recordAuditEvent({
      id: `account:${identity.uid}:created`, action: 'account_created', status: 'succeeded',
      actorUid: identity.uid, actorType: 'user', targetUid: identity.uid,
      reason: 'Firebase Authentication ghi nhận tài khoản mới.',
      after: { provider: user.providerData[0]?.providerId || 'unknown', emailVerified: user.emailVerified },
      createdAt, completedAt: Date.now(), idempotencyKey: `account:${identity.uid}:created`,
    })
    return NextResponse.json({ created: true })
  } catch (error) {
    return apiError(error, 'Không thể hoàn tất khởi tạo tài khoản.')
  }
}
