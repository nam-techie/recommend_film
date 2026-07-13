'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Bell, Bookmark, ChevronDown, Film, Globe, Grid3X3, History, Home, LogOut, Menu, Search, Settings, Sparkles, Tv, UserRound, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { AuthDialog } from '@/components/auth/AuthDialog'
import { useAccount } from '@/hooks/useAccount'
import { AccountAvatar } from '@/components/account/AccountAvatar'

const Navbar = () => {
    const pathname = usePathname()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [accountOpen, setAccountOpen] = useState(false)
    const accountMenuRef = useRef<HTMLDivElement>(null)
    const { user, loading: authLoading, logout } = useAuth()
    const account = useAccount()

    useEffect(() => setAccountOpen(false), [pathname])
    useEffect(() => {
        const close = (event: PointerEvent) => { if (!accountMenuRef.current?.contains(event.target as Node)) setAccountOpen(false) }
        document.addEventListener('pointerdown', close)
        return () => document.removeEventListener('pointerdown', close)
    }, [])

    const navItems = [
        { href: '/', label: 'Trang chủ', icon: Home },
        { href: '/search', label: 'Tìm kiếm', icon: Search },
        { href: '/countries', label: 'Quốc gia', icon: Globe },
        { href: '/tv-series', label: 'Phim bộ', icon: Tv },
        { href: '/watch-party', label: 'Xem chung', icon: Grid3X3 },
        { href: '/ai-recommender', label: 'AI Recommender', icon: Sparkles },
    ]

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen)
    }

    return (
        <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-primary to-purple-600 shadow-lg">
                            <Film className="h-6 w-6 text-white" />
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="text-xl font-bold shiny-text">
                                CineMind
                            </h1>
                            <p className="text-xs text-muted-foreground hidden lg:block">Cinema meets Mind</p>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center space-x-2">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href
                            return (
                                <Link key={item.href} href={item.href}>
                                    <Button
                                        variant={isActive ? "default" : "ghost"}
                                        size="sm"
                                        className={`flex items-center space-x-2 px-4 py-2 ${
                                            isActive 
                                                ? "bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg" 
                                                : "hover:bg-accent"
                                        }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        <span className="text-sm font-medium">{item.label}</span>
                                    </Button>
                                </Link>
                            )
                        })}
                    </div>

                    {/* Right side controls */}
                    <div className="flex items-center space-x-3">
                        {!authLoading && (user ? (
                            <div ref={accountMenuRef} className="relative">
                                <Button variant="outline" size="sm" aria-haspopup="menu" aria-expanded={accountOpen} onClick={() => setAccountOpen((value) => !value)} className="h-11 gap-2 rounded-full px-2 sm:px-3">
                                    <AccountAvatar name={account.profile?.displayName || user.displayName || user.email || 'Tài khoản'} src={account.profile?.avatar || user.photoURL} className="h-7 w-7 text-[9px]" />
                                    <span className="hidden max-w-28 truncate sm:inline">{account.profile?.displayName || user.displayName || 'Tài khoản'}</span>
                                    <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
                                    {account.unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-purple-500 px-1 text-[10px] font-bold text-white">{Math.min(99, account.unreadCount)}</span>}
                                </Button>
                                {accountOpen && <div role="menu" className="absolute right-0 top-[calc(100%+0.6rem)] z-50 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#101522] p-2 text-white shadow-2xl">
                                    <div className="flex items-center gap-3 border-b border-white/10 px-2 pb-3 pt-1"><AccountAvatar name={account.profile?.displayName || user.displayName || 'Tài khoản'} src={account.profile?.avatar || user.photoURL} className="h-10 w-10 text-xs" /><div className="min-w-0"><p className="truncate text-sm font-semibold">{account.profile?.displayName || user.displayName}</p><p className="truncate text-xs text-slate-500">{account.profile ? `@${account.profile.username}` : user.email}</p></div></div>
                                    <div className="py-2">{[{ href: account.profile && !account.degraded ? `/u/${account.profile.username}` : '/account', label: 'Xem hồ sơ', icon: UserRound }, { href: '/account', label: 'Tài khoản', icon: Settings }, { href: '/history', label: 'Lịch sử xem', icon: History }, { href: '/account', label: 'Danh sách phim', icon: Bookmark }].map((item) => <Link key={`${item.href}:${item.label}`} href={item.href} role="menuitem" className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm text-slate-300 hover:bg-white/[0.06] hover:text-white"><item.icon className="h-4 w-4" />{item.label}</Link>)}</div>
                                    <Link href="/account" className="flex min-h-10 items-center gap-3 rounded-xl border-t border-white/10 px-3 pt-2 text-sm text-slate-300 hover:text-white"><Bell className="h-4 w-4" />Thông báo{account.unreadCount > 0 && <span className="ml-auto rounded-full bg-purple-500 px-2 py-0.5 text-[10px] font-bold">{account.unreadCount}</span>}</Link>
                                    <button type="button" role="menuitem" onClick={() => void logout()} className="mt-1 flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm text-red-300 hover:bg-red-500/10"><LogOut className="h-4 w-4" />Đăng xuất</button>
                                </div>}
                            </div>
                        ) : (
                            <AuthDialog><Button size="sm">Đăng nhập</Button></AuthDialog>
                        ))}
                        {/* Mobile Menu Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleMobileMenu}
                            className="lg:hidden h-10 w-10"
                        >
                            {mobileMenuOpen ? (
                                <X className="h-5 w-5" />
                            ) : (
                                <Menu className="h-5 w-5" />
                            )}
                        </Button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {mobileMenuOpen && (
                    <div className="lg:hidden pb-4 border-t mt-2 pt-4 bg-background/95 backdrop-blur-sm">
                        <div className="grid grid-cols-2 gap-3">
                            {navItems.map((item) => {
                                const Icon = item.icon
                                const isActive = pathname === item.href
                                return (
                                    <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                                        <Button
                                            variant={isActive ? "default" : "ghost"}
                                            size="sm"
                                            className={`w-full flex items-center space-x-2 justify-start px-4 py-3 ${
                                                isActive 
                                                    ? "bg-gradient-to-r from-primary to-purple-600 text-white" 
                                                    : "hover:bg-accent"
                                            }`}
                                        >
                                            <Icon className="h-4 w-4" />
                                            <span className="text-sm font-medium">{item.label}</span>
                                        </Button>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Tablet Navigation */}
                <div className="hidden sm:block lg:hidden pb-3">
                    <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href
                            return (
                                <Link key={item.href} href={item.href}>
                                    <Button
                                        variant={isActive ? "default" : "ghost"}
                                        size="sm"
                                        className={`flex items-center space-x-2 whitespace-nowrap px-3 py-2 ${
                                            isActive 
                                                ? "bg-gradient-to-r from-primary to-purple-600 text-white" 
                                                : "hover:bg-accent"
                                        }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        <span className="text-sm">{item.label}</span>
                                    </Button>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </div>
        </nav>
    )
}

export default Navbar
