'use client'

import React from 'react'

interface SystemNotificationProps {
  message: string
  timestamp: number
}

export function SystemNotification({ message, timestamp }: SystemNotificationProps) {
  return (
    <div className="flex justify-center my-1 animate-slide-up">
      <div className="bg-gray-600/30 border border-gray-500/30 rounded-full px-4 py-2 max-w-sm backdrop-blur-sm">
        <p className="text-xs text-gray-200 text-center font-medium">
          {message}
        </p>
      </div>
    </div>
  )
} 