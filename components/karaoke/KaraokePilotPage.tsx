'use client'
import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '@/components/auth/AuthProvider'
import { Copy, Download, LogOut } from 'lucide-react'
import { useKaraokeVoice } from '@/hooks/useKaraokeVoice'
import { useKaraokeLibrary } from '@/hooks/useKaraokeLibrary'
import { KaraokeLibraryPanel } from './KaraokeLibraryPanel'
import { useKaraokeTitles } from '@/hooks/useKaraokeTitles'
import { fetchKaraokeYoutubeTitle, karaokeYoutubeId } from '@/lib/karaoke-youtube-title'
import { StageButton } from './KaraokePrimitives'
import { KaraokeLobby } from './KaraokeLobby'
import { KaraokePerformanceDesk } from './KaraokePerformanceDesk'
import { KaraokeRoomPanels } from './KaraokeRoomPanels'
import styles from './KaraokeStage.module.css'
import { karaokeTarget, KaraokeDiagnostics, KaraokeRoom } from '@/lib/karaoke-types'

type Player = { loadVideoById(id: string): void; cueVideoById(id: string): void; playVideo(): void; pauseVideo(): void; seekTo(n: number, ahead: boolean): void; getCurrentTime(): number; getPlayerState(): number; setVolume(n: number): void; destroy(): void }
type YTApi = { Player: new (el: HTMLElement, options: object) => Player }
let apiPromise: Promise<YTApi> | undefined
function youtubeApi() {
  const w = window as unknown as { YT?: YTApi; onYouTubeIframeAPIReady?: () => void }
  if (w.YT?.Player) return Promise.resolve(w.YT)
  return apiPromise ||= new Promise(resolve => {
    const previous = w.onYouTubeIframeAPIReady
    w.onYouTubeIframeAPIReady = () => { previous?.(); resolve(w.YT!) }
    const script = document.createElement('script'); script.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(script)
  })
}
const base = () => process.env.NEXT_PUBLIC_WATCH_PARTY_SOCKET_URL || process.env.NEXT_PUBLIC_WATCH_PARTY_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:4001' : '')
export default function KaraokePilotPage({ roomId }: { roomId?: string }) {
  const auth = useAuth(), socket = useRef<Socket>(), player = useRef<Player>(), mount = useRef<HTMLDivElement>(null), stageRef = useRef<HTMLDivElement>(null)
  const [room, setRoom] = useState<KaraokeRoom | null>(null), [error, setError] = useState(''), [connected, setConnected] = useState(false)
  const [queueNotice, setQueueNotice] = useState('')
  const displayRoom = useKaraokeTitles(room)
  const [link, setLink] = useState(''), [label, setLabel] = useState(''), [name, setName] = useState('Phòng hát thử'), [joinId, setJoinId] = useState('')
  const [filtered, setFiltered] = useState(false)
  const [tab, setTab] = useState<'room' | 'favorites' | 'playlists'>('room')
  const [participantVolumes, setParticipantVolumes] = useState<Record<string, number>>({})
  const personal = useKaraokeLibrary(auth.user?.uid, auth.getIdToken)
  const [offset, setOffset] = useState(0), [draftOffset, setDraftOffset] = useState(0), [volume, setVolume] = useState(60), [voiceVolume, setVoiceVolume] = useState(80)
  const [syncRating, setSyncRating] = useState(4), [voiceRating, setVoiceRating] = useState(4)
  const [busy, setBusy] = useState(false), [ready, setReady] = useState(false), [diagnostic, setDiagnostic] = useState('Chưa có mẫu')
  const current = useRef({ room, offset, uid: auth.user?.uid, connected }); current.current = { room, offset, uid: auth.user?.uid, connected }
  const clocks = useRef({ offset: 0, rtt: 0 }), seq = useRef(0), lastSeek = useRef(0), lastSong = useRef('')
  const settledUntil = useRef(0), manualAdjustments = useRef(0)
  const stats = useRef<KaraokeDiagnostics>({ samples: [], buffering: 0, reconnects: 0, corrections: 0, startedAt: Date.now(), ratings: [] })
  const command = async (event: string, data: object = {}) => {
    if (!socket.current?.connected) throw Error('Chưa kết nối máy chủ.')
    return new Promise<any>((resolve, reject) => socket.current!.timeout(6000).emit(event, { ...data, clientEventId: crypto.randomUUID() }, (e: Error | null, r: any) => e || !r?.ok ? reject(Error(r?.error || 'Máy chủ chưa phản hồi. Hãy thử lại.')) : resolve(r)))
  }
  const run = async (job: () => Promise<unknown>) => { setBusy(true); setError(''); try { await job() } catch (e) { setError((e as Error).message) } finally { setBusy(false) } }
  const { mic, pending, micError, track, tracks, voiceState, settings, connectVoice, prepareMic, mute } = useKaraokeVoice(room, auth.user?.uid, connected, voiceVolume, command, participantVolumes)
  useEffect(() => {
    if (!auth.user || !base()) return
    const s = io(`${base().replace(/\/$/, '')}/karaoke`, { auth: async cb => cb({ firebaseIdToken: await auth.getIdToken() }) }); socket.current = s
    const calibrate = async () => {
      const samples: Array<{ rtt: number; offset: number }> = []
      for (let i = 0; i < 5 && s.connected; i++) { const sent = Date.now(); try { const r = await command('sync:ping'); const end = Date.now(); samples.push({ rtt: end - sent, offset: r.serverTime - (sent + end) / 2 }) } catch {} }
      samples.sort((a, b) => a.rtt - b.rtt); if (samples[0]) clocks.current = samples[0]
    }
    s.on('connect', () => { setConnected(true); setError(''); void calibrate(); if (roomId) void command('room:join', { roomId: roomId.toUpperCase() }).catch(e => setError(e.message)) })
    s.on('disconnect', () => { setConnected(false); mute(); player.current?.pauseVideo(); stats.current.reconnects++ })
    s.on('connect_error', e => setError(e.message))
    s.on('room:snapshot', (r: KaraokeRoom) => {
      if (!r.micBlocked || !r.banned || (r.performance && !r.performance.mics)) {
        mute(); player.current?.pauseVideo(); setRoom(null)
        setError('Socket karaoke đang dùng phiên bản cũ. Cần restart socket; thao tác này sẽ kết thúc các phòng đang chạy.')
        return
      }
      setRoom(old => !old || old.id !== r.id || r.revision >= old.revision ? r : old)
    })
    s.on('room:replaced', () => { mute(); setRoom(null); setError('Phiên đã chuyển sang tab khác.') })
    s.on('room:banned', () => { mute(); player.current?.pauseVideo(); setRoom(null); setError('Bạn đã bị ban khỏi phòng này.') })
    s.on('room:closed', () => { mute(); player.current?.pauseVideo(); setRoom(null); setError('Phòng đã kết thúc. Quay lại /karaoke để tạo phòng mới.') })
    const timer = setInterval(() => void calibrate(), 30000)
    return () => { clearInterval(timer); s.disconnect(); mute() }
  // Auth API functions are recreated on context updates; reconnect only on identity change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user?.uid, roomId])
  useEffect(() => {
    if (!room || !mount.current) return
    let stopped = false
    void youtubeApi().then(api => {
      if (stopped || !mount.current) return
      const el = document.createElement('div'); mount.current.appendChild(el)
      player.current = new api.Player(el, { width: '100%', height: '100%', playerVars: { playsinline: 1, origin: location.origin }, events: {
        onReady: () => { lastSong.current = ''; setReady(true) },
        onAutoplayBlocked: () => setError('Trình duyệt chặn phát. Bấm Bật âm thanh hoặc Play trong YouTube.'),
        onError: () => { setError('Video không phát được. Host hãy chọn bài khác.'); report('error') },
        onStateChange: (e: { data: number }) => { if (e.data === 3) { stats.current.buffering++; settledUntil.current = Date.now() + 5000 } report(e.data === 0 ? 'ended' : e.data === 1 ? 'playing' : e.data === 3 ? 'buffering' : 'paused') }
      } })
    })
    return () => { stopped = true; player.current?.destroy(); player.current = undefined; setReady(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id])
  const report = (state?: string) => {
    const { room: r, uid } = current.current, p = r?.performance
    if (!p || p.singerMemberId !== uid || !socket.current?.connected || !player.current) return
    const playerState = player.current.getPlayerState()
    void command('player:report', { performanceId: p.performanceId, seq: ++seq.current, currentTime: player.current.getCurrentTime(), state: state || (playerState === 1 ? 'playing' : playerState === 3 ? 'buffering' : 'paused') }).catch(() => {})
  }
  useEffect(() => { setOffset(0); setDraftOffset(0); lastSeek.current = 0 }, [room?.performance?.performanceId, room?.performance?.singerMemberId])
  useEffect(() => {
    const timer = setInterval(() => {
      const { room: r, uid, offset: delay } = current.current, p = r?.performance, yt = player.current
      if (!p || !yt || !ready) return
      if (lastSong.current !== p.performanceId) { lastSong.current = p.performanceId; settledUntil.current = Date.now() + 5000; yt.cueVideoById(p.song.videoId); return }
      const isSinger = p.singerMemberId === uid, target = karaokeTarget(p, Date.now() + clocks.current.offset, isSinger ? 0 : delay)
      if (!isSinger) {
        if (p.playback.isPlaying && yt.getPlayerState() !== 1 && yt.getPlayerState() !== 3) yt.playVideo()
        if (!p.playback.isPlaying && yt.getPlayerState() === 1) yt.pauseVideo()
        const drift = yt.getCurrentTime() - target
        const stable = p.playback.isPlaying && yt.getPlayerState() === 1 && Date.now() > settledUntil.current
        if (Math.abs(drift) >= .75 && Date.now() - lastSeek.current >= 5000) { yt.seekTo(target, true); lastSeek.current = Date.now(); settledUntil.current = Date.now() + 5000; stats.current.corrections++ }
        stats.current.samples.push({ at: Date.now(), driftMs: drift * 1000, offsetMs: delay, rttMs: clocks.current.rtt, reportAgeMs: Date.now() + clocks.current.offset - p.lastReportAt, stable, performanceId: p.performanceId }); if (stats.current.samples.length > 1800) stats.current.samples.shift()
        setDiagnostic(`Lệch player: ${Math.round(drift * 1000)} ms · RTT: ${clocks.current.rtt} ms`)
      } else { if (p.state !== 'playing') yt.pauseVideo(); report() }
    }, 1000); return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])
  useEffect(() => { player.current?.setVolume(volume) }, [volume, ready])
  const p = displayRoom?.performance, host = !!room?.members[auth.user?.uid || '']?.host, own = p?.singerMemberId === auth.user?.uid
  const exportStats = () => {
    const stable = stats.current.samples.filter(s => s.stable).map(s => Math.abs(s.driftMs)).sort((a,b) => a-b)
    const blob = new Blob([JSON.stringify({ ...stats.current, p95StableDriftMs: stable.length ? stable[Math.ceil(stable.length * .95) - 1] : null, manualAdjustments: manualAdjustments.current, connectionDurationMs: Date.now() - stats.current.startedAt, voiceState, captureSettings: settings, exportedAt: Date.now(), note: 'Offset là giá trị thử; RTT không phải độ trễ giọng một chiều.' }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'karaoke-pilot.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const applyOffset = () => {
    setOffset(draftOffset)
    if (p && !own && player.current) {
      player.current.seekTo(karaokeTarget(p, Date.now() + clocks.current.offset, draftOffset), true)
      lastSeek.current = Date.now(); settledUntil.current = Date.now() + 5000; manualAdjustments.current++
    }
  }
  const pageRef = useRef<HTMLDivElement>(null)
  const disabled = busy || !connected
  return <div ref={pageRef} className={styles.page} data-room={!!room && tab==='room'}>
    <nav className={`${styles.row} ${styles.tabs}`} aria-label="Karaoke"><StageButton aria-pressed={tab==='room'} onClick={()=>setTab('room')}>Phòng hát</StageButton><StageButton aria-pressed={tab==='favorites'} onClick={()=>setTab('favorites')}>Yêu thích</StageButton><StageButton aria-pressed={tab==='playlists'} onClick={()=>setTab('playlists')}>Playlist của tôi</StageButton></nav>
    <header className={styles.header}><div><h1>Karaoke cùng bạn bè</h1><p>Chọn bài. Bật mic. Cùng nhau lên sân khấu.</p></div><span className={styles.pilotBadge}>Bản thử riêng · tối đa 4 người</span></header>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {personal.loadError && <p role="alert" className={styles.error}>{personal.loadError} Hãy bấm Tải lại trong thư viện.</p>}
    {tab!=='room' && (auth.user ? <KaraokeLibraryPanel library={personal.library} loading={personal.loading} playlistMode={tab==='playlists'} remaining={20-(room?.queue.length || 0)} canQueue={!!room && connected} busy={busy} mutate={personal.mutate} reload={personal.reload} exportSongs={personal.exportSongs} enqueue={songs=>command('queue:add-many',{songs})} run={run}/> : <p>Hãy đăng nhập trong Phòng hát để mở thư viện riêng.</p>)}
    <div className={styles.roomView} hidden={tab!=='room'}>
    {!room ? <KaraokeLobby signedIn={!!auth.user} loading={auth.loading} connected={connected} busy={busy} name={name} setName={setName} joinId={joinId} setJoinId={setJoinId}
      signIn={() => void run(() => auth.signInWithGoogle())}
      create={() => void run(async () => { const r = await command('room:create', { name }); location.href = `/karaoke/${r.room.id}` })}
      join={() => { const id = joinId.trim().split('/').filter(Boolean).pop(); if (id && /^[A-Fa-f0-9]{10}$/.test(id)) location.href = `/karaoke/${id.toUpperCase()}`; else setError('Mã phòng gồm 10 ký tự.') }} /> : <>
      <div className={styles.roomHeader}><div className={styles.roomInfo}><h2>{room.name}</h2><p className={styles.connection} data-connected={connected}>{connected ? 'Đã kết nối' : 'Mất kết nối · mic đã tắt'} · Phòng {room.id}</p></div><div className={styles.row}>
        <StageButton onClick={()=>void run(async()=>{if(document.fullscreenElement)await document.exitFullscreen();else await pageRef.current?.requestFullscreen()})}>Toàn màn hình</StageButton>
        <StageButton onClick={() => void run(async () => { await navigator.clipboard.writeText(location.href); setDiagnostic('Đã sao chép link phòng.') })} disabled={busy}><Copy size={16} aria-hidden="true" />Sao chép link</StageButton>
        <StageButton quiet disabled={disabled} onClick={() => void run(async () => { mute(); await command(host ? 'room:close' : 'room:leave'); location.href = '/karaoke' })}><LogOut size={16} aria-hidden="true" />{host ? 'Đóng phòng' : 'Rời phòng'}</StageButton>
      </div></div>
      <div className={styles.layout}>
        <KaraokePerformanceDesk room={displayRoom!} uid={auth.user?.uid} tracks={tracks} participantVolumes={participantVolumes} setParticipantVolume={(id,value)=>setParticipantVolumes(old=>({...old,[id]:value}))} own={own} host={host} disabled={disabled} mic={mic} pending={pending} micError={micError} track={track} mount={mount} stageRef={stageRef}
          filtered={filtered} setFiltered={setFiltered} volume={volume} setVolume={setVolume} voiceVolume={voiceVolume} setVoiceVolume={setVoiceVolume} voiceState={voiceState}
          draftOffset={draftOffset} setDraftOffset={setDraftOffset} applyOffset={applyOffset}
          listen={() => void run(async () => { await connectVoice(); if (p?.state === 'playing') player.current?.playVideo() })}
          prepare={() => void run(() => prepareMic(filtered))}
          start={() => void run(async () => { await command('performance:start', { performanceId: p?.performanceId }); player.current?.playVideo() })}
          pause={() => void run(async () => { mute(); await command('performance:pause', { performanceId: p?.performanceId }) })}
          end={() => void run(async () => { mute(); await command('performance:end', { performanceId: p?.performanceId }) })}
          mute={() => void run(async () => { mute(); await command('voice:release', { performanceId: p?.performanceId }) })} />
        <KaraokeRoomPanels room={displayRoom!} host={host} uid={auth.user?.uid} library={personal.library} favorite={song=>void run(async()=>{setQueueNotice('');await personal.favorite(song);setQueueNotice('Đã cập nhật Yêu thích.')})} command={(event,data)=>void run(()=>command(event,data))} link={link} setLink={setLink} label={label} setLabel={setLabel} disabled={disabled} queueNotice={queueNotice}
          add={() => void run(async () => { const id = karaokeYoutubeId(link); const title = label.trim() || (id ? await fetchKaraokeYoutubeTitle(id) : null) || ''; await command('queue:add', { url: link, label: title }); setLink(''); setLabel('') })}
          select={songId => void run(() => command('performance:prepare', { songId }))}
          move={(id, direction) => void run(() => command('queue:move', { id, direction }))}
          shuffle={() => void run(async () => { setQueueNotice('Đang trộn bài…'); try { await command('queue:shuffle'); setQueueNotice('Đã trộn lại thứ tự hàng chờ.') } catch (e) { setQueueNotice('Chưa trộn được hàng chờ.'); throw e } })}
          remove={id => void run(() => command('queue:remove', { id }))} />
      </div>
    </>}
    </div>
    <details className={styles.diagnostics}><summary>Chẩn đoán và đánh giá buổi thử</summary>
      {p?.state === 'ended' && <section className={styles.ratings}><h2>Đánh giá lượt vừa hát</h2><label>Khớp nhạc–giọng<select value={syncRating} onChange={e => setSyncRating(+e.target.value)}>{[1,2,3,4,5].map(n => <option key={n}>{n}</option>)}</select></label><label>Chất lượng giọng<select value={voiceRating} onChange={e => setVoiceRating(+e.target.value)}>{[1,2,3,4,5].map(n => <option key={n}>{n}</option>)}</select></label><StageButton onClick={() => { stats.current.ratings = stats.current.ratings.filter(r => r.performanceId !== p.performanceId); stats.current.ratings.push({ performanceId: p.performanceId, sync: syncRating, voice: voiceRating }); setDiagnostic('Đã lưu đánh giá tại máy này.') }}>Lưu đánh giá</StageButton></section>}
      <p role="status">{diagnostic}</p><p>Buffering: {stats.current.buffering} · Kết nối lại: {stats.current.reconnects} · Seek sửa: {stats.current.corrections}</p>
      <p>RTT không phải độ trễ giọng hát một chiều. Không ghi âm.</p><StageButton onClick={exportStats}><Download size={16} aria-hidden="true" />Xuất kết quả JSON</StageButton>
    </details>
  </div>
}
