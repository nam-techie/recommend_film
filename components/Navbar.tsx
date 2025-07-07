'use client'

import React, { useState } from 'react'
import { Film, Moon, Sun, Home, Search, Star, Sparkles, TrendingUp, Calendar, Menu, X, Globe, Tv, Grid3X3 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const Navbar = () => {
    const { theme, setTheme } = useTheme()
    const pathname = usePathname()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const navItems = [
        { href: '/', label: 'Trang chủ', icon: Home },
        { href: '/search', label: 'Tìm kiếm', icon: Search },
        { href: '/countries', label: 'Quốc gia', icon: Globe },
        { href: '/tv-series', label: 'Phim bộ', icon: Tv },
        { href: '/genres', label: 'Xem chung', icon: Grid3X3 },
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
                        {/* Theme Toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                            className="shiny-button rounded-full h-10 w-10 hover:bg-accent"
                        >
                            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                            <span className="sr-only">Toggle theme</span>
                        </Button>

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