'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose 
} from '@/components/ui/dialog'
import { Send, Reply } from 'lucide-react'

interface Message {
  id: string
  userId: string
  userName: string
  text: string
  timestamp: number
  videoTime?: number
}

interface ReplyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  originalMessage: Message | null
  onSendReply: (text: string, replyTo: { messageId: string, userId: string, userName: string, text: string }) => void
  currentUserName: string
}

export function ReplyDialog({ 
  open, 
  onOpenChange, 
  originalMessage, 
  onSendReply, 
  currentUserName 
}: ReplyDialogProps) {
  const [replyText, setReplyText] = useState('')

  const handleSendReply = () => {
    if (!replyText.trim() || !originalMessage) return

    onSendReply(replyText.trim(), {
      messageId: originalMessage.id,
      userId: originalMessage.userId,
      userName: originalMessage.userName,
      text: originalMessage.text
    })

    setReplyText('')
    onOpenChange(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendReply()
    }
  }

  if (!originalMessage) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gray-800 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-400">
            <Reply className="h-4 w-4" />
            Trả lời tin nhắn
          </DialogTitle>
        </DialogHeader>

        {/* Original message preview */}
        <div className="bg-gray-900 rounded-lg p-3 border-l-4 border-purple-500">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-purple-400">
              {originalMessage.userName}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(originalMessage.timestamp).toLocaleTimeString('vi-VN', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">
            {originalMessage.text}
          </p>
        </div>

        {/* Reply input */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>Trả lời với tư cách: </span>
            <span className="text-purple-400 font-medium">{currentUserName}</span>
          </div>
          <Input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Nhập phản hồi của bạn..."
            className="bg-gray-900 border-gray-600 text-white placeholder-gray-500 focus:border-purple-500"
            autoFocus
          />
        </div>

        <DialogFooter className="flex gap-2">
          <DialogClose asChild>
            <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
              Hủy
            </Button>
          </DialogClose>
          <Button 
            onClick={handleSendReply}
            disabled={!replyText.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Gửi phản hồi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 