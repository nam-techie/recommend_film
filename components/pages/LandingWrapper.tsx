'use client'

import React, { useState, useEffect } from 'react'
import { PerspectiveLanding } from '@/components/ui/PerspectiveLanding'
import { HomePage } from '@/components/pages/HomePage'

export const LandingWrapper = () => {
    const [hasEntered, setHasEntered] = useState<boolean>(true)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const entered = sessionStorage.getItem('cinemind_entered')
        if (entered !== 'true') {
            setHasEntered(false)
        }
    }, [])

    const handleEnter = () => {
        sessionStorage.setItem('cinemind_entered', 'true')
        setHasEntered(true)
    }

    if (!mounted) return null // Tránh lỗi window is not defined lúc SSR

    return (
        <div className="relative">
            {/* PerspectiveLanding sẽ đè lên trên (dùng fixed z-100) */}
            {!hasEntered && (
                <PerspectiveLanding onEnter={handleEnter} />
            )}
            
            {/* Render HomePage bên dưới để có sẵn luôn sau khi Intro biến mất */}
            <HomePage />
        </div>
    )
}
