import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "YOUR_DATABASE_URL",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "YOUR_APP_ID"
}

// Initialize Firebase only if all config values are provided
let app: any = null
let database: any = null

try {
  // Check if environment variables are properly configured
  const isConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY" && 
                      firebaseConfig.authDomain !== "YOUR_AUTH_DOMAIN" &&
                      firebaseConfig.databaseURL !== "YOUR_DATABASE_URL" &&
                      firebaseConfig.projectId !== "YOUR_PROJECT_ID"
  
  if (isConfigured) {
    app = initializeApp(firebaseConfig)
    database = getDatabase(app)
    console.log('✅ Firebase initialized successfully')
    console.log('🔥 Database URL:', firebaseConfig.databaseURL)
  } else {
    console.log('⚠️ Firebase config not provided - Watch Party will use demo mode')
    console.log('💡 To enable Firebase: Create .env.local with NEXT_PUBLIC_FIREBASE_* variables')
  }
} catch (error) {
  console.error('❌ Firebase initialization failed:', error)
  console.log('🔄 Watch Party will fallback to demo mode')
}

export { database }
export default app

// Helper function to check if Firebase is available
export const isFirebaseAvailable = () => {
  return database !== null
}
