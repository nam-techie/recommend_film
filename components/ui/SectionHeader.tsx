'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface SectionHeaderProps {
    title: string
    subtitle?: string
    icon?: React.ComponentType<{ className?: string }>
    showViewAll?: boolean
    onViewAll?: () => void
    href?: string
}

export function SectionHeader({ 
    title, 
    subtitle, 
    icon: Icon, 
    showViewAll = true, 
    onViewAll,
    href
}: SectionHeaderProps) {
    return (
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r from-primary to-purple-600">
                            <Icon className="h-4 w-4 text-white" />
                        </div>
                    )}
                    <h2 className="text-xl sm:text-2xl font-bold shiny-text">{title}</h2>
                </div>
                {subtitle && (
                    <p className="text-sm sm:text-base text-muted-foreground ml-0 sm:ml-11">{subtitle}</p>
                )}
            </div>
            
            {showViewAll && (
                href ? (
                    <Link href={href}>
                        <Button 
                            variant="ghost" 
                            className="text-primary hover:text-primary/80 text-sm sm:text-base"
                        >
                            <span className="hidden sm:inline">Xem tất cả</span>
                            <span className="sm:hidden">Xem thêm</span>
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </Link>
                ) : (
                    <Button 
                        variant="ghost" 
                        className="text-primary hover:text-primary/80 text-sm sm:text-base"
                        onClick={onViewAll}
                    >
                        <span className="hidden sm:inline">Xem tất cả</span>
                        <span className="sm:hidden">Xem thêm</span>
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                )
            )}
        </div>
    )
}