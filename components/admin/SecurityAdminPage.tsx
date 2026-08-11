'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  TotpMultiFactorGenerator,
  multiFactor,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  type TotpSecret,
} from 'firebase/auth'
import QRCode from 'qrcode'
import { CheckCircle2, Copy, KeyRound, Loader2, QrCode, RefreshCw, ShieldCheck } from 'lucide-react'
import { AccessDenied, AdminLogin, AdminShell } from '@/components/admin/AdminShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAdminApi } from '@/hooks/useAdminApi'

function securityError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'Mật khẩu hiện tại không đúng.',
    'auth/invalid-verification-code': 'Mã 6 số không đúng hoặc đã hết hạn.',
    'auth/code-expired': 'Mã đã hết hạn. Hãy nhập mã mới trên ứng dụng.',
    'auth/requires-recent-login': 'Phiên đăng nhập đã cũ. Hãy đăng xuất rồi đăng nhập lại.',
    'auth/operation-not-allowed': 'TOTP chưa được bật trong Firebase Authentication/Identity Platform.',
    'auth/unsupported-first-factor': 'Nhà cung cấp đăng nhập này chưa hỗ trợ đăng ký TOTP.',
  }
  return messages[code] || (error instanceof Error ? error.message : 'Không thể thiết lập Google Authenticator.')
}

export function SecurityAdminPage() {
  const { user, loading: authLoading, logout, request, denied } = useAdminApi()
  const [authorized, setAuthorized] = useState(false)
  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState('')
  const [secret, setSecret] = useState<TotpSecret | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const verifyAccess = useCallback(async () => {
    if (!user) return
    setChecking(true)
    try { await request('/api/admin/dashboard'); setAuthorized(true) }
    catch { setAuthorized(false) }
    finally { setChecking(false) }
  }, [request, user])

  useEffect(() => {
    if (user) void verifyAccess()
    else setChecking(false)
  }, [user, verifyAccess])

  const enrolled = useMemo(() => user ? multiFactor(user).enrolledFactors.find((factor) => factor.factorId === TotpMultiFactorGenerator.FACTOR_ID) : null, [user, notice])
  const hasPassword = user?.providerData.some((provider) => provider.providerId === 'password') ?? false
  const hasGoogle = user?.providerData.some((provider) => provider.providerId === 'google.com') ?? false

  const generate = async (provider: 'password' | 'google') => {
    if (!user || !user.email) return
    if (!user.emailVerified) { setError('Hãy xác minh email quản trị trước khi bật Google Authenticator.'); return }
    setBusy(true); setError(null); setNotice(null)
    try {
      if (provider === 'password') await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password))
      else await reauthenticateWithPopup(user, new GoogleAuthProvider())
      const nextSecret = await TotpMultiFactorGenerator.generateSecret(await multiFactor(user).getSession())
      const uri = nextSecret.generateQrCodeUrl(user.email, 'CineMind Admin')
      setSecret(nextSecret)
      setQrDataUrl(await QRCode.toDataURL(uri, { width: 280, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#11111a', light: '#ffffff' } }))
    } catch (nextError) { setError(securityError(nextError)) }
    finally { setBusy(false) }
  }

  const enroll = async (event: FormEvent) => {
    event.preventDefault()
    if (!user || !secret || code.length !== 6) return
    setBusy(true); setError(null)
    try {
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, code)
      await multiFactor(user).enroll(assertion, 'CineMind Admin Authenticator')
      await user.getIdToken(true)
      setNotice('Đã bật Google Authenticator cho tài khoản quản trị.')
      setSecret(null); setQrDataUrl(''); setCode(''); setPassword('')
    } catch (nextError) { setError(securityError(nextError)) }
    finally { setBusy(false) }
  }

  const copySecret = async () => {
    if (!secret) return
    await navigator.clipboard.writeText(secret.secretKey)
    setNotice('Đã sao chép khóa thiết lập thủ công.')
  }

  const handleLogout = () => { void logout().catch(() => undefined) }
  if (authLoading || checking) return <div className="flex min-h-screen items-center justify-center bg-bg"><Loader2 className="h-7 w-7 animate-spin text-accent" /></div>
  if (!user) return <AdminLogin />
  if (denied || !authorized) return <AccessDenied message="Tài khoản này không có quyền thay đổi bảo mật quản trị." onLogout={handleLogout} />

  return <AdminShell viewer={{ uid: user.uid, email: user.email }} refreshedAt={Date.now()} refreshing={busy} onRefresh={() => void verifyAccess()} onLogout={handleLogout}>
    <main className="px-4 py-7 sm:px-6 xl:px-8"><div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-eyebrow text-accent-soft">Admin security</p><h1 className="mt-3 text-title-1">Xác thực hai bước</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-fg-secondary">Liên kết Google Authenticator bằng QR. Mã TOTP gồm 6 số và tự đổi khoảng mỗi 30 giây.</p></div><Button variant="outline" onClick={() => void verifyAccess()} disabled={busy}><RefreshCw className="h-4 w-4" />Kiểm tra lại</Button></div>
      {(error || notice) && <p role={error ? 'alert' : 'status'} className={`rounded-xl border p-4 text-sm ${error ? 'border-bad/25 bg-bad/10 text-bad' : 'border-ok/25 bg-ok/10 text-ok'}`}>{error || notice}</p>}

      {enrolled ? <section className="rounded-2xl border border-ok/25 bg-surface-1 p-6 shadow-card"><div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ok/15 text-ok"><CheckCircle2 className="h-6 w-6" /></span><div><h2 className="text-lg font-bold">Google Authenticator đang bật</h2><p className="mt-2 text-sm leading-6 text-fg-secondary">Tên thiết bị: {enrolled.displayName || 'CineMind Admin Authenticator'}. Từ bây giờ đăng nhập admin và các thao tác quan trọng sẽ yêu cầu mã 6 số.</p><p className="mt-3 text-xs text-fg-muted">V1 không cho gỡ TOTP trong giao diện để tránh vô tình làm mất lớp bảo vệ. Việc khôi phục phải thực hiện bằng tài khoản break-glass hoặc Firebase Console.</p></div></div></section> : !secret ? <section className="grid gap-6 rounded-2xl border border-white/[0.08] bg-surface-1 p-6 shadow-card md:grid-cols-[1fr_0.9fr]"><div><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent-soft"><ShieldCheck className="h-6 w-6" /></span><h2 className="mt-5 text-xl font-bold">Bật Google Authenticator</h2><p className="mt-3 text-sm leading-6 text-fg-secondary">Xác thực lại danh tính trước khi CineMind tạo QR. Khóa bí mật chỉ tồn tại trong bước thiết lập này và không được lưu bởi ứng dụng.</p><ul className="mt-5 space-y-2 text-sm text-fg-secondary"><li>1. Xác thực lại bằng mật khẩu hoặc Google.</li><li>2. Quét QR trong Google Authenticator.</li><li>3. Nhập mã 6 số đầu tiên để hoàn tất.</li></ul></div><div className="space-y-4 rounded-xl border border-white/10 bg-black/20 p-5">{hasPassword && <div className="space-y-2"><Label htmlFor="security-password">Mật khẩu hiện tại</Label><Input id="security-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></div>}{hasPassword && <Button className="w-full" onClick={() => void generate('password')} disabled={busy || password.length < 6}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}Xác thực bằng mật khẩu</Button>}{hasGoogle && <Button className="w-full" variant="outline" onClick={() => void generate('google')} disabled={busy}>Xác thực bằng Google</Button>}{!hasPassword && !hasGoogle && <p className="text-sm text-bad">Tài khoản cần liên kết mật khẩu hoặc Google.</p>}</div></section> : <section className="grid gap-6 rounded-2xl border border-accent/25 bg-surface-1 p-6 shadow-card md:grid-cols-[320px_1fr]"><div className="rounded-2xl bg-white p-4">{qrDataUrl ? <img src={qrDataUrl} alt="QR thiết lập Google Authenticator cho CineMind Admin" className="mx-auto aspect-square w-full" /> : <div className="flex aspect-square items-center justify-center"><QrCode className="h-10 w-10 text-black" /></div>}</div><form onSubmit={(event) => void enroll(event)} className="space-y-5"><div><h2 className="text-xl font-bold">Quét QR và xác minh</h2><p className="mt-2 text-sm leading-6 text-fg-secondary">Trong Google Authenticator, chọn dấu +, chọn quét mã QR, sau đó nhập mã đang hiển thị.</p></div><div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-xs text-fg-muted">Không quét được? Nhập khóa thủ công:</p><div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 break-all text-xs text-fg-secondary">{secret.secretKey}</code><Button type="button" size="icon" variant="ghost" onClick={() => void copySecret()} aria-label="Sao chép khóa"><Copy className="h-4 w-4" /></Button></div></div><div className="space-y-2"><Label htmlFor="security-totp">Mã 6 số</Label><Input id="security-totp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="h-14 text-center font-mono text-2xl tracking-[0.35em]" autoFocus /></div><Button type="submit" className="h-12 w-full" disabled={busy || code.length !== 6}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}Hoàn tất thiết lập</Button><Button type="button" variant="ghost" className="w-full" onClick={() => { setSecret(null); setQrDataUrl(''); setCode('') }} disabled={busy}>Hủy QR này</Button></form></section>}
    </div></main>
  </AdminShell>
}
