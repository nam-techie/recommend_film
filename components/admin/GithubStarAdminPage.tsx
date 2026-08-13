'use client'

import { useCallback, useEffect, useState } from 'react'
import { Github, Loader2, RefreshCw } from 'lucide-react'
import { useAdminApi } from '@/hooks/useAdminApi'
import { useAdminStepUp } from '@/components/admin/AdminStepUpDialog'
import { AccessDenied, AdminLogin, AdminShell } from '@/components/admin/AdminShell'
import { Button } from '@/components/ui/button'
import type { GithubStarCampaign, GithubStarClaim } from '@/lib/github-star'

export function GithubStarAdminPage() {
  const { user, loading: authLoading, logout, request, denied } = useAdminApi()
  const { approve, dialog } = useAdminStepUp()
  const [campaign, setCampaign] = useState<GithubStarCampaign | null>(null)
  const [claims, setClaims] = useState<GithubStarClaim[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [evidence, setEvidence] = useState<{ claimId: string; url: string } | null>(null)
  const load = useCallback(async () => { if (!user) return; setLoading(true); try { const payload = await request<{ campaign: GithubStarCampaign; claims: GithubStarClaim[] }>('/api/admin/github-star-claims'); setCampaign(payload.campaign); setClaims(payload.claims) } catch (next) { setError(next instanceof Error ? next.message : 'Không thể tải campaign.') } finally { setLoading(false) } }, [request, user])
  useEffect(() => { if (user) void load() }, [load, user])
  const openEvidence = async (claim: GithubStarClaim) => {
    if (!user) return
    try {
      const response = await fetch(`/api/admin/github-star-claims/${claim.id}/evidence`, { headers: { Authorization: `Bearer ${await user.getIdToken()}` } })
      if (!response.ok) throw new Error('Không thể tải evidence.')
      const url = URL.createObjectURL(await response.blob())
      setEvidence((previous) => { if (previous) URL.revokeObjectURL(previous.url); return { claimId: claim.id, url } })
    } catch (next) { setError(next instanceof Error ? next.message : 'Không thể tải evidence.') }
  }
  const review = async (claim: GithubStarClaim, action: 'approve' | 'reject' | 'request_proof') => {
    const body = { action, reason: action === 'approve' ? 'Đã xác minh Star và evidence' : action === 'reject' ? 'Không đủ điều kiện campaign' : 'Cần proof bổ sung trong GitHub bio', expectedRevision: claim.revision, confirmed: true }
    const approval = await approve({ action: 'github_star_claim_review', targetId: claim.id, payload: body, title: 'Duyệt claim GitHub Star', summary: `@${claim.githubLogin} · ${action}` }); if (!approval) return
    try { const payload = await request<{ claim: GithubStarClaim }>(`/api/admin/github-star-claims/${claim.id}`, { method: 'PATCH', headers: { 'X-Admin-Approval': approval.token }, body: approval.payloadJson }); setClaims((rows) => rows.map((row) => row.id === claim.id ? payload.claim : row)) } catch (next) { setError(next instanceof Error ? next.message : 'Không thể duyệt claim.') }
  }
  const updateCampaign = async (changes: Partial<Pick<GithubStarCampaign, 'enabled' | 'grantsEnabled' | 'autoApprove'>>) => {
    if (!campaign) return
    const body = { enabled: campaign.enabled, grantsEnabled: campaign.grantsEnabled, autoApprove: campaign.autoApprove, ...changes, reason: 'Điều chỉnh kill switch GitHub Star pilot', confirmed: true }
    const approval = await approve({ action: 'github_star_campaign_update', targetId: campaign.id, payload: body, title: 'Cập nhật GitHub Star pilot', summary: JSON.stringify(changes) })
    if (!approval) return
    try { const payload = await request<{ campaign: GithubStarCampaign }>('/api/admin/github-star-campaign', { method: 'PUT', headers: { 'X-Admin-Approval': approval.token }, body: approval.payloadJson }); setCampaign(payload.campaign) }
    catch (next) { setError(next instanceof Error ? next.message : 'Không thể cập nhật campaign.') }
  }
  if (authLoading) return <div className="flex min-h-screen items-center justify-center bg-bg"><Loader2 className="h-7 w-7 animate-spin" /></div>
  if (!user) return <AdminLogin />
  if (denied) return <AccessDenied message="Bạn không có quyền entitlement.manage." onLogout={() => void logout()} />
  return <AdminShell viewer={{ uid: user.uid, email: user.email }} refreshedAt={Date.now()} refreshing={loading} onRefresh={() => void load()} onLogout={() => void logout()}><main className="px-4 py-7 sm:px-6 xl:px-8"><div className="mx-auto max-w-shell"><div className="flex items-end justify-between gap-4"><div><p className="text-eyebrow text-accent-soft">Campaign acquisition</p><h1 className="mt-3 text-title-1">GitHub Star → Plus</h1><p className="mt-2 text-sm text-fg-secondary">50 claim đầu duyệt thủ công. Unstar có grace 7 ngày và chỉ revoke grant Star.</p></div><Button variant="outline" onClick={() => void load()}><RefreshCw className="h-4 w-4" />Làm mới</Button></div>{campaign && <div className="mt-5 grid gap-3 sm:grid-cols-4">{[['Campaign',campaign.enabled?'Đang mở':'Đang tắt'],['Grant',campaign.grantsEnabled?'Cho phép':'Kill switch'],['Đã duyệt',String(campaign.approvedCount)],['Giới hạn',String(campaign.maxClaims)]].map(([label,value]) => <div key={label} className="rounded-lg border border-white/10 bg-surface-1 p-4"><p className="text-xs text-fg-muted">{label}</p><p className="mt-1 font-semibold">{value}</p></div>)}</div>}{campaign && <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => void updateCampaign({ enabled: !campaign.enabled })}>{campaign.enabled ? 'Đóng campaign' : 'Mở campaign'}</Button><Button size="sm" variant="outline" onClick={() => void updateCampaign({ grantsEnabled: !campaign.grantsEnabled })}>{campaign.grantsEnabled ? 'Tắt cấp grant' : 'Bật cấp grant'}</Button><Button size="sm" variant="outline" disabled={campaign.approvedCount < campaign.manualReviewCount} onClick={() => void updateCampaign({ autoApprove: !campaign.autoApprove })}>{campaign.autoApprove ? 'Tắt tự động' : 'Bật tự động'}</Button></div>}{error && <p className="mt-4 text-sm text-bad">{error}</p>}<section className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-surface-1"><div className="divide-y divide-white/[0.07]">{claims.map((claim) => <div key={claim.id} className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><div><p className="flex items-center gap-2 font-semibold"><Github className="h-4 w-4" />@{claim.githubLogin} · {claim.status}</p><p className="mt-1 text-xs text-fg-muted">{claim.email} · GitHub ID {claim.githubId} · {claim.starVerified ? 'Star verified' : 'evidence/manual'}</p>{claim.evidencePath && <Button size="sm" variant="ghost" className="mt-2" onClick={() => void openEvidence(claim)}>Xem evidence private</Button>}{evidence?.claimId === claim.id && <img src={evidence.url} alt="Evidence GitHub Star" className="mt-3 max-h-72 rounded-lg border border-white/10 object-contain" />}</div>{['pending','needs_proof'].includes(claim.status) && <div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => void review(claim,'approve')}>Duyệt Plus</Button><Button size="sm" variant="outline" onClick={() => void review(claim,'request_proof')}>Yêu cầu proof</Button><Button size="sm" variant="destructive" onClick={() => void review(claim,'reject')}>Từ chối</Button></div>}</div>)}{!claims.length && <div className="py-16 text-center text-sm text-fg-muted">Chưa có claim.</div>}</div></section></div></main>{dialog}</AdminShell>
}
