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
        <div className="relative h-5 sm:h-6 overflow-hidden">
            {words.map((word, i) => (
                <span
                    key={word}
                    className={`absolute w-full text-right transition-transform duration-500 text-sm sm:text-base ${
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
                <div className="flex h-14 sm:h-16 items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center space-x-2">
                        <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-r from-primary to-purple-600">
                            <Film className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <div className="hidden xs:block">
                            <h1 className="text-lg sm:text-xl font-bold shiny-text">
                                CineMind
                            </h1>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">Cinema meets Mind</p>
                        </div>
                    </div>

                    {/* Theme Toggle and Username */}
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <div className="w-24 sm:w-32">
                            <RotatingText />
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                            className="shiny-button rounded-full h-8 w-8 sm:h-10 sm:w-10"
                        >
                            <Sun className="h-4 w-4 sm:h-5 sm:w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                            <Moon className="absolute h-4 w-4 sm:h-5 sm:w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                            <span className="sr-only">Toggle theme</span>
                        </Button>
                    </div>
                </div>
            </div>
        </nav>
    )
}

export default Navbar