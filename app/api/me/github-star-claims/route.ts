import { NextResponse } from 'next/server'
import { getDatabase } from 'firebase-admin/database'
import { requireUser, getFirebaseAdminApp } from '@/lib/server/firebase-admin'
import { createGithubStarClaim } from '@/lib/server/github-star'
import { apiError } from '@/lib/server/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const identity = await requireUser(request)
    const reservation = await getDatabase(getFirebaseAdminApp()).ref(`githubStar/reservations/star-plus-2026/uids/${identity.uid}`).get()
    if (!reservation.exists()) return NextResponse.json({ claim: null })
    const claim = await getDatabase(getFirebaseAdminApp()).ref(`githubStar/claims/${reservation.val()}`).get()
    return NextResponse.json({ claim: claim.exists() ? claim.val() : null })
  } catch (error) { return apiError(error, 'Không thể tải yêu cầu GitHub Star.') }
}

export async function POST(request: Request) {
  try {
    const identity = await requireUser(request)
    const form = await request.formData()
    const evidence = form.get('evidence')
    return NextResponse.json({ claim: await createGithubStarClaim(identity, { githubLogin: String(form.get('githubLogin') || ''), ...(evidence instanceof File ? { evidence } : {}) }) })
  } catch (error) { return apiError(error, 'Không thể gửi yêu cầu GitHub Star.') }
}
