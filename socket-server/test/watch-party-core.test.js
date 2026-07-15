import assert from 'node:assert/strict'
import test from 'node:test'
import { applyVoicePermission, buildVoiceGrant, chooseHostSuccessor, findDeniedMediaEpisode, hashRoomPassword, isAllowedClientOrigin, isAllowedMediaUrl, sourceCapability, verifyRoomPassword } from '../watch-party-core.js'

test('room password is salted and validates without storing plaintext', async () => {
  const first = await hashRoomPassword('secret123')
  const second = await hashRoomPassword('secret123')
  assert.notEqual(first, second)
  assert.equal(first.includes('secret123'), false)
  assert.equal(await verifyRoomPassword('secret123', first), true)
  assert.equal(await verifyRoomPassword('wrong123', first), false)
})

test('source capability prioritizes HLS, then iframe', () => {
  assert.equal(sourceCapability({ linkM3u8: 'https://cdn.test/a.m3u8', linkEmbed: 'https://embed.test/a' }), 'full')
  assert.equal(sourceCapability({ linkEmbed: 'https://embed.test/a' }), 'limited')
  assert.equal(sourceCapability({}), 'unavailable')
})

test('media policy allows known HLS hosts and configured CDN hosts only', () => {
  assert.equal(isAllowedMediaUrl('https://s3.phim1280.tv/movie/master.m3u8'), true)
  assert.equal(isAllowedMediaUrl('https://v7.kkphimplayer7.com/movie/master.m3u8'), true)
  assert.equal(isAllowedMediaUrl('https://segments.example.com/a.ts', ['*.example.com']), true)
  assert.equal(isAllowedMediaUrl('https://example.com.evil.test/a.ts', ['*.example.com']), false)
  assert.equal(isAllowedMediaUrl('http://127.0.0.1/private.m3u8', ['127.0.0.1']), false)
  assert.equal(isAllowedMediaUrl('file:///etc/passwd', ['*']), false)
})

test('room creation media policy validates every HLS episode without requiring an upstream probe', () => {
  const allowed = [
    { id: 'one', linkM3u8: 'https://v7.kkphimplayer7.com/movie/master.m3u8' },
    { id: 'two', linkEmbed: 'https://player.phimapi.com/player/2' },
  ]
  assert.equal(findDeniedMediaEpisode(allowed), null)
  const denied = { id: 'three', linkM3u8: 'https://untrusted.example/movie/master.m3u8' }
  assert.equal(findDeniedMediaEpisode([...allowed, denied]), denied)
  assert.equal(findDeniedMediaEpisode([denied], ['untrusted.example']), null)
})

test('host successor is the earliest connected member with stable tie break', () => {
  const members = {
    host: { memberId: 'host', joinedAt: 1, connected: false },
    b: { memberId: 'b', joinedAt: 10, connected: true },
    a: { memberId: 'a', joinedAt: 10, connected: true },
    old: { memberId: 'old', joinedAt: 2, connected: false }
  }
  assert.equal(chooseHostSuccessor(members, 'host')?.memberId, 'a')
})

test('voice permission remains authoritative room state without duplicating media state', () => {
  const room = { voiceEnabled: true, members: { host: {}, guest: {} } }
  applyVoicePermission(room, false)
  assert.equal(room.voiceEnabled, false)
  assert.deepEqual(room.members, { host: {}, guest: {} })
})

test('LiveKit grant is scoped to microphone publishing and room subscription', () => {
  assert.deepEqual(buildVoiceGrant('ABC123'), {
    roomJoin: true,
    room: 'ABC123',
    canSubscribe: true,
    canPublish: true,
    canPublishData: false,
    canPublishSources: ['microphone']
  })
})

test('CORS allows configured web origins and local development without allowing arbitrary sites', () => {
  const origins = ['https://cinemind.vercel.app']
  assert.equal(isAllowedClientOrigin('https://cinemind.vercel.app', origins), true)
  assert.equal(isAllowedClientOrigin('http://localhost:3000', origins), true)
  assert.equal(isAllowedClientOrigin('http://127.0.0.1:3000', origins), true)
  assert.equal(isAllowedClientOrigin('https://malicious.example', origins), false)
})
