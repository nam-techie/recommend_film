import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { Server } from 'socket.io'
import { io as connect } from 'socket.io-client'
import { CinemaCharacterStore, registerCharacterHandler } from '../cinema-characters.js'

test('two viewers, late join and reconnect receive the same authoritative character', async t => {
  const server = http.createServer(), io = new Server(server), characters = new CinemaCharacterStore()
  const raw = { id: 'TEST01', status: 'active', expiresAt: Date.now() + 60000, members: { a: { memberId: 'a', connected: true, accountPlan: 'ultra' }, b: { memberId: 'b', connected: true, accountPlan: 'normal' } } }
  const store = { getRoom: async id => id === raw.id ? characters.hydrate(structuredClone(raw)) : null, allow: async () => true }
  const identities = { a: { roomId: raw.id, memberId: 'a', deviceRole: 'screen' }, b: { roomId: raw.id, memberId: 'b', deviceRole: 'screen' }, remote: { roomId: raw.id, memberId: 'a', deviceRole: 'remote' } }
  io.use((socket, next) => { socket.data.identity = identities[socket.handshake.auth.token]; next(socket.data.identity ? undefined : new Error('UNAUTHORIZED')) })
  io.on('connection', async socket => {
    socket.join(raw.id)
    registerCharacterHandler(socket, { io, store, characters })
    socket.emit('room:snapshot', await store.getRoom(raw.id))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${server.address().port}`, clients = []
  t.after(async () => { clients.forEach(socket => socket.disconnect()); await new Promise(resolve => io.close(resolve)) })
  const join = token => new Promise((resolve, reject) => {
    const socket = connect(url, { auth: { token }, transports: ['websocket'], forceNew: true })
    clients.push(socket); socket.once('connect_error', reject)
    socket.once('room:snapshot', snapshot => resolve({ socket, snapshot }))
  })
  const a = await join('a'), b = await join('b')
  const received = new Promise(resolve => b.socket.once('cinema:character', resolve))
  const result = await a.socket.timeout(2000).emitWithAck('cinema:character', { gender: 'male' })
  assert.deepEqual(await received, { memberId: 'a', characterGender: 'male', characterRevision: 1 })
  assert.equal(result.ok, true)
  const second = await a.socket.timeout(2000).emitWithAck('cinema:character', { gender: 'female' })
  assert.equal(second.characterRevision, 2)
  // A stale browser initializing from localStorage cannot overwrite an existing choice.
  const initialized = await a.socket.timeout(2000).emitWithAck('cinema:character', { gender: 'male', initialize: true })
  assert.equal(initialized.characterGender, 'female')
  const late = await join('b')
  assert.equal(late.snapshot.members.a.characterGender, 'female')
  a.socket.disconnect()
  const resumed = await join('a')
  assert.equal(resumed.snapshot.members.a.characterGender, 'female')
  assert.equal(resumed.snapshot.members.a.accountPlan, 'ultra')
  assert.equal(resumed.snapshot.members.b.characterGender, undefined)
  // Only gender can be changed; identity and tier always come from the server.
  for (const payload of [{ gender: 'male_vip' }, { gender: 'male', memberId: 'b' }, { gender: 'male', accountPlan: 'ultra' }]) {
    assert.equal((await resumed.socket.timeout(2000).emitWithAck('cinema:character', payload)).code, 'INVALID_CHARACTER')
  }
  const remote = await join('remote')
  assert.equal((await remote.socket.timeout(2000).emitWithAck('cinema:character', { gender: 'male' })).code, 'SCREEN_ONLY')
  store.allow = async () => false
  assert.equal((await b.socket.timeout(2000).emitWithAck('cinema:character', { gender: 'male' })).code, 'RATE_LIMITED')
  raw.status = 'closed'
  assert.equal((await b.socket.timeout(2000).emitWithAck('cinema:character', { gender: 'male' })).code, 'ROOM_NOT_FOUND')
  await characters.delete(raw.id)
  assert.deepEqual(await characters.read(raw.id), {})
})
