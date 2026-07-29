import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app'
import { getDatabase, type Database } from 'firebase/database'
import { getAuth, type Auth } from 'firebase/auth'

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const hasAuthConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId)
const hasDatabaseConfig = Boolean(firebaseConfig.databaseURL)

let app: FirebaseApp | null = null
let auth: Auth | null = null
let database: Database | null = null

if (hasAuthConfig) {
  try {
    app = getApps()[0] || initializeApp(firebaseConfig)
    auth = getAuth(app)
  } catch (error) {
    console.error('Firebase Auth initialization failed:', error)
  }
}

// Realtime Database is optional for Firebase Auth. A missing/invalid database URL
// must not disable Google or email/password sign-in.
if (app && hasDatabaseConfig) {
  try {
    database = getDatabase(app)
  } catch (error) {
    console.error('Firebase Realtime Database initialization failed:', error)
  }
}

export const firebaseAuthConfigured = Boolean(auth)
export const firebaseDatabaseConfigured = Boolean(database)
export { database, auth }
export default app

export const isFirebaseAvailable = () => database !== null
