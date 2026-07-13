'use client'

import { ReactNode, useState } from 'react'
import { Eye, EyeOff, Loader2, LogIn, UserPlus } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AuthDialog({ children }: { children: ReactNode }) {
  const { signInWithGoogle, signInWithEmail, registerWithEmail, resetPassword, configured } = useAuth()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const run = async (action: () => Promise<unknown>, close = true) => {
    setBusy(true); setError(null); setNotice(null)
    try { await action(); if (close) setOpen(false) }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Không thể xác thực tài khoản.') }
    finally { setBusy(false) }
  }

  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild>{children}</DialogTrigger><DialogContent className="border-white/10 bg-[#111522] sm:max-w-md">
    <DialogHeader><DialogTitle className="text-2xl text-white">{mode === 'login' ? 'Đăng nhập CineMind' : 'Tạo tài khoản CineMind'}</DialogTitle><DialogDescription>Đăng nhập để tạo phòng, lấy lại quyền host và đồng bộ lịch sử xem.</DialogDescription></DialogHeader>
    <div className="grid grid-cols-2 rounded-lg bg-black/30 p-1"><Button type="button" variant={mode === 'login' ? 'default' : 'ghost'} onClick={() => { setMode('login'); setError(null) }}>Đăng nhập</Button><Button type="button" variant={mode === 'register' ? 'default' : 'ghost'} onClick={() => { setMode('register'); setError(null) }}>Đăng ký</Button></div>
    {!configured && <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">Thiếu biến môi trường Firebase phía client. Xem WATCH_PARTY_SETUP.md.</p>}
    <Button type="button" variant="outline" className="h-12 bg-white text-gray-900 hover:bg-gray-100" disabled={busy || !configured} onClick={() => void run(signInWithGoogle)}>Tiếp tục với Google</Button>
    <div className="flex items-center gap-3 text-xs text-gray-500"><span className="h-px flex-1 bg-white/10" />hoặc<span className="h-px flex-1 bg-white/10" /></div>
    <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (mode === 'login') void run(() => signInWithEmail(email, password)); else void run(() => registerWithEmail(name, email, password)) }}>
      {mode === 'register' && <div className="space-y-2"><Label htmlFor="auth-name">Tên hiển thị</Label><Input id="auth-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={30} required placeholder="Tên của bạn" /></div>}
      <div className="space-y-2"><Label htmlFor="auth-email">Email</Label><Input id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" placeholder="email@example.com" /></div>
      <div className="space-y-2"><div className="flex justify-between"><Label htmlFor="auth-password">Mật khẩu</Label>{mode === 'login' && <button type="button" className="text-xs text-purple-300 hover:underline" disabled={!email || busy} onClick={() => void run(async () => { await resetPassword(email); setNotice('Đã gửi email đặt lại mật khẩu. Hãy kiểm tra hộp thư.'); }, false)}>Quên mật khẩu?</button>}</div><div className="relative"><Input id="auth-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Ít nhất 6 ký tự" /><button type="button" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
      {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}{notice && <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</p>}
      <Button type="submit" className="h-12 w-full" disabled={busy || !configured || !email || password.length < 6 || (mode === 'register' && !name.trim())}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'login' ? <><LogIn className="mr-2 h-4 w-4" />Đăng nhập</> : <><UserPlus className="mr-2 h-4 w-4" />Tạo tài khoản</>}</Button>
    </form>
  </DialogContent></Dialog>
}
