'use client'

import React from 'react'
import { Film, Moon, Sun, Home, Search, Star, Sparkles, TrendingUp, Calendar } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const Navbar = () => {
    const { theme, setTheme } = useTheme()
    const pathname = usePathname()

    const navItems = [
        { href: '/', label: 'Trang chủ', icon: Home },
        { href: '/search', label: 'Tìm kiếm', icon: Search },
        { href: '/trending', label: 'Thịnh hành', icon: TrendingUp },
        { href: '/new-releases', label: 'Mới nhất', icon: Calendar },
        { href: '/top-rated', label: 'Đánh giá cao', icon: Star },
        { href: '/ai-recommender', label: 'AI Recommender', icon: Sparkles },
    ]

    return (
        <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-2">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-r from-primary to-purple-600">
                            <Film className="h-6 w-6 text-white" />
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="text-xl font-bold shiny-text">
                                CineMind
                            </h1>
                            <p className="text-xs text-muted-foreground">Cinema meets Mind</p>
                        </div>
                    </Link>

                    {/* Navigation Items - Desktop */}
                    <div className="hidden lg:flex items-center space-x-1">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href
                            return (
                                <Link key={item.href} href={item.href}>
                                    <Button
                                        variant={isActive ? "default" : "ghost"}
                                        size="sm"
                                        className={`flex items-center space-x-2 ${
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

                    {/* Theme Toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                        className="shiny-button rounded-full h-10 w-10"
                    >
                        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>
                </div>

                {/* Mobile Navigation */}
                <div className="lg:hidden pb-3">
                    <div className="flex items-center space-x-1 overflow-x-auto">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href
                            return (
                                <Link key={item.href} href={item.href}>
                                    <Button
                                        variant={isActive ? "default" : "ghost"}
                                        size="sm"
                                        className={`flex items-center space-x-1 whitespace-nowrap ${
                                            isActive 
                                                ? "bg-gradient-to-r from-primary to-purple-600 text-white" 
                                                : "hover:bg-accent"
                                        }`}
                                    >
                                        <Icon className="h-3 w-3" />
                                        <span className="text-xs">{item.label}</span>
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