import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { Server } from 'socket.io'
import { io as connect } from 'socket.io-client'
import { localKaraokeAccess, registerKaraoke } from '../karaoke.js'

test('open local access requires explicit development flag, loopback and a local origin', () => {
  const env = { NODE_ENV: 'development', KARAOKE_PILOT_ALLOW_ALL_LOCAL: 'true' }
  assert.equal(localKaraokeAccess(env, '127.0.0.1', 'http://localhost:3000'), true)
  assert.equal(localKaraokeAccess(env, '::1', 'http://[::1]:3000'), true)
  assert.equal(localKaraokeAccess(env, '::ffff:127.0.0.1'), true)
  assert.equal(localKaraokeAccess({ ...env, NODE_ENV: 'production' }, '127.0.0.1'), false)
  assert.equal(localKaraokeAccess({ NODE_ENV: 'development' }, '127.0.0.1'), false)
  assert.equal(localKaraokeAccess(env, '192.168.1.2', 'http://localhost:3000'), false)
  assert.equal(localKaraokeAccess(env, '127.0.0.1', 'https://example.com'), false)
  assert.equal(localKaraokeAccess(env, '127.0.0.1', 'invalid'), false)
})

test('local development admits authenticated users without allowlisting but rejects anonymous and production access', async t => {
  for (const mode of ['development', 'production']) {
    const server = http.createServer(), io = new Server(server), clients = []
    const pilot = registerKaraoke(io, { verifyFirebaseToken: async uid => ({ uid, exp: Math.floor(Date.now() / 1000) + 3600, firebase: { sign_in_provider: uid === 'anon' ? 'anonymous' : 'google.com' } }), env: { NODE_ENV: mode, KARAOKE_PILOT_ENABLED: 'true', KARAOKE_PILOT_ALLOW_ALL_LOCAL: 'true' } })
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    t.after(() => { clients.forEach(s => s.disconnect()); io.close(); server.close() })
    const open = uid => new Promise((resolve, reject) => { const s = connect(`http://127.0.0.1:${server.address().port}/karaoke`, { auth: { firebaseIdToken: uid }, forceNew: true, reconnection: false }); clients.push(s); s.once('connect', () => resolve(s)); s.once('connect_error', reject) })
    await assert.rejects(open('anon'), /Pilot/)
    if (mode === 'production') await assert.rejects(open('unlisted'), /Pilot/)
    else {
      const client = await open('unlisted')
      const created = await new Promise(resolve => client.emit('room:create', { name: 'Local' }, resolve))
      assert.equal(created.ok, true)
      assert.equal(pilot.rooms.size, 1)
    }
  }
})

test('real namespace enforces allowlist, turns, subscribe-only tokens and deduplication', async t => {
  const server=http.createServer(), io=new Server(server), grants=[]
  let failRevocation=false
  const pilot=registerKaraoke(io, {verifyFirebaseToken:async token=>({uid:token,name:token,exp:Math.floor(Date.now()/1000)+3600}),env:{KARAOKE_PILOT_ENABLED:'true',KARAOKE_PILOT_UIDS:'a,b'},livekit:{updateParticipant:async(...args)=>{grants.push(args);if(failRevocation && !args[2].permission.canPublish){failRevocation=false;throw Error('temporary outage')}},deleteRoom:async()=>{}},credentials:{key:'key',secret:'secret-at-least-thirty-two-characters-long',url:'wss://example.test'}})
  await new Promise(r=>server.listen(0,'127.0.0.1',r))
  const clients=[]
  t.after(()=>{ clients.forEach(s=>s.disconnect()); io.close(); server.close() })
  const open=uid=>new Promise((resolve,reject)=>{ const s=connect(`http://127.0.0.1:${server.address().port}/karaoke`,{auth:{firebaseIdToken:uid},forceNew:true,reconnection:false});clients.push(s);s.once('connect',()=>resolve(s));s.once('connect_error',reject) })
  await assert.rejects(open('outsider'),/Pilot/)
  const a=await open('a'),b=await open('b')
  const call=(s,event,data={})=>new Promise((resolve,reject)=>s.timeout(2000).emit(event,{clientEventId:crypto.randomUUID(),...data},(err,r)=>err?reject(err):resolve(r)))
  const created=await call(a,'room:create',{name:'Test'});assert.equal(created.ok,true)
  const id=created.room.id
  assert.equal((await call(b,'room:join',{roomId:id})).ok,true)
  const add={url:'https://youtu.be/abcdefghijk',clientEventId:'unique-id'}
  await call(b,'queue:add',add);await call(b,'queue:add',add)
  const r=pilot.rooms.get(id); assert.equal(r.queue.length,1)
  assert.equal((await call(a,'performance:prepare',{songId:r.queue[0].id,singerMemberId:'a'})).ok,false)
  await call(b,'performance:prepare',{songId:r.queue[0].id})
  const performanceId=r.performance.performanceId
  assert.equal((await call(b,'performance:start',{performanceId})).ok,false)
  const credentials=await call(b,'voice:credentials')
  const claims=JSON.parse(Buffer.from(credentials.participantToken.split('.')[1],'base64url').toString())
  assert.equal(claims.video.canPublish,false)
  assert.equal((await call(a,'voice:authorize',{performanceId})).ok,false)
  assert.equal((await call(b,'voice:authorize',{performanceId})).ok,true)
  assert.equal((await call(b,'performance:start',{performanceId})).ok,true)
  await call(a,'player:report',{performanceId,seq:1,currentTime:900,state:'playing'})
  assert.equal(r.performance.playback.currentTime,0)
  assert.equal((await call(a,'performance:pause',{performanceId})).ok,false)
  await call(b,'performance:pause',{performanceId})
  assert.deepEqual(grants.map(g=>g[2].permission.canPublish),[true,false])
  await call(b,'voice:authorize',{performanceId});await call(b,'performance:start',{performanceId})
  failRevocation=true
  b.disconnect()
  for(let i=0;i<200 && (r.members.b.connected || r.performance.mics.b.authorized);i++) await new Promise(resolve=>setTimeout(resolve,10))
  assert.equal(r.members.b.connected,false);assert.equal(r.performance.state,'paused');assert.equal(r.performance.mics.b.authorized,false)
  assert.equal((await call(a,'room:close')).ok,true)
  assert.equal(pilot.rooms.size,0)
})

test('duet grants at most two microphones and blocks replacement while revocation fails',async t=>{
  const server=http.createServer(),io=new Server(server),clients=[],grants=[]
  let fail=false
  const pilot=registerKaraoke(io,{verifyFirebaseToken:async uid=>({uid,name:uid,exp:Math.floor(Date.now()/1000)+3600}),env:{KARAOKE_PILOT_ENABLED:'true',KARAOKE_PILOT_UIDS:'a,b,c,d'},credentials:{key:'key',secret:'secret-at-least-thirty-two-characters-long',url:'wss://example.test'},livekit:{updateParticipant:async(room,id,options)=>{if(fail && id==='c' && !options.permission.canPublish)throw Error('provider secret');grants.push([id,options.permission.canPublish])},removeParticipant:async()=>{},deleteRoom:async()=>{}}})
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  t.after(()=>{clients.forEach(s=>s.disconnect());io.close();server.close()})
  const open=uid=>new Promise((resolve,reject)=>{const s=connect(`http://127.0.0.1:${server.address().port}/karaoke`,{auth:{firebaseIdToken:uid},forceNew:true,reconnection:false});clients.push(s);s.once('connect',()=>resolve(s));s.once('connect_error',reject)})
  const call=(socket,event,data={})=>new Promise((resolve,reject)=>socket.timeout(2000).emit(event,{clientEventId:crypto.randomUUID(),...data},(error,result)=>error?reject(error):resolve(result)))
  const [a,b,c,d]=await Promise.all(['a','b','c','d'].map(open)),created=await call(a,'room:create'),id=created.room.id
  for(const socket of [b,c,d])assert.equal((await call(socket,'room:join',{roomId:id})).ok,true)
  await call(b,'queue:add',{url:'https://youtu.be/abcdefghijk'})
  const room=pilot.rooms.get(id),turnId=room.queue[0].id
  await call(c,'duet:request',{turnId});await call(d,'duet:request',{turnId})
  assert.equal((await call(a,'duet:select',{turnId,memberId:'c'})).ok,false)
  await call(b,'duet:select',{turnId,memberId:'c'});await call(b,'performance:prepare',{songId:turnId})
  const performanceId=room.performance.performanceId
  assert.equal((await call(c,'voice:authorize',{performanceId})).ok,true)
  assert.equal((await call(b,'voice:authorize',{performanceId})).ok,true)
  assert.equal((await call(d,'voice:authorize',{performanceId})).ok,false)
  await call(b,'performance:start',{performanceId})
  assert.equal((await call(c,'performance:pause',{performanceId})).ok,false)
  await call(c,'player:report',{performanceId,seq:100,currentTime:900,state:'playing'})
  assert.equal(room.performance.playback.currentTime,0)
  fail=true
  const rejected=await call(b,'duet:select',{turnId,memberId:'d'})
  assert.equal(rejected.ok,false);assert.ok(!rejected.error.includes('provider secret'))
  assert.equal((await call(d,'voice:authorize',{performanceId})).ok,false)
  assert.equal(room.performance.duetMemberId,'c')
  fail=false;await call(b,'duet:select',{turnId,memberId:'d'})
  assert.equal((await call(d,'voice:authorize',{performanceId})).ok,true)
  assert.ok(grants.findIndex(([id,on])=>id==='c' && !on)<grants.findIndex(([id,on])=>id==='d' && on))
  await call(a,'member:mic',{memberId:'d',blocked:true})
  assert.equal(room.performance.duetMemberId,null);assert.equal(room.performance.state,'playing')
  await call(a,'member:ban',{memberId:'c',blocked:true})
  assert.equal(room.banned.c,true)
  await assert.rejects(open('outsider'),/Pilot/)
  // A new socket for the banned UID cannot join even though it is allowlisted.
  const replacement=await open('c');assert.equal((await call(replacement,'room:join',{roomId:id})).ok,false)
})
