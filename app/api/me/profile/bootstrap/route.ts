import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server/firebase-admin'
import { apiError } from '@/lib/server/api-response'
import { ensureServerProfile } from '@/lib/server/profile-bootstrap'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try { const identity = await requireUser(request); return NextResponse.json({ profile: await ensureServerProfile(identity) }) }
  catch (error) { return apiError(error, 'Không thể khởi tạo hồ sơ.') }
}
