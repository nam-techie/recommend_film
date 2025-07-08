import { useState, useEffect } from 'react'
import { database, isFirebaseAvailable } from '@/lib/firebase'
import { ref, set, push, onValue, off } from 'firebase/database'

interface User {
  id: string
  name: string
  isHost?: boolean
  joinedAt: number
  lastSeen: number
}

interface Message {
  id: string
  userId: string
  userName: string
  text: string
  timestamp: number
  videoTime?: number
  replyTo?: {
    messageId: string
    userId: string
    userName: string
    text: string
  }
}

interface PlaybackState {
  currentTime: number
  isPlaying: boolean
  lastUpdated: number
  updatedBy: string
}

interface WatchRoom {
  id: string
  roomName?: string
  movie: {
    slug: string
    title: string
    poster?: string
    videoUrl?: string
  }
  playback: PlaybackState
  users: Record<string, User>
  messages: Record<string, Message>
  createdAt: number
  hostId: string
}

interface UseWatchPartyProps {
  roomId: string
  userId: string
  userName: string
  mode?: 'demo' | 'firebase'
}

export function useWatchParty({ roomId, userId, userName, mode = 'demo' }: UseWatchPartyProps) {
  const [room, setRoom] = useState<WatchRoom | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Function to update user activity (heartbeat)
  const updateUserActivity = () => {
    if (!userId || !userName) return

    if (mode === 'firebase' && database) {
      const userRef = ref(database, `rooms/${roomId}/users/${userId}`)
      set(userRef, {
        id: userId,
        name: userName,
        isHost: room?.hostId === userId,
        joinedAt: room?.users?.[userId]?.joinedAt || Date.now(),
        lastSeen: Date.now()
      }).catch((err) => {
        console.error('Failed to update user activity:', err)
      })
    } else if (mode === 'demo') {
      try {
        const roomData = localStorage.getItem(`watch_room_${roomId}`)
        if (roomData) {
          const parsedRoom = JSON.parse(roomData)
          if (parsedRoom.users && parsedRoom.users[userId]) {
            parsedRoom.users[userId].lastSeen = Date.now()
            localStorage.setItem(`watch_room_${roomId}`, JSON.stringify(parsedRoom))
          }
        }
      } catch (err) {
        console.error('Failed to update activity in demo mode:', err)
      }
    }
  }

  // Function to cleanup inactive users (older than 5 minutes)
  const cleanupInactiveUsers = () => {
    const now = Date.now()
    const INACTIVE_THRESHOLD = 5 * 60 * 1000 // 5 minutes

    if (mode === 'firebase' && database) {
      // Firebase cleanup will be handled by real-time listeners
      // We don't manually remove users here to avoid conflicts
      return
    } else if (mode === 'demo') {
      try {
        const roomData = localStorage.getItem(`watch_room_${roomId}`)
        if (roomData) {
          const parsedRoom = JSON.parse(roomData)
          if (parsedRoom.users) {
            const activeUsers: Record<string, any> = {}
            
            // Keep only users who were active within 5 minutes
            Object.entries(parsedRoom.users).forEach(([id, user]: [string, any]) => {
              if (user.lastSeen && (now - user.lastSeen) <= INACTIVE_THRESHOLD) {
                activeUsers[id] = user
              } else {
                console.log(`🧹 Removing inactive user: ${user.name} (${id})`)
              }
            })
            
            parsedRoom.users = activeUsers
            localStorage.setItem(`watch_room_${roomId}`, JSON.stringify(parsedRoom))
          }
        }
      } catch (err) {
        console.error('Failed to cleanup inactive users:', err)
      }
    }
  }

  useEffect(() => {
    console.log(`🔥 useWatchParty: Starting ${mode} mode for room ${roomId}`)
    
    // Skip connection for placeholder rooms
    if (roomId === 'placeholder' || !roomId) {
      console.log('⏭️ Skipping connection for placeholder room')
      return
    }

    // Cleanup function to run on page unload
    const cleanup = () => {
      console.log(`🧹 Emergency cleanup for user ${userId}`)
      if (mode === 'firebase' && database && userId) {
        const userRef = ref(database, `rooms/${roomId}/users/${userId}`)
        set(userRef, null)
      } else if (mode === 'demo') {
        try {
          const roomData = localStorage.getItem(`watch_room_${roomId}`)
          if (roomData) {
            const parsedRoom = JSON.parse(roomData)
            if (parsedRoom.users && parsedRoom.users[userId]) {
              delete parsedRoom.users[userId]
              localStorage.setItem(`watch_room_${roomId}`, JSON.stringify(parsedRoom))
            }
          }
        } catch (err) {
          console.error('Emergency cleanup failed:', err)
        }
      }
    }

    // Add beforeunload listener for cleanup when closing tab/refreshing
    const handleBeforeUnload = () => {
      cleanup()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Heartbeat to update user activity every 30 seconds
    const heartbeatInterval = setInterval(() => {
      if (userId && userName) {
        updateUserActivity()
      }
    }, 30000) // 30 seconds

    // Cleanup inactive users every 2 minutes
    const cleanupInterval = setInterval(() => {
      cleanupInactiveUsers()
    }, 120000) // 2 minutes
    
    if (mode === 'firebase') {
      // Firebase mode - real-time synchronization
      try {
        if (!database) {
          console.error('❌ Firebase database not initialized')
          setError('Firebase chưa được cấu hình. Sử dụng demo mode.')
          return
        }

        console.log('✅ Firebase database initialized, setting up room listener')
        const roomRef = ref(database, `rooms/${roomId}`)
        
        // Listen for room changes
        const unsubscribe = onValue(roomRef, (snapshot) => {
          const data = snapshot.val()
          console.log(`🔥 Firebase room data for ${roomId}:`, data)
          
          if (data) {
            setRoom(data)
            setIsConnected(true)
            setError(null)
            console.log('✅ Room loaded successfully from Firebase')
          } else {
            console.warn(`⚠️ Room ${roomId} not found in Firebase`)
            setError('Room not found')
          }
        }, (error) => {
          console.error('❌ Firebase room listener error:', error)
          setError('Connection failed')
          setIsConnected(false)
        })

        // Join room - add user to room
        if (userId && userName) {
          console.log(`👤 Adding user ${userName} (${userId}) to room ${roomId}`)
          
          // First, get room data to check if user is host
          const roomRef = ref(database, `rooms/${roomId}`)
          onValue(roomRef, (roomSnapshot) => {
            const roomData = roomSnapshot.val()
            const isUserHost = roomData?.hostId === userId
            
            const userRef = ref(database, `rooms/${roomId}/users/${userId}`)
            set(userRef, {
              id: userId,
              name: userName,
              isHost: isUserHost, // Set isHost based on hostId
              joinedAt: Date.now(),
              lastSeen: Date.now() // Initialize lastSeen
            }).then(() => {
              console.log(`✅ User added to Firebase room as ${isUserHost ? 'HOST' : 'GUEST'}`)
            }).catch((err) => {
              console.error('❌ Failed to add user to Firebase room:', err)
            })
          }, { onlyOnce: true })
        }

        return () => {
          console.log(`🧹 Cleaning up Firebase listeners for room ${roomId}`)
          // Cleanup: remove user and unsubscribe
          if (userId) {
            const userRef = ref(database, `rooms/${roomId}/users/${userId}`)
            set(userRef, null).then(() => {
              console.log(`✅ User ${userId} removed during cleanup`)
            }).catch((err) => {
              console.error('❌ Failed to remove user during cleanup:', err)
            })
          }
          off(roomRef, 'value', unsubscribe)
          clearInterval(heartbeatInterval)
          clearInterval(cleanupInterval)
          window.removeEventListener('beforeunload', handleBeforeUnload)
        }
        
      } catch (err) {
        console.error('❌ Firebase initialization error:', err)
        setError('Firebase configuration error')
      }
    } else {
      // Demo mode - localStorage simulation
      const interval = setInterval(() => {
        try {
          const roomData = localStorage.getItem(`watch_room_${roomId}`)
          if (roomData) {
            const parsedRoom = JSON.parse(roomData)
            setRoom(parsedRoom)
            setIsConnected(true)
            setError(null)
          } else {
            setError('Room not found in demo mode')
          }
        } catch (err) {
          console.error('Demo mode error:', err)
          setError('Failed to load room data')
        }
      }, 1000)

      // Simulate joining room in demo mode
      try {
        const roomData = localStorage.getItem(`watch_room_${roomId}`)
        if (roomData) {
          const parsedRoom = JSON.parse(roomData)
          
          // Check if user is host
          const isUserHost = parsedRoom.hostId === userId
          
          // Add current user to room
          parsedRoom.users[userId] = {
            id: userId,
            name: userName,
            isHost: isUserHost, // Set isHost based on hostId
            joinedAt: Date.now(),
            lastSeen: Date.now()
          }
          
          localStorage.setItem(`watch_room_${roomId}`, JSON.stringify(parsedRoom))
          console.log(`✅ Demo: User added as ${isUserHost ? 'HOST' : 'GUEST'}`)
        }
      } catch (err) {
        console.error('Failed to join demo room:', err)
      }

      return () => {
        clearInterval(interval)
        clearInterval(heartbeatInterval)
        clearInterval(cleanupInterval)
        window.removeEventListener('beforeunload', handleBeforeUnload)
        // Remove user from demo room on cleanup
        try {
          const roomData = localStorage.getItem(`watch_room_${roomId}`)
          if (roomData && userId) {
            const parsedRoom = JSON.parse(roomData)
            if (parsedRoom.users && parsedRoom.users[userId]) {
              delete parsedRoom.users[userId]
              localStorage.setItem(`watch_room_${roomId}`, JSON.stringify(parsedRoom))
              console.log(`✅ Demo cleanup: User ${userId} removed from room`)
            }
          }
        } catch (err) {
          console.error('Failed to cleanup user in demo mode:', err)
        }
      }
    }
  }, [roomId, userId, userName, mode])

  const sendMessage = (text: string, videoTime?: number, replyTo?: { messageId: string, userId: string, userName: string, text: string }) => {
    if (!room || !text.trim()) return

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    const message: Message = {
      id: messageId,
      userId,
      userName,
      text: text.trim(),
      timestamp: Date.now(),
      videoTime: videoTime,
      ...(replyTo && { replyTo })
    }

    console.log(`💬 Sending message in ${mode} mode:`, message)

    if (mode === 'firebase') {
      // Firebase implementation
      if (database) {
        const messagesRef = ref(database, `rooms/${roomId}/messages`)
        push(messagesRef, message).then(() => {
          console.log('✅ Message sent to Firebase')
        }).catch((err) => {
          console.error('❌ Failed to send message to Firebase:', err)
        })
      } else {
        console.error('❌ Firebase database not initialized for sendMessage')
      }
    } else {
      // Demo mode implementation
      try {
        const roomData = localStorage.getItem(`watch_room_${roomId}`)
        if (roomData) {
          const parsedRoom = JSON.parse(roomData)
          parsedRoom.messages[messageId] = message
          localStorage.setItem(`watch_room_${roomId}`, JSON.stringify(parsedRoom))
        }
      } catch (err) {
        console.error('Failed to send message in demo mode:', err)
      }
    }
  }

  const updatePlayback = (currentTime: number, isPlaying: boolean) => {
    if (!room) return

    const playbackState: PlaybackState = {
      currentTime,
      isPlaying,
      lastUpdated: Date.now(),
      updatedBy: userId
    }

    console.log(`🎮 Updating playback in ${mode} mode:`, playbackState)

    if (mode === 'firebase') {
      // Firebase implementation
      if (database) {
        const playbackRef = ref(database, `rooms/${roomId}/playback`)
        set(playbackRef, playbackState).then(() => {
          console.log('✅ Playback updated in Firebase')
        }).catch((err) => {
          console.error('❌ Failed to update playback in Firebase:', err)
        })
      } else {
        console.error('❌ Firebase database not initialized for updatePlayback')
      }
    } else {
      // Demo mode implementation
      try {
        const roomData = localStorage.getItem(`watch_room_${roomId}`)
        if (roomData) {
          const parsedRoom = JSON.parse(roomData)
          parsedRoom.playback = playbackState
          localStorage.setItem(`watch_room_${roomId}`, JSON.stringify(parsedRoom))
        }
      } catch (err) {
        console.error('Failed to update playback in demo mode:', err)
      }
    }
  }

  const leaveRoom = () => {
    console.log(`👋 User ${userId} leaving room ${roomId} in ${mode} mode`)
    
    if (mode === 'firebase') {
      // Firebase implementation
      if (database && userId) {
        const userRef = ref(database, `rooms/${roomId}/users/${userId}`)
        set(userRef, null).then(() => {
          console.log(`✅ User ${userId} removed from Firebase room`)
        }).catch((err) => {
          console.error('❌ Failed to remove user from Firebase:', err)
        })
      } else {
        console.log('Firebase database not initialized or no userId')
      }
    } else {
      // Demo mode implementation
      try {
        const roomData = localStorage.getItem(`watch_room_${roomId}`)
        if (roomData) {
          const parsedRoom = JSON.parse(roomData)
          if (parsedRoom.users && parsedRoom.users[userId]) {
            delete parsedRoom.users[userId]
            localStorage.setItem(`watch_room_${roomId}`, JSON.stringify(parsedRoom))
            console.log(`✅ Demo: User ${userId} removed from room`)
          }
        }
      } catch (err) {
        console.error('Failed to leave room in demo mode:', err)
      }
    }
  }

  const createRoom = (movieSlug: string, movieTitle: string, hostName: string, moviePoster?: string, roomName?: string) => {
    console.log(`🏠 Creating room in ${mode} mode:`, { movieSlug, movieTitle, hostName, moviePoster, roomName })
    
    const newRoom: WatchRoom = {
      id: roomId,
      roomName: roomName || movieTitle, // Use custom room name or default to movie title
      movie: {
        slug: movieSlug,
        title: movieTitle,
        poster: moviePoster || 'https://via.placeholder.com/300x450/1a1a1a/666?text=🎬',
        videoUrl: `https://vidsrc.xyz/embed/movie/${movieSlug}`
      },
      playback: {
        currentTime: 0,
        isPlaying: false,
        lastUpdated: Date.now(),
        updatedBy: userId
      },
      users: {
        [userId]: {
          id: userId,
          name: hostName,
          isHost: true,
          joinedAt: Date.now(),
          lastSeen: Date.now() // Initialize lastSeen
        }
      },
      messages: {},
      createdAt: Date.now(),
      hostId: userId
    }

    if (mode === 'firebase') {
      // Firebase implementation
      if (database) {
        console.log('✅ Creating room in Firebase:', newRoom)
        const roomRef = ref(database, `rooms/${roomId}`)
        set(roomRef, newRoom).then(() => {
          console.log('✅ Room created successfully in Firebase')
          setRoom(newRoom)
          setIsConnected(true)
        }).catch((err) => {
          console.error('❌ Failed to create room in Firebase:', err)
        })
      } else {
        console.error('❌ Firebase database not initialized for createRoom')
      }
    } else {
      // Demo mode implementation
      localStorage.setItem(`watch_room_${roomId}`, JSON.stringify(newRoom))
      setRoom(newRoom)
      setIsConnected(true)
    }

    return newRoom
  }

  return {
    room,
    isConnected,
    error,
    sendMessage,
    updatePlayback,
    leaveRoom,
    createRoom,
    // Utility helpers
    isHost: room?.hostId === userId,
    userCount: room?.users ? Object.keys(room.users).length : 0,
    messageCount: room?.messages ? Object.keys(room.messages).length : 0
  }
}

// Helper hook for creating a new room
export function useCreateWatchParty() {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createRoom = async (movieSlug: string, movieTitle: string, hostName: string, moviePoster?: string, movieVideoUrl?: string, mode: 'demo' | 'firebase' = 'demo', roomName?: string) => {
    setIsCreating(true)
    setError(null)

    try {
      // Generate unique room ID and user ID
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      console.log(`🏠 Creating room directly in ${mode} mode:`, { movieSlug, movieTitle, hostName, moviePoster, movieVideoUrl, roomId })
      
      // Create room object
      const newRoom: WatchRoom = {
        id: roomId,
        roomName: roomName || movieTitle,
        movie: {
          slug: movieSlug,
          title: movieTitle,
          poster: moviePoster || 'https://via.placeholder.com/300x450/1a1a1a/666?text=🎬',
          videoUrl: movieVideoUrl || `https://vidsrc.xyz/embed/movie/${movieSlug}`
        },
        playback: {
          currentTime: 0,
          isPlaying: false,
          lastUpdated: Date.now(),
          updatedBy: userId
        },
        users: {
          [userId]: {
            id: userId,
            name: hostName,
            isHost: true,
            joinedAt: Date.now(),
            lastSeen: Date.now() // Initialize lastSeen
          }
        },
        messages: {},
        createdAt: Date.now(),
        hostId: userId
      }

      if (mode === 'firebase') {
        // Firebase implementation
        if (database) {
          console.log('✅ Creating room in Firebase:', newRoom)
          const roomRef = ref(database, `rooms/${roomId}`)
          await set(roomRef, newRoom)
          console.log('✅ Room created successfully in Firebase')
        } else {
          throw new Error('Firebase database not initialized')
        }
      } else {
        // Demo mode implementation
        localStorage.setItem(`watch_room_${roomId}`, JSON.stringify(newRoom))
        console.log('✅ Room created in localStorage (demo mode)')
      }

      const roomLink = `${typeof window !== 'undefined' ? window.location.origin : 'https://moviewiser.com'}/watch-party/${roomId}`

      return {
        room: newRoom,
        roomId,
        userId,
        roomLink
      }
    } catch (err) {
      console.error('❌ Failed to create room:', err)
      setError('Failed to create room')
      throw err
    } finally {
      setIsCreating(false)
    }
  }

  return {
    createRoom,
    isCreating,
    error
  }
}
