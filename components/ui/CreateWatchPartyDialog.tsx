'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Copy, CheckCircle, Share, Crown, Loader } from 'lucide-react'
import { useCreateWatchParty } from '@/hooks/useWatchParty'
import { generateAnonymousName } from '@/lib/watch-party-utils'
import { useRouter } from 'next/navigation'

interface CreateWatchPartyDialogProps {
  children: React.ReactNode
  movieSlug: string
  movieTitle: string
  moviePoster?: string
  movieVideoUrl?: string
}

export function CreateWatchPartyDialog({ 
  children, 
  movieSlug, 
  movieTitle, 
  moviePoster,
  movieVideoUrl 
}: CreateWatchPartyDialogProps) {
  const [open, setOpen] = useState(false)
  const [hostName, setHostName] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [createdRoom, setCreatedRoom] = useState<any>(null)
  const { createRoom, isCreating, error } = useCreateWatchParty()
  const router = useRouter()

  const handleCreateRoom = async () => {
    if (!hostName.trim() && !isAnonymous) return

    try {
      const finalHostName = isAnonymous ? `Host ${Math.floor(Math.random() * 1000)}` : hostName.trim()
      
      // Create room with real video URL
      const result = await createRoom(
        movieSlug, 
        movieTitle, 
        finalHostName, 
        moviePoster,
        movieVideoUrl,
        'firebase'
      )
      
      setCreatedRoom(result)
      
      // Store user info in sessionStorage to skip join form
      const userInfo = {
        id: result.userId,
        name: finalHostName,
        isHost: true,
        joinedAt: Date.now()
      }
      
      sessionStorage.setItem('watch_party_user', JSON.stringify(userInfo))
      sessionStorage.setItem('watch_party_auto_join', 'true')
      
      // Add real video URL to room
      if (movieVideoUrl) {
        sessionStorage.setItem('movie_video_url', movieVideoUrl)
      }
      
      // Close dialog and redirect after short delay
      setTimeout(() => {
        setOpen(false)
        router.push(`/watch-party/${result.roomId}`)
      }, 2000)
      
    } catch (err) {
      console.error('Failed to create room:', err)
    }
  }

  const handleCopyLink = () => {
    if (createdRoom?.roomLink) {
      navigator.clipboard.writeText(createdRoom.roomLink)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-800">
        {!createdRoom ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Users className="h-5 w-5 text-primary" />
                Tạo phòng xem chung
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Movie Info */}
              <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                {moviePoster && (
                  <img 
                    src={moviePoster} 
                    alt={movieTitle}
                    className="w-12 h-16 object-cover rounded"
                  />
                )}
                <div>
                  <h3 className="font-semibold text-white">{movieTitle}</h3>
                  <Badge variant="secondary" className="text-xs">Watch Party</Badge>
                </div>
              </div>

              {/* Host Options */}
              <div className="space-y-4">
                {/* Anonymous Option */}
                <div 
                  className="flex items-center space-x-3 p-3 border-2 border-gray-700 rounded-lg cursor-pointer hover:border-primary bg-gray-800/50"
                  onClick={() => setIsAnonymous(true)}
                >
                  <input
                    type="radio"
                    id="anonymous-host"
                    name="hostType"
                    checked={isAnonymous}
                    onChange={() => setIsAnonymous(true)}
                    className="w-4 h-4 text-primary"
                  />
                  <div className="flex-1">
                    <label htmlFor="anonymous-host" className="text-sm font-medium cursor-pointer text-white">
                      🎭 Tạo với tên ẩn danh
                    </label>
                    <p className="text-xs text-gray-400">
                      Hệ thống sẽ tự động tạo tên host cho bạn
                    </p>
                  </div>
                </div>

                {/* Named Host Option */}
                <div className="space-y-3">
                  <div 
                    className="flex items-center space-x-3 p-3 border-2 border-gray-700 rounded-lg cursor-pointer hover:border-primary bg-gray-800/50"
                    onClick={() => setIsAnonymous(false)}
                  >
                    <input
                      type="radio"
                      id="named-host"
                      name="hostType"
                      checked={!isAnonymous}
                      onChange={() => setIsAnonymous(false)}
                      className="w-4 h-4 text-primary"
                    />
                    <div className="flex-1">
                      <label htmlFor="named-host" className="text-sm font-medium cursor-pointer text-white">
                        👤 Tên host (hiển thị trong phòng)
                      </label>
                      <p className="text-xs text-gray-400">
                        Nhập tên bạn muốn hiển thị
                      </p>
                    </div>
                  </div>
                  
                  {!isAnonymous && (
                    <Input
                      placeholder="Ví dụ: Nambancam, Anna, Khang..."
                      value={hostName}
                      onChange={(e) => setHostName(e.target.value)}
                      maxLength={20}
                      className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                    />
                  )}
                </div>
              </div>

              {/* Host Privileges */}
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium text-yellow-400">Quyền Host:</span>
                </div>
                <ul className="text-xs text-yellow-300 space-y-1">
                  <li>• Điều khiển play/pause cho tất cả</li>
                  <li>• Chia sẻ link phòng với bạn bè</li>
                  <li>• Quản lý thành viên trong phòng</li>
                </ul>
              </div>

              {/* Create Button */}
              <Button 
                onClick={handleCreateRoom}
                disabled={(!hostName.trim() && !isAnonymous) || isCreating}
                className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
              >
                {isCreating ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Đang tạo phòng...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Tạo phòng xem
                  </>
                )}
              </Button>

              {error && (
                <p className="text-sm text-red-400 text-center">
                  {error}
                </p>
              )}
            </div>
          </>
        ) : (
          // Success State
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Users className="h-5 w-5 text-green-500" />
                Phòng xem đã được tạo!
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 text-center">
              <div className="flex items-center justify-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-2">Phòng đã sẵn sàng!</h3>
                <p className="text-sm text-gray-400">
                  ID phòng: <span className="font-mono text-primary">{createdRoom.roomId.slice(-12)}</span>
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-sm text-gray-400">Link chia sẻ:</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={createdRoom.roomLink}
                    className="bg-gray-800 border-gray-700 text-white text-sm"
                  />
                  <Button 
                    size="sm" 
                    onClick={handleCopyLink}
                    className="px-3"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-400 mb-2">📤 Mời bạn bè tham gia:</h4>
                <p className="text-xs text-blue-300">
                  Chia sẻ link trên để bạn bè có thể join phòng và xem phim cùng bạn!
                </p>
              </div>

              <div className="text-sm text-gray-400">
                <p>Đang chuyển hướng đến phòng xem... 🚀</p>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
} 