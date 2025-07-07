// Watch Party Utilities
// Có thể dùng localStorage cho demo hoặc Firebase cho production

import { database } from './firebase'
import { ref, set, remove, update, push, onValue, off } from 'firebase/database'

interface WatchPartyConfig {
  mode: 'demo' | 'firebase'
  firebaseConfig?: any
}

export class WatchPartyManager {
  private mode: 'demo' | 'firebase'
  private listeners: Map<string, Function[]> = new Map()

  constructor(config: WatchPartyConfig) {
    this.mode = config.mode
    
    if (config.mode === 'firebase' && config.firebaseConfig) {
      // Initialize Firebase
      console.log('Firebase mode enabled')
    } else {
      console.log('Demo mode - using localStorage')
    }
  }

  // Generate unique room ID
  generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Generate user ID
  generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Create room
  async createRoom(movieSlug: string, movieTitle: string, hostId: string, hostName: string) {
    const roomId = this.generateRoomId()
    const room = {
      id: roomId,
      movie: {
        slug: movieSlug,
        title: movieTitle,
        poster: `/api/placeholder/300/450`,
        videoUrl: `https://www.youtube.com/embed/${this.getYouTubeId(movieTitle)}`
      },
      playback: {
        currentTime: 0,
        isPlaying: false,
        lastUpdated: Date.now(),
        updatedBy: hostId
      },
      users: {
        [hostId]: {
          id: hostId,
          name: hostName,
          isHost: true,
          joinedAt: Date.now()
        }
      },
      messages: {},
      createdAt: Date.now(),
      hostId,
      isActive: true
    }

    if (this.mode === 'demo') {
      localStorage.setItem(`watch_room_${roomId}`, JSON.stringify(room))
    }
    // TODO: Firebase implementation

    return room
  }

  // Join room
  async joinRoom(roomId: string, userId: string, userName: string) {
    if (this.mode === 'demo') {
      const roomData = localStorage.getItem(`watch_room_${roomId}`)
      if (!roomData) throw new Error('Room not found')
      
      const room = JSON.parse(roomData)
      room.users[userId] = {
        id: userId,
        name: userName,
        joinedAt: Date.now()
      }
      
      localStorage.setItem(`watch_room_${roomId}`, JSON.stringify(room))
      this.notifyListeners(roomId, room)
      
      return room
    }
    // TODO: Firebase implementation
  }

  // Leave room
  async leaveRoom(roomId: string, userId: string) {
    if (this.mode === 'demo') {
      const roomData = localStorage.getItem(`watch_room_${roomId}`)
      if (!roomData) return
      
      const room = JSON.parse(roomData)
      delete room.users[userId]
      
      localStorage.setItem(`watch_room_${roomId}`, JSON.stringify(room))
      this.notifyListeners(roomId, room)
    }
    // TODO: Firebase implementation
  }

  // Send message
  async sendMessage(roomId: string, userId: string, userName: string, text: string) {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    const message = {
      id: messageId,
      userId,
      userName,
      text,
      timestamp: Date.now()
    }

    if (this.mode === 'demo') {
      const roomData = localStorage.getItem(`watch_room_${roomId}`)
      if (!roomData) throw new Error('Room not found')
      
      const room = JSON.parse(roomData)
      room.messages[messageId] = message
      
      localStorage.setItem(`watch_room_${roomId}`, JSON.stringify(room))
      this.notifyListeners(roomId, room)
    }
    // TODO: Firebase implementation
  }

  // Update playback
  async updatePlayback(roomId: string, currentTime: number, isPlaying: boolean, updatedBy: string) {
    if (this.mode === 'demo') {
      const roomData = localStorage.getItem(`watch_room_${roomId}`)
      if (!roomData) throw new Error('Room not found')
      
      const room = JSON.parse(roomData)
      room.playback = {
        currentTime,
        isPlaying,
        lastUpdated: Date.now(),
        updatedBy
      }
      
      localStorage.setItem(`watch_room_${roomId}`, JSON.stringify(room))
      this.notifyListeners(roomId, room)
    }
    // TODO: Firebase implementation
  }

  // Listen to room changes
  subscribeToRoom(roomId: string, callback: Function) {
    if (!this.listeners.has(roomId)) {
      this.listeners.set(roomId, [])
    }
    this.listeners.get(roomId)!.push(callback)

    // For demo mode, set up polling
    if (this.mode === 'demo') {
      const interval = setInterval(() => {
        const roomData = localStorage.getItem(`watch_room_${roomId}`)
        if (roomData) {
          callback(JSON.parse(roomData))
        }
      }, 1000)

      // Return unsubscribe function
      return () => {
        clearInterval(interval)
        const listeners = this.listeners.get(roomId)
        if (listeners) {
          const index = listeners.indexOf(callback)
          if (index > -1) {
            listeners.splice(index, 1)
          }
        }
      }
    }
    // TODO: Firebase implementation
  }

  // Notify all listeners
  private notifyListeners(roomId: string, room: any) {
    const listeners = this.listeners.get(roomId)
    if (listeners) {
      listeners.forEach(callback => callback(room))
    }
  }

  // Helper: Extract YouTube ID from title for demo
  private getYouTubeId(title: string): string {
    // Mock YouTube IDs for demo
    const mockIds: Record<string, string> = {
      'lilo stitch': 'VWqJifMMgZE',
      'avatar': 'uGF6ek4x73g',
      'endgame': 'TcMBFSGVi1c',
      'default': 'dQw4w9WgXcQ'
    }
    
    const key = title.toLowerCase().replace(/[^a-z\s]/g, '').trim()
    return mockIds[key] || mockIds.default
  }

  // Utility: Format time for display
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Utility: Generate shareable room link
  generateRoomLink(roomId: string): string {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/watch-party/${roomId}`
    }
    return `https://moviewiser.com/watch-party/${roomId}`
  }

  // Utility: Validate room ID format
  isValidRoomId(roomId: string): boolean {
    return /^room_\d+_[a-z0-9]{9}$/.test(roomId)
  }
}

// Singleton instance
export const watchPartyManager = new WatchPartyManager({ mode: 'demo' })

// Helper functions
export const generateAnonymousName = (): string => {
  const adjectives = ['Vui vẻ', 'Thông minh', 'Dễ thương', 'Năng động', 'Tò mò']
  const nouns = ['Khán giả', 'Bạn', 'Người xem', 'Fan phim', 'Cine lover']
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 999) + 1
  
  return `${adj} ${noun} ${num}`
}

export const createMovieRoom = async (movieSlug: string, movieTitle: string, hostName: string) => {
  const hostId = watchPartyManager.generateUserId()
  const room = await watchPartyManager.createRoom(movieSlug, movieTitle, hostId, hostName)
  
  return {
    room,
    hostId,
    roomLink: watchPartyManager.generateRoomLink(room.id)
  }
}

const ROOM_DURATION = 4 * 60 * 60 * 1000 // 4 hours

// Room interface
export interface WatchRoom {
  id: string
  movie: {
    id: string
    title: string
    slug: string
    poster: string
    videoUrl?: string
  }
  host: {
    id: string
    name: string
  }
  users: { [key: string]: any }
  messages: { [key: string]: any }
  playback: {
    currentTime: number
    isPlaying: boolean
    lastUpdated: number
  }
  createdAt: number
  isActive: boolean
}

// Clean up expired rooms (run periodically)
export const cleanupExpiredRooms = async () => {
  if (!database) return
  
  try {
    const roomsRef = ref(database, 'rooms')
    
    onValue(roomsRef, (snapshot) => {
      const data = snapshot.val()
      if (!data) return
      
      const rooms = Object.entries(data) as [string, WatchRoom][]
      
      rooms.forEach(([roomId, room]) => {
        const isExpired = Date.now() - room.createdAt > ROOM_DURATION
        
        if (isExpired) {
          console.log(`🗑️ Cleaning up expired room: ${roomId} (${room.movie.title})`)
          remove(ref(database, `rooms/${roomId}`))
            .catch(error => console.error('Failed to remove expired room:', error))
        }
      })
    }, { onlyOnce: true })
    
  } catch (error) {
    console.error('Error in cleanup:', error)
  }
}

// Check if room is expired
export const isRoomExpired = (room: WatchRoom): boolean => {
  return Date.now() - room.createdAt > ROOM_DURATION
}

// Get room time remaining
export const getRoomTimeRemaining = (room: WatchRoom): string | null => {
  const elapsed = Date.now() - room.createdAt
  const remaining = ROOM_DURATION - elapsed
  
  if (remaining <= 0) return 'Đã hết hạn'
  
  const hours = Math.floor(remaining / (60 * 60 * 1000))
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))
  
  if (hours > 0) {
    return `${hours}h ${minutes}m còn lại`
  }
  return `${minutes}m còn lại`
} 