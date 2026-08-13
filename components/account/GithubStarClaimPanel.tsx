'use client'

import { useEffect, useState } from 'react'
import { Github, Loader2, Star } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { GithubStarClaim } from '@/lib/github-star'

export function GithubStarClaimPanel() {
  const { user } = useAuth()
  const [claim, setClaim] = useState<GithubStarClaim | null>(null)
  const [login, setLogin] = useState('')
  const [evidence, setEvidence] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => { if (!user) return; void user.getIdToken().then((token) => fetch('/api/me/github-star-claims', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })).then((response) => response.json()).then((payload) => setClaim(payload.claim || null)).catch(() => undefined) }, [user])
  const submit = async () => {
    if (!user || !login.trim()) return
    setBusy(true); setMessage(null)
    try {
      const form = new FormData(); form.set('githubLogin', login.trim()); if (evidence) form.set('evidence', evidence)
      const response = await fetch('/api/me/github-star-claims', { method: 'POST', headers: { Authorization: `Bearer ${await user.getIdToken()}` }, body: form })
      const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'Không thể gửi yêu cầu.')
      setClaim(payload.claim); setMessage('Đã gửi yêu cầu. 50 claim đầu được admin duyệt thủ công.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể gửi yêu cầu.') }
    finally { setBusy(false) }
  }
  if (!user || user.isAnonymous) return null
  return <section className="rounded-xl border border-white/10 bg-white/[0.035] p-5"><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-950"><Github className="h-5 w-5" /></span><div><h2 className="font-semibold">Star repo nhận CinePass Plus 1 năm</h2><p className="mt-1 text-xs leading-5 text-fg-muted">Pilot tối đa 500 claim hoặc 90 ngày. Nếu Unstar, bạn có 7 ngày để Star lại trước khi grant Star bị thu hồi.</p></div></div>
    {claim ? <div className="mt-4 rounded-lg border border-accent/20 bg-accent/[0.06] p-4 text-sm"><p className="font-semibold">@{claim.githubLogin} · {claim.status}</p><p className="mt-1 text-fg-secondary">{claim.starVerified ? 'Webhook/API đã xác minh Star.' : 'Đang chờ admin kiểm tra ảnh và trạng thái repo.'}</p></div> : <><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="github-login">GitHub username</Label><Input id="github-login" value={login} onChange={(event) => setLogin(event.target.value)} placeholder="ví dụ: nam-techie" /></div><div className="space-y-2"><Label htmlFor="github-evidence">Ảnh chụp đã Star</Label><Input id="github-evidence" type="file" accept="image/*" onChange={(event) => setEvidence(event.target.files?.[0] || null)} /></div></div><div className="mt-4 flex flex-wrap gap-2"><Button asChild variant="outline"><a href="https://github.com/nam-techie/recommend_film" target="_blank" rel="noreferrer"><Star className="h-4 w-4" />Mở repo để Star</a></Button><Button disabled={busy || !login.trim() || !user.emailVerified} onClick={() => void submit()}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Gửi xác minh</Button></div></>}
    {message && <p className="mt-3 text-sm text-fg-secondary">{message}</p>}
  </section>
}
