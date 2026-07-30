import test from 'node:test'
import assert from 'node:assert/strict'
import { buildWatchPartyInviteEmail } from './email-templates.js'

test('watch-party invite email contains a join link and escapes user content', () => {
  const email = buildWatchPartyInviteEmail({
    actorName: '<Nam>\r\nBcc: bad@example.com',
    movieTitle: 'A & B',
    movieOriginalTitle: 'Agent <Kim>',
    moviePosterUrl: 'https://img.example/poster.jpg',
    movieYear: 2026,
    movieDuration: '67 phút/tập',
    movieType: 'series',
    movieGenres: ['Hành động', '<Tâm lý>'],
    movieQuality: 'FHD',
    movieLanguage: 'Vietsub + Thuyết minh',
    movieRating: 7.7,
    roomId: 'ABC123',
    joinUrl: 'https://cine.example/watch-party/ABC123',
    expiresAt: Date.UTC(2026, 6, 30),
  })
  assert.match(email.subject, /CineMind/)
  assert.doesNotMatch(email.subject, /[\r\n]/)
  assert.match(email.text, /ABC123/)
  assert.match(email.html, /https:\/\/cine\.example\/watch-party\/ABC123/)
  assert.match(email.html, /https:\/\/img\.example\/poster\.jpg/)
  assert.match(email.html, /67 phút\/tập/)
  assert.match(email.html, /Phim bộ/)
  assert.match(email.html, /★ 7\.7/)
  assert.match(email.html, /Hành động/)
  assert.match(email.html, /&lt;Tâm lý&gt;/)
  assert.match(email.html, /@media only screen and \(max-width:600px\)/)
  assert.match(email.html, /&lt;Nam&gt;/)
  assert.match(email.html, /Agent &lt;Kim&gt;/)
  assert.doesNotMatch(email.html, /<Nam>/)
})

test('watch-party invite email omits unsafe or missing poster URLs', () => {
  const email = buildWatchPartyInviteEmail({ actorName: 'Nam', movieTitle: 'CineMind', moviePosterUrl: 'javascript:alert(1)', roomId: 'ABC123', joinUrl: 'https://cine.example/watch-party/ABC123', expiresAt: Date.UTC(2026, 6, 30) })
  assert.doesNotMatch(email.html, /<img/)
  assert.doesNotMatch(email.html, /javascript:/)
  assert.match(email.html, /padding:0 28px 28px/)
})
