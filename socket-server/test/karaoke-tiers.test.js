import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { Server } from 'socket.io'
import { io as connect } from 'socket.io-client'
import { registerKaraoke } from '../karaoke.js'

async function setup(t, env = {}) {
  const plans = { host: 'ultra', singer: 'premium', listener: 'normal', duet: 'ultra' }
  const server = http.createServer(), io = new Server(server), clients = [], grants = []
  const pilot = registerKaraoke(io, {
    env, getAccountPlan: async uid => plans[uid] || 'normal',
    verifyFirebaseToken: async uid => ({ uid, name: uid, exp: Math.floor(Date.now()/1000)+3600, firebase: { sign_in_provider: uid === 'anonymous' ? 'anonymous' : 'google.com' } }),
    credentials: { key:'key',secret:'secret-at-least-thirty-two-characters-long',url:'wss://example.test' },
    livekit: { updateParticipant: async (room,id,options) => grants.push({id,...options.permission}), deleteRoom:async()=>{}, removeParticipant:async()=>{} },
  })
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve))
  t.after(async () => { clients.forEach(s=>s.disconnect()); await new Promise(resolve=>io.close(resolve)); server.close() })
  const open = uid => new Promise((resolve,reject) => {
    const s = connect('http://127.0.0.1:'+server.address().port+'/karaoke',{auth:{firebaseIdToken:uid},forceNew:true,reconnection:false})
    clients.push(s);s.once('connect',()=>resolve(s));s.once('connect_error',reject)
  })
  const call=(s,event,data={})=>new Promise((resolve,reject)=>s.timeout(3000).emit(event,{clientEventId:crypto.randomUUID(),...data},(e,r)=>e?reject(e):resolve(r)))
  return { plans,pilot,grants,open,call }
}

test('public karaoke enforces every plan server-side, including forged plans and listener tokens',async t=>{
  const {open,call,pilot}=await setup(t,{NODE_ENV:'production',KARAOKE_PILOT_ENABLED:'false'})
  await assert.rejects(open('anonymous'),/đăng nhập/)
  const host=await open('host'), singer=await open('singer'), listener=await open('listener'), duet=await open('duet')
  assert.equal((await call(listener,'room:create',{accountPlan:'ultra'})).ok,false)
  assert.equal((await call(singer,'room:create')).ok,false)
  const created=await call(host,'room:create',{name:'Public room'});assert.equal(created.ok,true)
  const room=pilot.rooms.get(created.room.id)
  for(const s of [singer,listener,duet]) assert.equal((await call(s,'room:join',{roomId:room.id})).ok,true)
  assert.equal((await call(listener,'queue:add',{url:'https://youtu.be/abcdefghijk',plan:'ultra'})).ok,false)
  assert.equal((await call(singer,'queue:add',{url:'https://youtu.be/abcdefghijk'})).ok,true)
  const turnId=room.queue[0].id
  assert.equal((await call(singer,'duet:request',{turnId})).ok,false)
  assert.equal((await call(listener,'member:ban',{memberId:'host',blocked:true})).ok,false)
  assert.equal((await call(singer,'performance:prepare',{songId:turnId})).ok,true)
  assert.equal((await call(listener,'voice:authorize',{performanceId:turnId})).ok,false)
  assert.equal((await call(singer,'voice:authorize',{performanceId:turnId})).ok,true)
  const credentials=await call(listener,'voice:credentials')
  const claims=JSON.parse(Buffer.from(credentials.participantToken.split('.')[1],'base64url'))
  assert.equal(claims.video.canPublish,false);assert.equal(claims.video.canSubscribe,true)
  assert.equal((await call(duet,'duet:request',{turnId})).ok,true)
  assert.equal((await call(singer,'duet:select',{turnId,memberId:'duet'})).ok,false)
  let received
  host.once('room:reaction',data=>{received=data})
  assert.equal((await call(listener,'reaction:send',{kind:'clap'})).ok,true)
  await new Promise(resolve=>setTimeout(resolve,30))
  assert.equal(received.displayName,'listener');assert.equal(received.kind,'clap')
  assert.equal((await call(listener,'reaction:send',{kind:'clap'})).ok,false)
  assert.equal((await call(listener,'reaction:send',{kind:'<script>'})).ok,false)
})

test('Ultra duet and downgrade revoke a previously granted mic',async t=>{
  const {open,call,pilot,plans,grants}=await setup(t)
  const host=await open('host'), guest=await open('duet')
  const created=await call(host,'room:create'),room=pilot.rooms.get(created.room.id)
  await call(guest,'room:join',{roomId:room.id})
  await call(host,'queue:add',{url:'https://youtu.be/abcdefghijk'})
  const turnId=room.queue[0].id
  await call(guest,'duet:request',{turnId})
  assert.equal((await call(host,'duet:select',{turnId,memberId:'duet'})).ok,true)
  await call(host,'performance:prepare',{songId:turnId})
  assert.equal((await call(guest,'voice:authorize',{performanceId:turnId})).ok,true)
  plans.duet='normal';room.planCheckedAt=0
  await new Promise(resolve=>setTimeout(resolve,1400))
  assert.equal(room.performance.duetMemberId,null)
  assert.ok(grants.some(g=>g.id==='duet' && !g.canPublish))
  assert.equal((await call(guest,'voice:authorize',{performanceId:turnId})).ok,false)
})

test('maintenance switch refuses new connections',async t=>{
  const {open}=await setup(t,{KARAOKE_ENABLED:'false'})
  await assert.rejects(open('host'),/bảo trì/)
})
