import test from 'node:test'
import assert from 'node:assert/strict'
import { KaraokePilot, youtubeId } from '../karaoke.js'
test('YouTube parser rejects external hosts, live, credentials and playlists', () => {
  for (const url of ['https://youtube.com.evil.test/watch?v=abcdefghijk','http://youtu.be/abcdefghijk','https://youtube.com/live/abcdefghijk','https://youtube.com/playlist?list=x','https://evil@youtube.com/watch?v=abcdefghijk']) assert.throws(() => youtubeId(url))
  for (const url of ['https://youtu.be/abcdefghijk?t=30','https://www.youtube.com/watch?v=abcdefghijk&list=x','https://youtube.com/shorts/abcdefghijk']) assert.equal(youtubeId(url), 'abcdefghijk')
})
test('pilot limits rooms and ownership; snapshots do not expose socket IDs', () => {
  const p = new KaraokePilot({}), r = p.create('a', 'Test')
  assert.throws(() => p.create('a'))
  p.create('b'); assert.throws(() => p.create('c'))
  r.members.a = { uid:'a', socketId:'secret', displayName:'Tester', connected:true }
  assert.equal(p.snapshot(r).members.a.socketId, undefined)
})
test('failed revocation retains turn and marks both microphones for retry', async () => {
  const p = new KaraokePilot({ livekit: { updateParticipant: async () => { throw Error('offline') } } }), r = p.create('a')
  const host = { uid:'a', memberId:'a' }; r.members.b = { memberId:'b', connected:true }
  r.performance = { performanceId:'turn', state:'playing', mics:{a:{authorized:true},b:{authorized:true}}, singerMemberId:'a', playback:{isPlaying:true} }
  r.queue = [{id:'song'}]
  await assert.rejects(p.command(r, host, 'performance:end', {performanceId:'turn'}), /thu hồi mic/)
  assert.equal(r.performance.singerMemberId,'a'); assert.equal(r.performance.state,'paused'); assert.equal(r.queue.length,1)
  assert.equal(r.performance.mics.a.revocationPending,true)
  assert.equal(r.performance.mics.b.revocationPending,true)
  p.livekit.updateParticipant=async()=>{}
  await p.revoke(r);assert.equal(r.performance.mics.a.authorized,false);assert.equal(r.performance.mics.b.revocationPending,false)
})
test('serialized room operations recover after failure and enforce queue permissions', async () => {
  const p = new KaraokePilot({}), r=p.create('host'), guest={uid:'guest',memberId:'guest'}
  await assert.rejects(p.lock(r.id, async()=>{throw Error('test')}))
  await p.lock(r.id, ()=>p.command(r,guest,'queue:add',{url:'https://youtu.be/abcdefghijk'}))
  await assert.rejects(p.command(r,{uid:'stranger',memberId:'stranger'},'queue:remove',{id:r.queue[0].id}))
  await p.command(r,guest,'queue:remove',{id:r.queue[0].id}); assert.equal(r.queue.length,0)
})
test('departed LiveKit singer is already revoked and does not trap room closure',async()=>{
  const p=new KaraokePilot({livekit:{updateParticipant:async()=>{throw Object.assign(Error('absent'),{code:'not_found'})},deleteRoom:async()=>{throw Object.assign(Error('absent'),{status:404})}}}),r=p.create('host')
  r.performance={mics:{departed:{authorized:true}},singerMemberId:'departed',state:'playing',playback:{isPlaying:true}}
  await p.close(r);assert.equal(r.performance.mics.departed.authorized,false);assert.equal(p.rooms.size,0)
})

function setup() {
  const calls=[], pilot=new KaraokePilot({livekit:{updateParticipant:async (...args)=>calls.push(args),removeParticipant:async()=>{}}}), room=pilot.create('host')
  for (const uid of ['host','owner','duet','other']) room.members[uid]={uid,memberId:uid,connected:true,displayName:uid}
  const command=(uid,event,data={})=>pilot.command(room,room.members[uid],event,data)
  return {pilot,room,command,calls}
}
test('turn ownership is immutable; another user may register the same video; bulk enqueue is atomic', async()=>{
  const {room,command}=setup(), song={url:'https://youtu.be/abcdefghijk'}
  await command('owner','queue:add',song)
  await assert.rejects(command('owner','queue:add',song))
  await command('duet','queue:add',song)
  await assert.rejects(command('host','performance:prepare',{songId:room.queue[0].id,singerMemberId:'host'}))
  await command('owner','performance:prepare',{songId:room.queue[0].id,singerMemberId:'host'})
  assert.equal(room.performance.singerMemberId,'owner')
  await assert.rejects(command('owner','queue:add',song))
  await assert.rejects(command('other','queue:add-many',{songs:[{url:'https://youtu.be/lmnopqrstuv'},{url:'https://evil.test/video'}]}))
  assert.equal(room.queue.length,1)
  await assert.rejects(command('duet','performance:end',{performanceId:room.performance.performanceId}))
  await command('host','performance:end',{performanceId:room.performance.performanceId})
  assert.equal(room.performance.singerMemberId,'duet');assert.equal(room.performance.state,'preparing')
  assert.equal(room.performance.playback.isPlaying,false)
})
test('duet requests survive preparing the turn; only owner may select and replacement waits for revocation',async()=>{
  const {pilot,room,command}=setup()
  await command('owner','queue:add',{url:'https://youtu.be/abcdefghijk'})
  const turnId=room.queue[0].id
  await command('duet','duet:request',{turnId});await command('duet','duet:request',{turnId})
  await command('other','duet:request',{turnId})
  assert.equal(room.queue[0].requests.length,2)
  await assert.rejects(command('host','duet:select',{turnId,memberId:'duet'}))
  await command('owner','duet:select',{turnId,memberId:'duet'})
  await command('owner','performance:prepare',{songId:turnId})
  const p=room.performance
  assert.equal(p.duetMemberId,'duet');assert.deepEqual(p.mics,{})
  p.state='playing';p.playback.isPlaying=true;p.mics.duet={authorized:true,revocationPending:false}
  pilot.livekit.updateParticipant=async()=>{throw Error('provider secret')}
  await assert.rejects(command('owner','duet:select',{turnId,memberId:'other'}),/thu hồi mic/)
  assert.equal(p.duetMemberId,'duet');assert.equal(p.mics.duet.revocationPending,true)
  assert.equal(p.state,'playing')
  pilot.livekit.updateParticipant=async()=>{}
  await command('owner','duet:select',{turnId,memberId:'other'})
  assert.equal(p.duetMemberId,'other');assert.equal(p.mics.duet.authorized,false)
  assert.equal(p.mics.other,undefined)
})
test('mic blocks end owner turn, skip blocked owners, and never restore a duet automatically',async()=>{
  const {room,command}=setup()
  await command('owner','queue:add',{url:'https://youtu.be/abcdefghijk'})
  await command('duet','queue:add',{url:'https://youtu.be/lmnopqrstuv'})
  await command('other','queue:add',{url:'https://youtu.be/zyxwvutsrqp'})
  const id=room.queue[0].id
  await command('owner','performance:prepare',{songId:id})
  await command('host','member:mic',{memberId:'duet',blocked:true})
  await command('host','member:mic',{memberId:'owner',blocked:true})
  assert.equal(room.performance.singerMemberId,'other');assert.equal(room.queue[0].addedBy,'duet')
  await command('host','member:mic',{memberId:'duet',blocked:false})
  assert.equal(room.performance.singerMemberId,'other')
  await assert.rejects(command('host','member:mic',{memberId:'host',blocked:true}))
  await command('host','member:ban',{memberId:'duet',blocked:true})
  assert.equal(room.banned.duet,true);assert.equal(room.members.duet.connected,false);assert.equal(room.queue.length,0)
})
test('duet disconnect keeps solo playing; owner disconnect holds a paused turn and removes queued songs only on voluntary leave',async()=>{
  const {pilot,room,command}=setup()
  await command('owner','queue:add',{url:'https://youtu.be/abcdefghijk'})
  const turnId=room.queue[0].id
  await command('duet','duet:request',{turnId});await command('owner','duet:select',{turnId,memberId:'duet'})
  await command('owner','performance:prepare',{songId:turnId})
  const p=room.performance;p.state='playing';p.playback.isPlaying=true;p.mics.owner={authorized:true};p.mics.duet={authorized:true}
  await pilot.depart(room,room.members.duet)
  assert.equal(p.duetMemberId,null);assert.equal(p.state,'playing');assert.equal(p.mics.owner.authorized,true)
  await command('owner','queue:add',{url:'https://youtu.be/lmnopqrstuv'})
  await pilot.depart(room,room.members.owner)
  assert.equal(p.state,'paused');assert.equal(p.mics.owner.authorized,false);assert.ok(p.ownerDeadline);assert.equal(room.queue.length,1)
  await pilot.depart(room,room.members.owner,true)
  assert.equal(room.queue.length,0);assert.equal(p.state,'ended');assert.deepEqual(p.requests,[])
})
