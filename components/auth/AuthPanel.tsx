'use client'

import { KeyboardEvent, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, Check, Eye, EyeOff, Loader2, LockKeyhole, LogIn, Mail, ShieldCheck, UserPlus } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type AuthMode = 'login' | 'register' | 'forgot'

export function AuthPanel({ initialMode = 'login', compact = false, onAuthenticated }: { initialMode?: AuthMode; compact?: boolean; onAuthenticated?: () => void }) {
  const { configured, registerWithEmail, resetPassword, signInWithEmail, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const passwordChecks = useMemo(() => [
    { label: 'Ít nhất 8 ký tự', ok: password.length >= 8 },
    { label: 'Có chữ và số', ok: /[a-zA-ZÀ-ỹ]/.test(password) && /\d/.test(password) },
    { label: 'Hai mật khẩu khớp', ok: Boolean(confirmation) && password === confirmation },
  ], [confirmation, password])
  const registerValid = name.trim().length >= 2 && /\S+@\S+\.\S+/.test(email) && passwordChecks.every((item) => item.ok) && termsAccepted

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true); setError(null); setNotice(null)
    try { await action(); onAuthenticated?.() }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Không thể xác thực tài khoản.') }
    finally { setBusy(false) }
  }

  const submit = async () => {
    if (mode === 'forgot') {
      await run(async () => { await resetPassword(email); setNotice('Nếu email này có tài khoản, hướng dẫn đặt lại mật khẩu đã được gửi.'); setBusy(false) })
      return
    }
    if (mode === 'login') { await run(() => signInWithEmail(email, password)); return }
    if (!registerValid) return
    await run(async () => { await registerWithEmail(name, email, password) })
  }

  const switchMode = (next: AuthMode) => { setMode(next); setError(null); setNotice(null); setPassword(''); setConfirmation('') }
  const onPasswordKey = (event: KeyboardEvent<HTMLInputElement>) => setCapsLock(event.getModifierState('CapsLock'))

  return <div className={cn('w-full text-white', !compact && 'rounded-3xl border border-white/10 bg-[#0b0f1a] p-5 shadow-2xl sm:p-8')}>
    <div className="mb-6 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-300"><ShieldCheck className="h-6 w-6" /></div>
      <h1 className="text-2xl font-bold">{mode === 'login' ? 'Chào mừng trở lại' : mode === 'register' ? 'Tạo tài khoản CineMind' : 'Đặt lại mật khẩu'}</h1>
      <p className="mt-2 text-sm text-slate-400">{mode === 'forgot' ? 'Nhập email để nhận hướng dẫn khôi phục.' : 'Lưu phim, đồng bộ lịch sử và kết nối với bạn xem.'}</p>
    </div>

    {mode !== 'forgot' && <div className="mb-5 grid grid-cols-2 rounded-xl bg-black/35 p-1" role="tablist" aria-label="Phương thức xác thực"><button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => switchMode('login')} className={cn('h-10 rounded-lg text-sm font-medium transition', mode === 'login' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white')}>Đăng nhập</button><button type="button" role="tab" aria-selected={mode === 'register'} onClick={() => switchMode('register')} className={cn('h-10 rounded-lg text-sm font-medium transition', mode === 'register' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white')}>Đăng ký</button></div>}
    {mode === 'forgot' && <button type="button" onClick={() => switchMode('login')} className="mb-5 inline-flex items-center gap-2 text-sm text-purple-300 hover:text-purple-200"><ArrowLeft className="h-4 w-4" />Quay lại đăng nhập</button>}

    {!configured && <p role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">Dịch vụ tài khoản chưa được cấu hình.</p>}
    {mode !== 'forgot' && <><Button type="button" variant="outline" disabled={busy || !configured} onClick={() => void run(signInWithGoogle)} className="h-12 w-full border-white/15 bg-white text-slate-900 hover:bg-slate-100"><span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full border text-xs font-black text-blue-600">G</span>Tiếp tục với Google</Button><div className="my-5 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-white/10" />hoặc dùng email<span className="h-px flex-1 bg-white/10" /></div></>}

    <form className="space-y-4" noValidate onSubmit={(event) => { event.preventDefault(); void submit() }}>
      {mode === 'register' && <div className="space-y-2"><Label htmlFor="account-name">Tên hiển thị</Label><div className="relative"><UserPlus className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><Input id="account-name" value={name} onChange={(event) => setName(event.target.value.slice(0, 40))} autoComplete="name" placeholder="Tên mọi người sẽ thấy" className="h-12 pl-10" /></div></div>}
      <div className="space-y-2"><Label htmlFor="account-email">Email</Label><div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><Input id="account-email" value={email} onChange={(event) => setEmail(event.target.value.trimStart())} type="email" autoComplete="email" placeholder="email@example.com" className="h-12 pl-10" /></div></div>
      {mode !== 'forgot' && <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="account-password">Mật khẩu</Label>{mode === 'login' && <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-purple-300 hover:text-purple-200">Quên mật khẩu?</button>}</div><div className="relative"><LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><Input id="account-password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyUp={onPasswordKey} onKeyDown={onPasswordKey} type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'register' ? 'Ít nhất 8 ký tự' : 'Nhập mật khẩu'} className="h-12 px-10" /><button type="button" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPassword((value) => !value)} className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>{capsLock && <p className="text-xs text-amber-300">Caps Lock đang bật.</p>}</div>}
      {mode === 'register' && <><div className="space-y-2"><Label htmlFor="account-confirmation">Xác nhận mật khẩu</Label><Input id="account-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} type={showPassword ? 'text' : 'password'} autoComplete="new-password" className="h-12" /></div><div className="grid gap-1.5 text-xs">{passwordChecks.map((item) => <span key={item.label} className={cn('flex items-center gap-2', item.ok ? 'text-emerald-300' : 'text-slate-500')}><Check className="h-3.5 w-3.5" />{item.label}</span>)}</div><label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-3 text-xs text-slate-300"><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-0.5 h-4 w-4 accent-purple-500" /><span>Tôi đồng ý với <Link href="/terms" className="text-purple-300 hover:underline">Điều khoản</Link> và <Link href="/privacy" className="text-purple-300 hover:underline">Chính sách riêng tư</Link>.</span></label></>}
      {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</p>}
      <Button type="submit" disabled={busy || !configured || !email || (mode === 'login' && password.length < 6) || (mode === 'register' && !registerValid)} className="h-12 w-full bg-purple-600 hover:bg-purple-500">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === 'login' ? <><LogIn className="mr-2 h-4 w-4" />Đăng nhập</> : mode === 'register' ? <><UserPlus className="mr-2 h-4 w-4" />Tạo tài khoản</> : <><Mail className="mr-2 h-4 w-4" />Gửi hướng dẫn</>}</Button>
    </form>
  </div>
}
