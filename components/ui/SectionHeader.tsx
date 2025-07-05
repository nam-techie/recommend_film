'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { ChevronRight, DivideIcon as LucideIcon } from 'lucide-react'

interface SectionHeaderProps {
    title: string
    subtitle?: string
    icon?: LucideIcon
    showViewAll?: boolean
    onViewAll?: () => void
}

export function SectionHeader({ 
    title, 
    subtitle, 
    icon: Icon, 
    showViewAll = true, 
    onViewAll 
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
                    <h2 className="text-2xl font-bold shiny-text">{title}</h2>
                </div>
                {subtitle && (
                    <p className="text-muted-foreground ml-11">{subtitle}</p>
                )}
            </div>
            
            {showViewAll && (
                <Button 
                    variant="ghost" 
                    className="text-primary hover:text-primary/80"
                    onClick={onViewAll}
                >
                    Xem tất cả
                    <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
            )}
        </div>
    )
}