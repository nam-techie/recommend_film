import crypto from 'node:crypto'
import { AccessToken, TrackSource } from 'livekit-server-sdk'

export function youtubeId(input) {
  const u = new URL(input)
  if (u.protocol !== 'https:' || u.username || u.password || u.port) throw Error('Link YouTube HTTPS không hợp lệ.')
  const host = u.hostname.toLowerCase()
  let id
  if (host === 'youtu.be') id = u.pathname.slice(1)
  else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)) {
    id = u.pathname === '/watch' ? u.searchParams.get('v') : /^\/(shorts|embed)\/([^/]+)$/.exec(u.pathname)?.[2]
  }
  if (!/^[\w-]{11}$/.test(id || '')) throw Error('Dùng link video watch, youtu.be, shorts hoặc embed; không dùng playlist/live.')
  return id
}

export class KaraokePilot {
  constructor({ livekit, credentials, now = Date.now }) {
    this.rooms = new Map(); this.locks = new Map(); this.livekit = livekit; this.credentials = credentials; this.now = now
    this.prefix = 'karaoke-pilot-' + crypto.randomUUID() + '-'
  }
  lock(key, work) {
    const job = (this.locks.get(key) || Promise.resolve()).catch(() => {}).then(work)
    this.locks.set(key, job)
    void job.finally(() => { if (this.locks.get(key) === job) this.locks.delete(key) }).catch(() => {})
    return job
  }
  create(uid, name) {
    if (this.rooms.size >= 2) throw Error('Đã đủ 2 phòng thử nghiệm.')
    if ([...this.rooms.values()].some(r => r.hostUid === uid)) throw Error('Bạn đã sở hữu một phòng.')
    const now = this.now(), id = crypto.randomBytes(5).toString('hex').toUpperCase()
    const room = { id, name: String(name || 'Phòng hát thử').slice(0, 80), hostUid: uid, members: {}, queue: [], performance: null, micBlocked: {}, banned: {}, removalPending: {}, revision: 0, expiresAt: now + 7200000, emptySince: now, seen: new Map() }
    this.rooms.set(id, room); return room
  }
  snapshot(r) {
    const { seen, hostUid, removalPending, ...data } = r
    return { ...data, members: Object.fromEntries(Object.entries(r.members).map(([id,m]) => [id, { memberId:id, displayName:m.displayName, connected:m.connected, host:m.uid === hostUid }])) }
  }
  room(id) { const r = this.rooms.get(id); if (!r || r.expiresAt <= this.now()) throw Error('Phòng không còn tồn tại.'); return r }
  async revokeMember(r, id) {
    const mic = r.performance?.mics[id]
    if (!mic || (!mic.authorized && !mic.revocationPending)) return
    mic.revocationPending = true
    try {
      if (!this.livekit) throw Error('Voice chưa sẵn sàng.')
      await this.livekit.updateParticipant(this.prefix + r.id, id, { permission: { canPublish:false, canSubscribe:true, canPublishData:false } })
    } catch(e) { if (e?.status !== 404 && e?.code !== 'not_found') throw Error('Đang thu hồi mic. Vui lòng chờ rồi thử lại.') }
    mic.authorized = false; mic.revocationPending = false
  }
  async revoke(r) {
    const p = r.performance; if (!p) return
    p.state = 'paused'; p.playback.isPlaying = false
    // Mark every publisher before the first await so a provider outage cannot
    // leave the second mic outside the independent retry path.
    for (const mic of Object.values(p.mics)) if (mic.authorized) mic.revocationPending = true
    const results = await Promise.allSettled(Object.keys(p.mics).map(id => this.revokeMember(r,id)))
    if (results.some(result => result.status === 'rejected')) throw Error('Đang thu hồi mic. Vui lòng chờ rồi thử lại.')
  }
  next(r) {
    if (r.performance && r.performance.state !== 'ended') return
    const index = r.queue.findIndex(song => r.members[song.addedBy]?.connected && !r.banned[song.addedBy] && !r.micBlocked[song.addedBy])
    if (index < 0) return
    const [song] = r.queue.splice(index,1)
    if (song.duetMemberId && (!r.members[song.duetMemberId]?.connected || r.micBlocked[song.duetMemberId] || r.banned[song.duetMemberId])) song.duetMemberId = null
    r.performance = { performanceId:song.id, song, singerMemberId:song.addedBy, duetMemberId:song.duetMemberId || null, requests:song.requests || [], mics: {}, state:'preparing', seq:-1, lastReportAt:this.now(), playback:{currentTime:0,isPlaying:false,serverUpdatedAt:this.now()} }
  }
  async finish(r) {
    const p = r.performance; if (!p) return
    p.finishPending = true
    await this.revoke(r); p.state = 'ended'; p.requests = []; p.duetMemberId = null; p.finishPending = false
    this.next(r)
  }
  async dropDuet(r) {
    const p = r.performance; if (!p?.duetMemberId) return
    p.duetRemovalPending = true
    await this.revokeMember(r,p.duetMemberId)
    p.duetMemberId = null; p.duetRemovalPending = false
  }
  async depart(r, member, voluntary = false) {
    member.connected = false
    if (voluntary) r.queue = r.queue.filter(song => song.addedBy !== member.memberId)
    for (const song of r.queue) {
      song.requests = (song.requests || []).filter(id => id !== member.memberId)
      if (song.duetMemberId === member.memberId) song.duetMemberId = null
    }
    const p = r.performance
    if (p) {
      p.requests = p.requests.filter(id => id !== member.memberId)
      if (p.singerMemberId === member.memberId) {
        if (voluntary) await this.finish(r)
        else { p.ownerDeadline = this.now()+30000; await this.revoke(r) }
      } else if (p.duetMemberId === member.memberId) await this.dropDuet(r)
    }
  }
  async close(r) {
    await this.revoke(r)
    if (this.livekit) { try { await this.livekit.deleteRoom(this.prefix + r.id) } catch(e) { if (e?.status !== 404 && e?.code !== 'not_found') throw Error('Chưa đóng được phòng. Hãy thử lại.') } }
    this.rooms.delete(r.id)
  }
  async removeBannedVoice(r, id) {
    if (!this.livekit) { delete r.removalPending[id]; return }
    try { await this.livekit.removeParticipant(this.prefix + r.id, id) }
    catch(e) { if (e?.status !== 404 && e?.code !== 'not_found') throw Error('Đang ngắt phiên âm thanh của thành viên. Vui lòng chờ.') }
    delete r.removalPending[id]
  }
  async command(r, member, event, data) {
    const host = member.uid === r.hostUid, p = r.performance
    const requireHost = () => { if (!host) throw Error('Chỉ host được thao tác.') }
    if (event.startsWith('performance:') && event !== 'performance:prepare' && data.performanceId !== p?.performanceId) throw Error('Lượt hát đã thay đổi.')
    if (event === 'queue:add' || event === 'queue:add-many') {
      const entries = event === 'queue:add' ? [data] : data.songs
      if (!Array.isArray(entries) || !entries.length || entries.length > 20) throw Error('Chọn từ 1 đến 20 bài.')
      const remaining = 20-r.queue.length
      if (entries.length > remaining) throw Error('Hàng chờ chỉ còn ' + remaining + ' chỗ. Chưa thêm bài nào.')
      const occupied = new Set(r.queue.filter(song => song.addedBy === member.memberId).map(song => song.videoId))
      if (p && p.state !== 'ended' && p.singerMemberId === member.memberId) occupied.add(p.song.videoId)
      const songs = entries.map(d => {
        const videoId = youtubeId(d.url)
        if (occupied.has(videoId)) throw Error('Bạn đã đăng ký bài này trong hàng chờ hoặc lượt đang hát.')
        occupied.add(videoId)
        return { id:crypto.randomUUID(), videoId, label:String(d.label || '').trim().slice(0,120) || videoId, addedBy:member.memberId, requests:[], duetMemberId:null }
      })
      r.queue.push(...songs)
    } else if (event === 'queue:remove') {
      const song = r.queue.find(song => song.id === data.id)
      if (!song || (!host && song.addedBy !== member.memberId)) throw Error('Không có quyền xóa bài.')
      r.queue = r.queue.filter(song => song.id !== data.id)
    } else if (event === 'queue:move') {
      requireHost(); const from = r.queue.findIndex(song => song.id === data.id)
      if (from < 0 || !['up','down','first'].includes(data.direction)) throw Error('Thứ tự không hợp lệ.')
      const to = data.direction === 'first' ? 0 : Math.max(0,Math.min(r.queue.length-1,from+(data.direction === 'up' ? -1 : 1)))
      const [song] = r.queue.splice(from,1); r.queue.splice(to,0,song)
    } else if (event === 'queue:shuffle') {
      requireHost()
      if (r.queue.length < 2) throw Error('Cần ít nhất 2 bài trong hàng chờ để trộn.')
      const previous = r.queue.map(song => song.id)
      for (let i=r.queue.length-1;i>0;i--) { const j=crypto.randomInt(i+1); [r.queue[i],r.queue[j]]=[r.queue[j],r.queue[i]] }
      if (r.queue.every((song,index) => song.id === previous[index])) r.queue.push(r.queue.shift())
    } else if (event === 'performance:prepare') {
      if (p && p.state !== 'ended') throw Error('Lượt trước chưa kết thúc.')
      const first = r.queue.find(song => r.members[song.addedBy]?.connected && !r.micBlocked[song.addedBy] && !r.banned[song.addedBy])
      if (!first || first.id !== data.songId || first.addedBy !== member.memberId) throw Error('Chỉ chủ lượt đầu hàng được chuẩn bị.')
      this.next(r)
    } else if (event === 'performance:start') {
      if (!p || p.singerMemberId !== member.memberId || !p.mics[member.memberId]?.authorized || Object.values(p.mics).some(m => m.revocationPending) || p.finishPending || p.ownerDeadline || r.micBlocked[member.memberId] || !['preparing','paused'].includes(p.state)) throw Error('Chủ lượt cần chuẩn bị mic trước.')
      p.state='playing'; p.lastReportAt=this.now(); p.playback.serverUpdatedAt=this.now(); p.playback.isPlaying=true
    } else if (event === 'performance:pause') {
      if (!p || p.singerMemberId !== member.memberId) throw Error('Chỉ chủ lượt được tạm dừng.')
      await this.revoke(r)
    } else if (event === 'performance:end') {
      if (!p || (!host && p.singerMemberId !== member.memberId)) throw Error('Không có quyền kết thúc lượt.')
      await this.finish(r)
    } else if (event.startsWith('duet:')) {
      const song = r.queue.find(song => song.id === data.turnId)
      const turn = song || (p?.performanceId === data.turnId && p.state !== 'ended' ? p : null)
      if (!turn) throw Error('Lượt hát không còn tồn tại.')
      const owner = song ? song.addedBy : p.singerMemberId
      if (event === 'duet:request') {
        if (owner === member.memberId || r.micBlocked[member.memberId]) throw Error('Bạn không thể xin song ca ở lượt này.')
        turn.requests = [...new Set([...(turn.requests || []),member.memberId])]
      } else if (event === 'duet:withdraw' || event === 'duet:leave') {
        turn.requests = (turn.requests || []).filter(id => id !== member.memberId)
        if (turn.duetMemberId === member.memberId) { if (song) turn.duetMemberId=null; else await this.dropDuet(r) }
      } else {
        if (owner !== member.memberId) throw Error('Chỉ chủ lượt được chọn người song ca.')
        if (event === 'duet:reject') turn.requests = (turn.requests || []).filter(id => id !== data.memberId)
        else if (event === 'duet:select' || event === 'duet:remove') {
          const target = event === 'duet:remove' ? null : data.memberId
          if (target && (!turn.requests?.includes(target) || !r.members[target]?.connected || r.micBlocked[target] || r.banned[target] || target === owner)) throw Error('Người song ca không còn sẵn sàng.')
          if (turn.duetMemberId !== target) { if (!song) await this.dropDuet(r); turn.duetMemberId=target }
        } else throw Error('Thao tác không hợp lệ.')
      }
    } else if (event === 'member:mic' || event === 'member:ban') {
      requireHost(); const id = data.memberId
      if (typeof id !== 'string' || id === r.hostUid || !Object.hasOwn(r.members, id) || typeof data.blocked !== 'boolean') throw Error('Không thể quản lý thành viên này.')
      if (event === 'member:mic') {
        if (data.blocked) r.micBlocked[id]=true; else delete r.micBlocked[id]
        if (data.blocked) for (const song of r.queue) {
          song.requests = song.requests.filter(memberId => memberId !== id)
          if (song.duetMemberId === id) song.duetMemberId = null
        }
        if (data.blocked && p?.state !== 'ended') { if (p?.singerMemberId === id) await this.finish(r); else if (p?.duetMemberId === id) await this.dropDuet(r) }
      } else {
        if (data.blocked) {
          r.banned[id]=true; r.removalPending[id]=true
          try { await this.depart(r,r.members[id],true) }
          finally { await this.removeBannedVoice(r,id) }
        } else {
          if (r.removalPending[id]) await this.removeBannedVoice(r,id)
          delete r.banned[id]
        }
      }
      this.next(r)
    } else if (event === 'room:close') { requireHost(); await this.close(r) }
    else throw Error('Thao tác không hợp lệ.')
    r.revision++
  }
}

// Explicit localhost-only convenience for development; never opens deployed pilots.
export function localKaraokeAccess(env, address, origin) {
  if (env.NODE_ENV !== 'development' || env.KARAOKE_PILOT_ALLOW_ALL_LOCAL !== 'true') return false
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)) return false
  if (!origin) return true
  try { const u = new URL(origin); return ['http:', 'https:'].includes(u.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) } catch { return false }
}

export function registerKaraoke(io, { verifyFirebaseToken, livekit, credentials, env = process.env }) {
  const nsp = io.of('/karaoke'), pilot = new KaraokePilot({ livekit, credentials })
  const allowed = (uid, socket) => env.KARAOKE_PILOT_ENABLED === 'true' && ((env.KARAOKE_PILOT_UIDS || '').split(',').map(s => s.trim()).includes(uid) || (socket ? localKaraokeAccess(env, socket.handshake.address, socket.handshake.headers.origin) : env.NODE_ENV === 'development' && env.KARAOKE_PILOT_ALLOW_ALL_LOCAL === 'true'))
  nsp.use(async (s, next) => {
    try { const a = await verifyFirebaseToken(s.handshake.auth?.firebaseIdToken); if (!allowed(a.uid, s) || a.firebase?.sign_in_provider === 'anonymous') throw Error('Pilot chưa mở cho tài khoản này.'); s.data.actor = a; next() } catch { next(Error('Pilot chưa mở hoặc phiên đăng nhập đã hết hạn.')) }
  })
  const broadcast = r => nsp.to(r.id).emit('room:snapshot', pilot.snapshot(r))
  const detach = async (s, voluntary = false) => {
    const id = s.data.roomId; s.data.roomId = null
    if (!id) return
    await pilot.lock(id, async () => {
      const r = pilot.rooms.get(id), m = r?.members[s.data.actor.uid]
      if (!m || m.socketId !== s.id) return
      m.connected = false
      if (m.uid === r.hostUid) r.hostDeadline = Date.now() + 30000
      if (!Object.values(r.members).some(m => m.connected)) r.emptySince = Date.now()
      try { await pilot.depart(r, m, voluntary) }
      finally { r.revision++; broadcast(r) }
    })
  }
  nsp.on('connection', s => {
    let count = 0, windowAt = Date.now()
    const bind = (event, fn) => s.on(event, async (data = {}, ack = () => {}) => {
      try {
        if (!allowed(s.data.actor.uid, s) || s.data.actor.exp * 1000 <= Date.now()) throw Error('Phiên thử nghiệm đã hết hạn.')
        if (Date.now() - windowAt > 10000) { windowAt = Date.now(); count = 0 }
        if (++count > 100 || !data || typeof data !== 'object' || JSON.stringify(data).length > 4096) throw Error('Yêu cầu quá nhanh hoặc quá lớn.')
        const result = await fn(data); ack({ ok: true, ...result })
      } catch (e) { ack({ ok: false, error: /[À-ỹĐđ]/.test(e.message || '') ? e.message : 'Chưa thực hiện được. Hãy thử lại.' }); if (s.data.roomId) { const r = pilot.rooms.get(s.data.roomId); if (r) broadcast(r) } }
    })
    bind('sync:ping', () => ({ serverTime: Date.now() }))
    const join = async r => {
      const uid = s.data.actor.uid
      if (r.banned[uid]) throw Error('Bạn đã bị ban khỏi phòng này.')
      if (!r.members[uid]?.connected && Object.values(r.members).filter(m => m.connected).length >= 4) throw Error('Phòng đủ 4 người.')
      const old = r.members[uid]
      if (r.performance?.singerMemberId === uid && r.performance.ownerDeadline && r.performance.ownerDeadline <= Date.now()) await pilot.finish(r)
      if (old?.connected && old.socketId !== s.id) {
        if (r.performance?.singerMemberId === uid || r.performance?.duetMemberId === uid) await pilot.revoke(r)
        const previous = nsp.sockets.get(old.socketId)
        if (previous) { previous.data.roomId = null; previous.emit('room:replaced'); previous.disconnect() }
      }
      r.members[uid] = { uid, memberId: uid, displayName: String(s.data.actor.name || 'Tester').slice(0, 40), connected: true, socketId: s.id }
      r.emptySince = null; if (r.performance?.singerMemberId === uid) r.performance.ownerDeadline = null; if (uid === r.hostUid) r.hostDeadline = null
      s.data.roomId = r.id; await s.join(r.id); r.revision++; broadcast(r); return { room: pilot.snapshot(r) }
    }
    bind('room:create', async d => { const previous = s.data.roomId; await detach(s, true); if (previous) await s.leave(previous); return pilot.lock('create', async () => join(pilot.create(s.data.actor.uid, d.name))) })
    bind('room:join', async d => { if (s.data.roomId && s.data.roomId !== d.roomId) { await s.leave(s.data.roomId); await detach(s, true) } return pilot.lock(d.roomId, () => join(pilot.room(d.roomId))) })
    bind('room:leave', async () => { const id = s.data.roomId; await detach(s, true); if (id) await s.leave(id); return {} })
    const context = fn => d => pilot.lock(s.data.roomId, async () => {
      const r = pilot.room(s.data.roomId), m = r.members[s.data.actor.uid]
      if (!m?.connected || m.socketId !== s.id || r.banned[m.uid]) throw Error('Hãy tham gia phòng lại.')
      return fn(r, m, d)
    })
    for (const event of ['queue:add', 'queue:add-many', 'queue:remove', 'queue:move', 'queue:shuffle', 'performance:prepare', 'performance:start', 'performance:pause', 'performance:end', 'duet:request', 'duet:withdraw', 'duet:leave', 'duet:select', 'duet:reject', 'duet:remove', 'member:mic', 'member:ban', 'room:close']) bind(event, context(async (r, m, d) => {
      if (typeof d.clientEventId !== 'string' || d.clientEventId.length > 100) throw Error('Thiếu command ID.')
      const key = `${m.memberId}:${d.clientEventId}`
      if (!r.seen.has(key)) {
        try { await pilot.command(r, m, event, d) }
        finally {
          if (event === 'member:ban' && r.banned[d.memberId]) {
            const target = nsp.sockets.get(r.members[d.memberId]?.socketId)
            if (target) { target.data.roomId = null; target.emit('room:banned'); await target.leave(r.id); target.disconnect() }
          }
        }
         r.seen.set(key, true); if (r.seen.size > 500) r.seen.delete(r.seen.keys().next().value) }
      if (event === 'room:close') nsp.to(r.id).emit('room:closed'); else broadcast(r)
      return {}
    }))
    bind('player:report', context(async (r, m, d) => {
      const p = r.performance
      if (!p || p.state === 'ended' || p.singerMemberId !== m.memberId || p.performanceId !== d.performanceId || !Number.isSafeInteger(d.seq) || d.seq <= p.seq || !Number.isFinite(d.currentTime) || d.currentTime < 0 || d.currentTime > 86400) return {}
      p.seq = d.seq; p.lastReportAt = Date.now()
      p.playback = { currentTime: d.currentTime, isPlaying: p.state === 'playing' && d.state === 'playing', serverUpdatedAt: Date.now() }
      if (d.state === 'ended' && p.state === 'playing') await pilot.finish(r)
      else if (d.state === 'error' || (d.state === 'paused' && p.state === 'playing')) await pilot.revoke(r)
      r.revision++; broadcast(r); return {}
    }))
    bind('voice:credentials', context(async (r, m) => {
      if (!livekit) throw Error('LiveKit chưa được cấu hình.')
      const token = new AccessToken(credentials.key, credentials.secret, { identity: m.memberId, ttl: '10m' })
      token.addGrant({ roomJoin: true, room: pilot.prefix + r.id, canSubscribe: true, canPublish: false, canPublishData: false })
      return { serverUrl: credentials.url, participantToken: await token.toJwt() }
    }))
    bind('voice:authorize', context(async (r, m, d) => {
      const p = r.performance
      if (!livekit || !p || p.performanceId !== d.performanceId || ![p.singerMemberId,p.duetMemberId].includes(m.memberId) || r.micBlocked[m.memberId] || p.ownerDeadline || p.finishPending || p.duetRemovalPending || Object.values(p.mics).some(mic => mic.revocationPending) || !['preparing','paused','playing'].includes(p.state)) throw Error('Bạn chưa được chọn hát hoặc mic đang được thu hồi.')
      if (p.mics[m.memberId]?.authorized) return {}
      // A timed-out grant can have succeeded at the provider. Mark it as pending
      // before awaiting and revoke on failure, blocking any replacement meanwhile.
      p.mics[m.memberId] = { authorized:false, revocationPending:true }
      try {
        await livekit.updateParticipant(pilot.prefix + r.id, m.memberId, { permission: { canPublish:true, canSubscribe:true, canPublishData:false, canPublishSources:[TrackSource.MICROPHONE] } })
        p.mics[m.memberId] = { authorized:true, revocationPending:false }
      } catch {
        try { await pilot.revokeMember(r,m.memberId) } catch {}
        throw Error('Chưa cấp được quyền mic. Hãy thử lại.')
      }
      if (m.memberId === p.singerMemberId) p.seq=-1
      r.revision++; broadcast(r); return {}
    }))
    bind('voice:release', context(async (r,m,d) => {
      const p=r.performance
      if (p && d.performanceId === p.performanceId) {
        await pilot.revokeMember(r,m.memberId)
        r.revision++; broadcast(r)
      }
      return {}
    }))
    s.on('disconnect', () => { void detach(s).catch(() => {}) })
  })
  const timer = setInterval(() => {
    for (const r of pilot.rooms.values()) void pilot.lock(r.id, async () => {
      if (!allowed(r.hostUid) || r.expiresAt <= Date.now() || (r.hostDeadline && r.hostDeadline <= Date.now()) || (r.emptySince && Date.now() - r.emptySince > 300000)) { await pilot.close(r); nsp.to(r.id).emit('room:closed'); return }
      await Promise.allSettled(Object.keys(r.removalPending).map(id => pilot.removeBannedVoice(r,id)))
      const p=r.performance
      if (!p) return
      let changed=false
      if (Object.values(p.mics).some(mic => mic.revocationPending)) {
        const retries = await Promise.allSettled(Object.keys(p.mics).filter(id => p.mics[id].revocationPending).map(id => pilot.revokeMember(r,id)))
        if (retries.some(result => result.status === 'rejected')) { r.revision++; broadcast(r); return }
        changed=true
      }
      if (p.duetRemovalPending) { await pilot.dropDuet(r); changed=true }
      if (p.finishPending || (p.ownerDeadline && p.ownerDeadline <= Date.now())) { await pilot.finish(r); changed=true }
      else if (p.state === 'playing' && Date.now()-p.lastReportAt > 5000) { await pilot.revoke(r); changed=true }
      if (changed) { r.revision++; broadcast(r) }

    }).catch(() => {})
  }, 1000); timer.unref()
  return pilot
}
