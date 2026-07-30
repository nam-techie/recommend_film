import test from 'node:test'
import assert from 'node:assert/strict'
import { firebaseAdminConfig } from './service-config.js'

test('Firebase Admin config parses an inline service account and escaped newlines', () => {
  const config = firebaseAdminConfig({
    FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({ project_id: 'cine', client_email: 'firebase@cine.iam.gserviceaccount.com', private_key: 'line1\\nline2' }),
    FIREBASE_DATABASE_URL: 'https://cine.asia-southeast1.firebasedatabase.app',
  })
  assert.equal(config.credentialSource, 'inline-json')
  assert.equal(config.serviceAccount.privateKey, 'line1\nline2')
  assert.equal(config.databaseURL, 'https://cine.asia-southeast1.firebasedatabase.app')
})

test('Firebase Admin config uses an explicit ADC secret file only when configured', () => {
  assert.equal(firebaseAdminConfig({ FIREBASE_PROJECT_ID: 'cine' }).credentialSource, null)
  assert.equal(firebaseAdminConfig({ GOOGLE_APPLICATION_CREDENTIALS: '/etc/secrets/firebase.json' }).credentialSource, 'application-default')
})

test('Firebase Admin config rejects partial split credentials', () => {
  assert.throws(() => firebaseAdminConfig({ FIREBASE_PROJECT_ID: 'cine', FIREBASE_CLIENT_EMAIL: 'firebase@cine.iam.gserviceaccount.com' }), { code: 'INVALID_SERVICE_ACCOUNT' })
})

test('Firebase Admin config prefers an explicit ADC secret file over stale split variables', () => {
  const config = firebaseAdminConfig({
    GOOGLE_APPLICATION_CREDENTIALS: '/etc/secrets/firebase.json',
    FIREBASE_CLIENT_EMAIL: 'stale@example.com',
  })
  assert.equal(config.credentialSource, 'application-default')
})

test('Firebase Admin config rejects malformed base64 before parsing JSON', () => {
  assert.throws(() => firebaseAdminConfig({ FIREBASE_SERVICE_ACCOUNT_BASE64: 'not-base64!' }), { code: 'INVALID_SERVICE_ACCOUNT_BASE64' })
})
