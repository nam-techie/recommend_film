'use client'

import { ReactNode, useState } from 'react'
import { AuthPanel } from '@/components/auth/AuthPanel'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface AuthDialogProps { children?: ReactNode; defaultOpen?: boolean; onAuthenticated?: () => void }

export function AuthDialog({ children, defaultOpen = false, onAuthenticated }: AuthDialogProps) {
  const [open, setOpen] = useState(defaultOpen)
  return <Dialog open={open} onOpenChange={setOpen}>{children && <DialogTrigger asChild>{children}</DialogTrigger>}<DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-white/10 bg-[#0b0f1a] p-5 sm:max-w-md sm:p-6"><DialogTitle className="sr-only">Đăng nhập hoặc đăng ký CineMind</DialogTitle><DialogDescription className="sr-only">Đăng nhập để lưu phim, tạo phòng xem chung và đồng bộ tài khoản.</DialogDescription><AuthPanel compact onAuthenticated={() => { setOpen(false); onAuthenticated?.() }} /></DialogContent></Dialog>
}
