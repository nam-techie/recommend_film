import { requireAdminPermission } from '@/lib/server/firebase-admin'
import { feedbackScreenshot } from '@/lib/server/feedback'
import { apiError } from '@/lib/server/api-response'

export async function GET(request: Request, { params }: { params: { feedbackId: string } }) {
  try {
    const admin = await requireAdminPermission(request, 'support.manage')
    return new Response(await feedbackScreenshot(params.feedbackId, admin.uid, true), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store' } })
  } catch (error) { return apiError(error, 'Không thể tải ảnh góp ý.') }
}
