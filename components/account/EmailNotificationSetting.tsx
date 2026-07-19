'use client'

import { Mail } from 'lucide-react'
import { useAccount } from '@/hooks/useAccount'

export function EmailNotificationSetting() {
  const account = useAccount()
  return <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5"><Mail className="h-5 w-5 text-purple-300" /></span>
    <span className="min-w-0 flex-1"><span className="block text-sm font-medium">Email mời xem chung</span><span className="mt-1 block text-xs text-slate-500">Nhận thêm email khi bạn bè mời bạn vào phòng.</span></span>
    <input type="checkbox" checked={account.settings.emailNotifications} onChange={(event) => void account.updateSettings({ ...account.settings, emailNotifications: event.target.checked, updatedAt: Date.now() })} className="h-5 w-5 accent-purple-500" />
  </label>
}
