import { requireUser } from '@/lib/server/firebase-admin'
import { feedbackScreenshot } from '@/lib/server/feedback'
import { apiError } from '@/lib/server/api-response'

export async function GET(request: Request, { params }: { params: { feedbackId: string } }) {
  try {
    const identity = await requireUser(request)
    return new Response(await feedbackScreenshot(params.feedbackId, identity.uid), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store' } })
  } catch (error) { return apiError(error, 'Không thể tải ảnh góp ý.') }
}
