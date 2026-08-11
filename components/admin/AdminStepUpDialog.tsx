'use client'

import { FormEvent, useCallback, useRef, useState } from 'react'
import {
  GoogleAuthProvider,
  TotpMultiFactorGenerator,
  getMultiFactorResolver,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type MultiFactorResolver,
  type UserCredential,
} from 'firebase/auth'
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react'
import type { AdminApprovalAction } from '@/lib/admin-approval'
import { getAdminStepUpAuth } from '@/lib/admin-step-up-client'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface AdminStepUpRequest {
  action: AdminApprovalAction
  targetId: string
  payload: Record<string, unknown>
  title: string
  summary: string
}

interface PendingAdminStepUpRequest extends AdminStepUpRequest {
  payloadJson: string
}

export interface AdminStepUpApproval {
  token: string
  payloadJson: string
}

function friendlyError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'Mật khẩu không đúng.',
    'auth/invalid-verification-code': 'Mã 6 số không đúng hoặc đã hết hạn.',
    'auth/code-expired': 'Mã 6 số đã hết hạn. Hãy dùng mã mới trên ứng dụng.',
    'auth/too-many-requests': 'Bạn thử quá nhiều lần. Hãy đợi một lúc rồi thử lại.',
    'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập Google.',
    'auth/popup-blocked': 'Trình duyệt đang chặn cửa sổ Google.',
  }
  return messages[code] || (error instanceof Error ? error.message : 'Không thể xác thực thao tác.')
}

export function useAdminStepUp() {
  const { user } = useAuth()
  const [request, setRequest] = useState<PendingAdminStepUpRequest | null>(null)
  const [stage, setStage] = useState<'credential' | 'totp'>('credential')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resolver, setResolver] = useState<MultiFactorResolver | null>(null)
  const completion = useRef<((approval: AdminStepUpApproval | null) => void) | null>(null)

  const reset = useCallback(() => {
    setRequest(null); setStage('credential'); setPassword(''); setCode(''); setBusy(false); setError(null); setResolver(null)
  }, [])

  const approve = useCallback((next: AdminStepUpRequest) => new Promise<AdminStepUpApproval | null>((resolve) => {
    completion.current = resolve
    setRequest({ ...next, payloadJson: JSON.stringify(next.payload) }); setStage('credential'); setPassword(''); setCode(''); setError(null); setResolver(null)
  }), [])

  const cancel = useCallback(() => {
    completion.current?.(null); completion.current = null; reset()
  }, [reset])

  const exchangeCredential = useCallback(async (credential: UserCredential) => {
    if (!request) return
    const token = await credential.user.getIdToken(true)
    const response = await fetch('/api/admin/step-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: request.action, targetId: request.targetId, payloadJson: request.payloadJson }),
      cache: 'no-store',
    })
    const payload = await response.json().catch(() => ({})) as { approvalToken?: string; error?: string }
    await signOut(await getAdminStepUpAuth()).catch(() => undefined)
    if (!response.ok || !payload.approvalToken) throw new Error(payload.error || 'Không thể tạo xác nhận bảo mật.')
    completion.current?.({ token: payload.approvalToken, payloadJson: request.payloadJson }); completion.current = null; reset()
  }, [request, reset])

  const begin = useCallback(async (provider: 'password' | 'google') => {
    if (!user?.email) { setError('Tài khoản quản trị cần có email.'); return }
    setBusy(true); setError(null)
    try {
      const auth = await getAdminStepUpAuth()
      try {
        const credential = provider === 'google'
          ? await signInWithPopup(auth, new GoogleAuthProvider())
          : await signInWithEmailAndPassword(auth, user.email, password)
        await exchangeCredential(credential)
      } catch (nextError) {
        const errorCode = typeof nextError === 'object' && nextError && 'code' in nextError ? String(nextError.code) : ''
        if (errorCode !== 'auth/multi-factor-auth-required') throw nextError
        const nextResolver = getMultiFactorResolver(auth, nextError as never)
        const hint = nextResolver.hints.find((item) => item.factorId === TotpMultiFactorGenerator.FACTOR_ID)
        if (!hint) throw new Error('Tài khoản chưa đăng ký Google Authenticator. Hãy mở mục Bảo mật để thiết lập TOTP.')
        setResolver(nextResolver); setStage('totp')
      }
    } catch (nextError) { setError(friendlyError(nextError)) }
    finally { setBusy(false) }
  }, [exchangeCredential, password, user?.email])

  const verifyTotp = useCallback(async (event: FormEvent) => {
    event.preventDefault()
    if (!resolver || code.length !== 6) return
    setBusy(true); setError(null)
    try {
      const hint = resolver.hints.find((item) => item.factorId === TotpMultiFactorGenerator.FACTOR_ID)
      if (!hint) throw new Error('Không tìm thấy phương thức Google Authenticator.')
      const assertion = TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code)
      await exchangeCredential(await resolver.resolveSignIn(assertion))
    } catch (nextError) { setError(friendlyError(nextError)) }
    finally { setBusy(false) }
  }, [code, exchangeCredential, resolver])

  const hasPassword = user?.providerData.some((provider) => provider.providerId === 'password') ?? false
  const hasGoogle = user?.providerData.some((provider) => provider.providerId === 'google.com') ?? false

  const dialog = <Dialog open={Boolean(request)} onOpenChange={(open) => { if (!open && !busy) cancel() }}>
    <DialogContent className="border-white/10 bg-surface-1 text-fg sm:max-w-md" onEscapeKeyDown={(event) => { if (busy) event.preventDefault() }} onPointerDownOutside={(event) => { if (busy) event.preventDefault() }}>
      <DialogHeader>
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent-soft"><ShieldCheck className="h-5 w-5" /></div>
        <DialogTitle>{request?.title || 'Xác nhận thao tác'}</DialogTitle>
        <DialogDescription className="leading-6 text-fg-secondary">{request?.summary}</DialogDescription>
      </DialogHeader>
      {stage === 'credential' ? <div className="space-y-4 pt-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-fg-muted">Đăng nhập lại rồi nhập mã Google Authenticator. Xác nhận chỉ dùng được một lần và hết hạn sau 60 giây.</div>
        {hasPassword && <div className="space-y-2"><Label htmlFor="admin-step-up-password">Mật khẩu quản trị</Label><Input id="admin-step-up-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && password.length >= 6) void begin('password') }} autoFocus /></div>}
        {error && <p role="alert" className="rounded-xl border border-bad/25 bg-bad/10 p-3 text-sm text-bad">{error}</p>}
        <div className="grid gap-2">
          {hasPassword && <Button type="button" onClick={() => void begin('password')} disabled={busy || password.length < 6}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}Tiếp tục bằng mật khẩu</Button>}
          {hasGoogle && <Button type="button" variant="outline" onClick={() => void begin('google')} disabled={busy}>Tiếp tục bằng Google</Button>}
          {!hasPassword && !hasGoogle && <p className="text-sm text-bad">Tài khoản cần liên kết mật khẩu hoặc Google để xác thực lại.</p>}
        </div>
      </div> : <form onSubmit={(event) => void verifyTotp(event)} className="space-y-4 pt-2">
        <div className="space-y-2"><Label htmlFor="admin-step-up-code">Mã Google Authenticator</Label><Input id="admin-step-up-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="h-14 text-center font-mono text-2xl tracking-[0.35em]" autoFocus /></div>
        <p className="text-xs leading-5 text-fg-muted">Mã đổi khoảng mỗi 30 giây. Nếu sắp đổi, hãy chờ mã mới rồi nhập.</p>
        {error && <p role="alert" className="rounded-xl border border-bad/25 bg-bad/10 p-3 text-sm text-bad">{error}</p>}
        <Button type="submit" className="h-11 w-full" disabled={busy || code.length !== 6}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}Xác nhận mã 6 số</Button>
      </form>}
    </DialogContent>
  </Dialog>

  return { approve, dialog }
}
