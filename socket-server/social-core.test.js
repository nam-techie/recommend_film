import test from 'node:test'
import assert from 'node:assert/strict'
import { directoryProfile, isAnonymousFirebaseActor, requestIp } from './social-core.js'

test('anonymous Firebase accounts are rejected', () => {
  assert.equal(isAnonymousFirebaseActor({ firebase: { sign_in_provider: 'anonymous' } }), true)
  assert.equal(isAnonymousFirebaseActor({ firebase: { sign_in_provider: 'google.com' } }), false)
})

test('directory profile exposes only public lookup fields', () => {
  assert.deepEqual(directoryProfile({ uid: 'u1', username: 'nam', displayName: 'Nam', avatar: 'https://example.com/a.jpg', email: 'secret@example.com', settings: { private: true } }), {
    uid: 'u1', username: 'nam', displayName: 'Nam', avatar: 'https://example.com/a.jpg',
  })
  assert.equal(directoryProfile({ uid: 'u1', displayName: 'Nam' }), null)
})

test('request IP uses the value appended by the closest trusted proxy', () => {
  assert.equal(requestIp({ headers: { 'x-forwarded-for': 'spoofed, 203.0.113.9' }, socket: { remoteAddress: '127.0.0.1' } }), '203.0.113.9')
  assert.equal(requestIp({ headers: {}, socket: { remoteAddress: '127.0.0.1' } }), '127.0.0.1')
})
