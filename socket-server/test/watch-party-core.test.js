import assert from 'node:assert/strict'
import test from 'node:test'
import { applyMemberMicState, applyVoicePermission, chooseHostSuccessor, hashRoomPassword, sourceCapability, verifyRoomPassword } from '../watch-party-core.js'

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

test('host successor is the earliest connected member with stable tie break', () => {
  const members = {
    host: { memberId: 'host', joinedAt: 1, connected: false },
    b: { memberId: 'b', joinedAt: 10, connected: true },
    a: { memberId: 'a', joinedAt: 10, connected: true },
    old: { memberId: 'old', joinedAt: 2, connected: false }
  }
  assert.equal(chooseHostSuccessor(members, 'host')?.memberId, 'a')
})

test('disabling room voice mutes and removes every member from voice', () => {
  const room = {
    voiceEnabled: true,
    members: {
      host: { micEnabled: true, voiceJoined: true },
      guest: { micEnabled: false, voiceJoined: true }
    }
  }
  applyVoicePermission(room, false)
  assert.equal(room.voiceEnabled, false)
  assert.deepEqual(room.members.host, { micEnabled: false, voiceJoined: false })
  assert.deepEqual(room.members.guest, { micEnabled: false, voiceJoined: false })
})

test('member can only unmute after the host enables voice', () => {
  const room = { voiceEnabled: false, members: { guest: { micEnabled: false, voiceJoined: false } } }
  assert.deepEqual(applyMemberMicState(room, 'guest', true), { ok: false, code: 'VOICE_DISABLED' })

  applyVoicePermission(room, true)
  assert.equal(applyMemberMicState(room, 'guest', true).ok, true)
  assert.deepEqual(room.members.guest, { micEnabled: true, voiceJoined: true })
})
