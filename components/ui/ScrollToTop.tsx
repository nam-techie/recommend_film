'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowUp } from 'lucide-react'

export function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false)

    // Hiển thị button khi scroll xuống 100px
    useEffect(() => {
        const toggleVisibility = () => {
            if (window.pageYOffset > 100) {
                setIsVisible(true)
            } else {
                setIsVisible(false)
            }
        }

        window.addEventListener('scroll', toggleVisibility)

        return () => {
            window.removeEventListener('scroll', toggleVisibility)
        }
    }, [])

    // Hàm scroll lên top
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        })
    }

    if (!isVisible) {
        return null
    }

    return (
        <Button
            onClick={scrollToTop}
            size="icon"
            className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-primary/90 hover:bg-primary shadow-lg backdrop-blur-sm border-0 transition-all duration-300 hover:scale-110"
            aria-label="Scroll to top"
        >
            <ArrowUp className="h-5 w-5 text-white" />
        </Button>
    )
} 