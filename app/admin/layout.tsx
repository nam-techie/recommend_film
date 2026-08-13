import type { ReactNode } from 'react'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-bg">
    <a href="#admin-main" className="sr-only rounded-md bg-accent px-4 py-2 font-semibold text-accent-fg focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100]">
      Bỏ qua điều hướng, tới nội dung quản trị
    </a>
    {children}
  </div>
}
