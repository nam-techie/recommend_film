'use client'

import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  getAuth,
  inMemoryPersistence,
  initializeAuth,
  setPersistence,
  signOut,
  type Auth,
} from 'firebase/auth'
import { firebaseConfig } from '@/lib/firebase'

const STEP_UP_APP_NAME = 'cinemind-admin-step-up'
let stepUpAuth: Auth | null = null

export async function getAdminStepUpAuth() {
  if (!stepUpAuth) {
    const existing = getApps().find((app) => app.name === STEP_UP_APP_NAME)
    const app = existing || initializeApp(firebaseConfig, STEP_UP_APP_NAME)
    try {
      stepUpAuth = initializeAuth(app, { persistence: inMemoryPersistence })
    } catch {
      stepUpAuth = getAuth(getApp(STEP_UP_APP_NAME))
      await setPersistence(stepUpAuth, inMemoryPersistence)
    }
  }
  await signOut(stepUpAuth).catch(() => undefined)
  return stepUpAuth
}
