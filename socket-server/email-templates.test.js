import test from 'node:test'
import assert from 'node:assert/strict'
import { buildWatchPartyInviteEmail } from './email-templates.js'

test('watch-party invite email contains a join link and escapes user content', () => {
  const email = buildWatchPartyInviteEmail({ actorName: '<Nam>\r\nBcc: bad@example.com', movieTitle: 'A & B', roomId: 'ABC123', joinUrl: 'https://cine.example/watch-party/ABC123', expiresAt: Date.UTC(2026, 6, 30) })
  assert.match(email.subject, /CineMind/)
  assert.doesNotMatch(email.subject, /[\r\n]/)
  assert.match(email.text, /ABC123/)
  assert.match(email.html, /https:\/\/cine\.example\/watch-party\/ABC123/)
  assert.match(email.html, /&lt;Nam&gt;/)
  assert.doesNotMatch(email.html, /<Nam>/)
})
