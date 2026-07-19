'use client'

import Link from 'next/link'
import { Film, Github, Instagram, Linkedin, Mail, MessageCircle, Music2 } from 'lucide-react'

const socialLinks = [
  { href: 'https://github.com/nam-techie', label: 'GitHub', icon: Github },
  { href: 'https://www.linkedin.com/in/nam-ph%C6%B0%C6%A1ng-4a3503309', label: 'LinkedIn', icon: Linkedin },
  { href: 'https://www.instagram.com/pwanm.ie?igsh=MXVzdTltMjlhN3dxeA==', label: 'Instagram', icon: Instagram },
  { href: 'https://www.threads.com/@pwanm.ie', label: 'Threads', icon: MessageCircle },
  { href: 'https://open.spotify.com/user/317shpyjqyc7fn3nxgonfaaa7hqe', label: 'Spotify', icon: Music2 },
  { href: 'mailto:nam.dpwork04@gmail.com', label: 'Email', icon: Mail },
]

export default function Footer() {
  return <footer className="relative mt-12 overflow-hidden border-t border-white/[0.06] bg-[#07080d] text-white sm:mt-16">
    <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-200"><span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />Phim hay, cảm xúc đúng</div>

      <div className="mt-7 flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 shadow-[0_0_28px_rgba(168,85,247,.3)]"><Film className="h-6 w-6" /></span><div><p className="text-2xl font-black tracking-tight">CineMind</p><p className="text-sm text-slate-500">Cinema meets Mind</p></div></div>
        <div className="flex flex-wrap gap-2">{socialLinks.map(({ href, label, icon: Icon }) => <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined} aria-label={label} title={label} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.045] text-slate-400 transition hover:-translate-y-0.5 hover:bg-white/10 hover:text-white"><Icon className="h-4 w-4" /></a>)}</div>
      </div>

      <nav className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/[0.06] pt-7 text-sm font-medium text-slate-300" aria-label="Liên kết cuối trang">
        <Link href="/">Trang chủ</Link><Link href="/ai-recommender">AI gợi ý phim</Link><Link href="/watch-party">Xem chung</Link><Link href="/genres">Thể loại</Link><Link href="/countries">Quốc gia</Link><Link href="/privacy">Chính sách bảo mật</Link><Link href="/terms">Điều khoản sử dụng</Link>
      </nav>

      <p className="mt-6 max-w-3xl text-sm leading-7 text-slate-500">CineMind giúp bạn khám phá phim theo cảm xúc, lưu danh sách yêu thích và xem chung cùng bạn bè. Nội dung phim được tổng hợp từ các nguồn công khai; CineMind không lưu trữ video trên máy chủ.</p>
      <div className="mt-7 flex flex-col gap-2 border-t border-white/[0.06] pt-5 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} CineMind</p><p>Powered by PhimAPI · Made for movie lovers</p></div>
    </div>
  </footer>
}
