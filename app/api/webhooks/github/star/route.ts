import { NextResponse } from 'next/server'
import { handleGithubStarWebhook, verifyWebhookHmac } from '@/lib/server/github-star'
import { apiError } from '@/lib/server/api-response'

export async function POST(request: Request) {
  try {
    const secret = process.env.GITHUB_STAR_WEBHOOK_SECRET || ''
    const signature = request.headers.get('x-hub-signature-256') || ''
    const deliveryId = request.headers.get('x-github-delivery') || ''
    const event = request.headers.get('x-github-event') || ''
    const raw = await request.text()
    if (!secret || !deliveryId || event !== 'star' || !verifyWebhookHmac(raw, signature, secret)) return NextResponse.json({ error: 'Webhook signature không hợp lệ.' }, { status: 401 })
    const payload = JSON.parse(raw) as { action: string; repository: { id: number }; sender: { id: number; login: string }; starred_at?: string | null }
    return NextResponse.json(await handleGithubStarWebhook({ deliveryId, action: payload.action, repositoryId: payload.repository.id, sender: payload.sender, starredAt: payload.starred_at }))
  } catch (error) { return apiError(error, 'Không thể xử lý GitHub webhook.') }
}
