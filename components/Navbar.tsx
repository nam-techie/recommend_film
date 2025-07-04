'use client'

import React from 'react'
import { Film, Moon, Sun } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"

// Component RotatingText để tạo hiệu ứng xoay chữ
const RotatingText = () => {
    const words = ['nam-techie', 'developer', 'creator', 'innovator']
    const [index, setIndex] = React.useState(0)

    React.useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % words.length)
        }, 2000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="relative h-6 overflow-hidden">
            {words.map((word, i) => (
                <span
                    key={word}
                    className={`absolute w-full text-right transition-transform duration-500 ${
                        i === index 
                            ? 'translate-y-0 opacity-100'
                            : 'translate-y-8 opacity-0'
                    } bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent font-bold`}
                >
                    {word}
                </span>
            ))}
        </div>
    )
}

const Navbar = () => {
    const { theme, setTheme } = useTheme()

    return (
        <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center space-x-2">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-r from-primary to-purple-600">
                            <Film className="h-6 w-6 text-white" />
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="text-xl font-bold shiny-text">
                                CineMind
                            </h1>
                            <p className="text-xs text-muted-foreground">Cinema meets Mind</p>
                        </div>
                    </div>

                    {/* Theme Toggle and Username */}
                    <div className="flex items-center space-x-4">
                        <div className="hidden sm:block w-32">
                            <RotatingText />
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                            className="shiny-button rounded-full"
                        >
                            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                            <span className="sr-only">Toggle theme</span>
                        </Button>
                    </div>
                </div>
            </div>
        </nav>
    )
}

export default Navbar