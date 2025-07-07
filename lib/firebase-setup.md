# 🔥 Firebase Setup cho Watch Party

## 1. Tạo Firebase Project

1. Truy cập [Firebase Console](https://console.firebase.google.com)
2. Tạo project mới: "moviewiser-watch-party"
3. Enable Realtime Database
4. Set rules:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true,
        "users": {
          "$userId": {
            ".write": "$userId == auth.uid || auth == null"
          }
        },
        "messages": {
          ".write": true
        },
        "playback": {
          ".write": true
        }
      }
    }
  }
}
```

## 2. Install Dependencies

```bash
npm install firebase
```

## 3. Firebase Config

Tạo file `lib/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "YOUR_DATABASE_URL",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
}

const app = initializeApp(firebaseConfig)
export const database = getDatabase(app)
```

## 4. Watch Party Hooks

Tạo file `hooks/useWatchParty.ts`:

```typescript
import { useState, useEffect } from 'react'
import { database } from '@/lib/firebase'
import { ref, set, push, onValue, off } from 'firebase/database'

interface UseWatchPartyProps {
  roomId: string
  userId: string
  userName: string
}

export function useWatchParty({ roomId, userId, userName }: UseWatchPartyProps) {
  const [room, setRoom] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const roomRef = ref(database, `rooms/${roomId}`)
    
    // Listen for room changes
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val()
      setRoom(data)
      setIsConnected(true)
    })

    // Join room
    const userRef = ref(database, `rooms/${roomId}/users/${userId}`)
    set(userRef, {
      id: userId,
      name: userName,
      joinedAt: Date.now()
    })

    return () => {
      off(roomRef, 'value', unsubscribe)
      // Remove user when leaving
      set(userRef, null)
    }
  }, [roomId, userId, userName])

  const sendMessage = (text: string) => {
    const messagesRef = ref(database, `rooms/${roomId}/messages`)
    push(messagesRef, {
      userId,
      userName,
      text,
      timestamp: Date.now()
    })
  }

  const updatePlayback = (currentTime: number, isPlaying: boolean) => {
    const playbackRef = ref(database, `rooms/${roomId}/playback`)
    set(playbackRef, {
      currentTime,
      isPlaying,
      lastUpdated: Date.now(),
      updatedBy: userId
    })
  }

  return {
    room,
    isConnected,
    sendMessage,
    updatePlayback
  }
}
```

## 5. Environment Variables

Thêm vào `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123def456
```

## 6. Cập nhật WatchPartyPage

Thay thế mock data bằng Firebase hooks:

```typescript
// Thay thế phần mock data
const { room, isConnected, sendMessage, updatePlayback } = useWatchParty({
  roomId: roomId || 'demo',
  userId: currentUser?.id || '',
  userName: currentUser?.name || ''
})
```

## 7. Security Rules Production

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": "auth != null",
        ".write": "auth != null",
        "users": {
          "$userId": {
            ".write": "$userId == auth.uid"
          }
        }
      }
    }
  }
}
```

## 🚀 Deployment Notes

1. **Free Tier Limits**: 100 concurrent connections
2. **Upgrade**: $25/month for Blaze plan (unlimited)
3. **Alternative**: Supabase (PostgreSQL + realtime)
4. **Backup Plan**: Socket.IO với Vercel Functions 