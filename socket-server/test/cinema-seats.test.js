import test from 'node:test'
import assert from 'node:assert/strict'
import { CinemaSeatStore, SEAT_GRACE_MS } from '../cinema-seats.js'

const room = { id: 'TEST', maxMembers: 8, expiresAt: 9999999999999 }
test('concurrent claims have one winner; rejected move preserves original seat', async () => {
  const store = new CinemaSeatStore()
  const claims = await Promise.all(['host', 'guest'].map(id => store.update(room, 'claim', id, 'A1', 100)))
  assert.equal(claims.filter(x => x.ok).length, 1)
  assert.equal(claims[1].code, 'SEAT_TAKEN')
  await store.update(room, 'claim', 'guest', 'A2', 110)
  const rejected = await store.update(room, 'claim', 'guest', 'A1', 120)
  assert.deepEqual(rejected.snapshot.seats, { A1: 'host', A2: 'guest' })
})
test('a member has one seat; retry is idempotent and release frees the seat', async () => {
  const store = new CinemaSeatStore()
  await store.update(room, 'claim', 'host', 'H4', 100)
  await store.update(room, 'claim', 'host', 'H4', 101)
  const moved = await store.update(room, 'claim', 'host', 'D2', 102)
  assert.deepEqual(moved.snapshot.seats, { D2: 'host' })
  const released = await store.update(room, 'release', 'host', '', 103)
  assert.deepEqual(released.snapshot.seats, {})
})
test('disconnect grace expires; heartbeat keeps the reservation', async () => {
  const store = new CinemaSeatStore()
  await store.update(room, 'claim', 'host', 'A1', 100)
  await store.update(room, 'renew', 'host', '', 100 + SEAT_GRACE_MS - 1)
  assert.equal((await store.update(room, 'claim', 'guest', 'A1', 100 + SEAT_GRACE_MS)).code, 'SEAT_TAKEN')
  assert.equal((await store.update(room, 'claim', 'guest', 'A1', 100 + SEAT_GRACE_MS * 2)).ok, true)
})
test('capacity and malformed seat IDs are enforced, room states stay isolated', async () => {
  const store = new CinemaSeatStore()
  for (const invalid of ['I1', 'A0', 'A5', '__proto__', 'a1', 'A10']) assert.equal((await store.update(room, 'claim', 'host', invalid)).code, 'INVALID_SEAT')
  assert.equal((await store.update({ ...room, maxMembers: 50 }, 'claim', 'host', 'M2')).code, 'INVALID_SEAT')
  assert.equal((await store.update(room)).snapshot.capacity, 36)
  assert.equal((await store.update(room, 'claim', 'host', 'V1')).code, 'ULTRA_REQUIRED')
  const vipRoom = { ...room, members: { host: { accountPlan: 'ultra' }, guest: { accountPlan: 'premium' } } }
  assert.equal((await store.update(vipRoom, 'claim', 'host', 'V1')).ok, true)
  assert.equal((await store.update(vipRoom, 'claim', 'guest', 'V2')).code, 'ULTRA_REQUIRED')
  assert.deepEqual((await store.update({ ...vipRoom, members: { host: { accountPlan: 'premium' } } }, 'renew', 'host')).snapshot.seats, {})
  assert.equal((await store.update({ ...room, maxMembers: 50 }, 'claim', 'guest', 'M3')).code, 'INVALID_SEAT')
  assert.deepEqual((await store.update({ ...room, id: 'OTHER' })).snapshot.seats, {})
})
