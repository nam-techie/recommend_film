import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'

const projectId = 'demo-moviewiser-rules-test'
const databaseNamespace = `${projectId}-default-rtdb`
const databaseBase = `http://127.0.0.1:9000/.json?ns=${databaseNamespace}`
const authBase = `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-key`
const users = {}

async function createUser(name) {
  const response = await fetch(authBase, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) })
  assert.equal(response.status, 200)
  const value = await response.json()
  users[name] = { uid: value.localId, token: value.idToken }
}
const url = (path, token) => `http://127.0.0.1:9000/${path}.json?ns=${databaseNamespace}${token ? `&auth=${encodeURIComponent(token)}` : ''}`
const write = (path, value, actor) => fetch(url(path, users[actor]?.token), { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(value) })
const patch = (path, value, actor) => fetch(url(path, users[actor]?.token), { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(value) })
const read = (path, actor) => fetch(url(path, users[actor]?.token))

before(async () => {
  await Promise.all(['alice', 'bob', 'mallory'].map(createUser))
  const now = Date.now()
  const profiles = Object.fromEntries(Object.entries(users).map(([name, user]) => [user.uid, { uid: user.uid, username: name, displayName: name[0].toUpperCase() + name.slice(1), createdAt: now, updatedAt: now, isPublic: true, showRecentMovies: true, showWatchlist: true, showActivity: true, allowWatchPartyInvites: true }]))
  const response = await fetch(databaseBase, { method: 'PUT', headers: { 'content-type': 'application/json', Authorization: 'Bearer owner' }, body: JSON.stringify({ publicProfiles: profiles }) })
  assert.ok([200, 401].includes(response.status))
  // Emulator owner token is accepted through the REST auth override only when rules are disabled;
  // seed through each profile owner's allowed path instead.
  if (response.status !== 200) await Promise.all(Object.entries(profiles).map(([uid, profile]) => write(`publicProfiles/${uid}`, profile, Object.keys(users).find((name) => users[name].uid === uid))))
})

after(async () => { await fetch(databaseBase, { method: 'DELETE' }).catch(() => undefined) })

test('sender can request, cannot self-request, and blocked users are denied', async () => {
  const now = Date.now()
  const request = { uid: users.alice.uid, username: 'alice', displayName: 'Alice', createdAt: now }
  assert.equal((await patch('', { [`friendRequests/${users.bob.uid}/${users.alice.uid}`]: request, [`sentFriendRequests/${users.alice.uid}/${users.bob.uid}`]: { uid: users.bob.uid, username: 'bob', displayName: 'Bob', createdAt: now } }, 'alice')).status, 200)
  assert.equal((await write(`friendRequests/${users.alice.uid}/${users.alice.uid}`, request, 'alice')).status, 401)
  assert.equal((await write(`blocks/${users.bob.uid}/${users.mallory.uid}`, true, 'bob')).status, 200)
  assert.equal((await write(`friendRequests/${users.bob.uid}/${users.mallory.uid}`, { uid: users.mallory.uid, username: 'mallory', displayName: 'Mallory', createdAt: now }, 'mallory')).status, 401)
})

test('only recipient accepts and presence is readable only after friendship', async () => {
  const now = Date.now()
  const friendshipPatch = {
    [`friendships/${users.alice.uid}/${users.bob.uid}`]: { uid: users.bob.uid, username: 'bob', displayName: 'Bob', createdAt: now },
    [`friendships/${users.bob.uid}/${users.alice.uid}`]: { uid: users.alice.uid, username: 'alice', displayName: 'Alice', createdAt: now },
    [`friendRequests/${users.bob.uid}/${users.alice.uid}`]: null,
    [`sentFriendRequests/${users.alice.uid}/${users.bob.uid}`]: null,
  }
  assert.equal((await patch('', friendshipPatch, 'alice')).status, 401)
  assert.equal((await patch('', friendshipPatch, 'bob')).status, 200)
  assert.equal((await write(`presenceConnections/${users.alice.uid}/tab`, true, 'alice')).status, 200)
  assert.equal((await read(`presenceConnections/${users.alice.uid}`, 'bob')).status, 200)
  assert.equal((await read(`presenceConnections/${users.alice.uid}`, 'mallory')).status, 401)
  assert.equal((await patch('', { [`friendships/${users.alice.uid}/${users.bob.uid}`]: null, [`friendships/${users.bob.uid}/${users.alice.uid}`]: null }, 'alice')).status, 200)
  assert.equal((await read(`presenceConnections/${users.alice.uid}`, 'bob')).status, 401)
})
