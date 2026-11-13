// Browser-only fixtures: runs the production components with isolated service doubles.
// Never imports this harness from an app route. Generated tone is NOT a microphone test.
const fs = require('node:fs/promises')
const path = require('node:path')
const assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..')
const dir = path.join(root, '.impeccable/karaoke-preview')
const output = path.join(root, '.impeccable/review/karaoke')
async function main() {
  await fs.mkdir(dir, { recursive: true }); await fs.mkdir(output, { recursive: true })
  const app = await (await fetch('http://localhost:3000/karaoke')).text()
  const bodyClass = /<body class="([^"]+)"/.exec(app)?.[1] || ''
  await fs.writeFile(path.join(dir, 'index.html'), `<!doctype html><html lang="vi" class="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="http://localhost:3000/_next/static/css/app/layout.css"></head><body class="${bodyClass}"><div style="position:fixed;bottom:0;left:0;z-index:100;padding:2px 8px;background:#273440;color:#d4e2ef;font:12px sans-serif">Dữ liệu minh họa · dịch vụ giả lập · âm thanh tổng hợp để kiểm tra UI</div><div id="root"></div><script type="module" src="/entry.tsx"></script></body></html>`)
  await fs.writeFile(path.join(dir, 'auth.ts'), `export const useAuth = () => ({user:{uid:'me'}, loading:false, getIdToken:async()=>'', signInWithGoogle:async()=>{}})`)
  await fs.writeFile(path.join(dir, 'entry.tsx'), `import React from 'react'; import {createRoot} from 'react-dom/client'; import Page from '@/components/karaoke/KaraokePilotPage';
  window.YT={Player:class { constructor(el, options){ this.options=options;window.testPlayer=this;el.innerHTML='<div style="height:100%;display:grid;place-items:center;color:#afbdcc;background:#070a0e;font:14px sans-serif">Player giả lập · điều khiển YouTube nằm trong vùng này</div>'; setTimeout(()=>options.events.onReady(),0) } cueVideoById(){} playVideo(){} pauseVideo(){} seekTo(){} getCurrentTime(){return 0} getPlayerState(){return 2} setVolume(){} destroy(){} }};
  createRoot(document.getElementById('root')).render(<Page roomId="123456ABCD"/>);`)
  await fs.writeFile(path.join(dir, 'socket.ts'), `
  export const room={id:'123456ABCD',name:'Đêm hát cùng bạn bè',revision:1,expiresAt:Date.now()+999999,micBlocked:{},banned:{},members:{me:{memberId:'me',displayName:'Minh Anh',host:true,connected:true},friend:{memberId:'friend',displayName:'Hoàng Nam',host:false,connected:true}},queue:[{id:'q2',videoId:'abcdefghijk',label:'Có em chờ — một bài hát cho những buổi tối cùng bạn bè',addedBy:'friend',requests:[],duetMemberId:null}],performance:{performanceId:'p1',song:{id:'q1',videoId:'abcdefghijk',label:'Một đêm say — hát cùng những người bạn thân',addedBy:'me',requests:[],duetMemberId:null},singerMemberId:'me',state:'preparing',duetMemberId:null,requests:[],mics:{me:{authorized:false,revocationPending:false}},lastReportAt:Date.now(),playback:{currentTime:0,isPlaying:false,serverUpdatedAt:Date.now()}}};
  export const io=()=>{const handlers={};const snapshot=()=>handlers['room:snapshot']?.(structuredClone({...room,revision:++room.revision})); const s={connected:true,on(event,fn){handlers[event]=fn;return s},disconnect(){s.connected=false},timeout(){return s},emit(event,d,cb){let result={ok:true};if(event==='sync:ping')result.serverTime=Date.now();if(event==='voice:credentials')Object.assign(result,{serverUrl:'test',participantToken:'test'}); if(event==='voice:authorize')room.performance.mics.me={authorized:true,revocationPending:false};if(event==='voice:release'||event==='performance:pause'){room.performance.mics.me={authorized:false,revocationPending:false};room.performance.state='paused'}if(event==='performance:start')room.performance.state='playing';if(event==='performance:end'){room.performance.state='ended';room.performance.mics.me={authorized:false,revocationPending:false}}if(event==='queue:add')room.queue.push({id:crypto.randomUUID(),videoId:'abcdefghijk',label:d.label||'Bài mới',addedBy:'me',requests:[],duetMemberId:null});if(event==='queue:remove')room.queue=room.queue.filter(q=>q.id!==d.id);if(event==='performance:prepare'){const song=room.queue.find(q=>q.id===d.songId);room.performance={...room.performance,song,performanceId:crypto.randomUUID(),singerMemberId:song.addedBy,state:'preparing',duetMemberId:null,requests:[],mics:{}};room.queue=room.queue.filter(q=>q.id!==d.songId)}snapshot();cb(null,result)}};window.testSocket={snapshot,room,handlers,s};setTimeout(()=>{handlers.connect?.();snapshot()},50);return s};`)
  await fs.writeFile(path.join(dir, 'voice.ts'), `export const Track={Source:{Microphone:'microphone'},Kind:{Audio:'audio'}};export const RoomEvent={TrackSubscribed:'sub',TrackUnsubscribed:'unsub',TrackMuted:'mute',TrackUnmuted:'unmute',LocalTrackUnpublished:'unpub',ConnectionStateChanged:'state',Reconnecting:'reconnecting'};
  export class Room{state='disconnected';handlers={};remoteParticipants=new Map();publication={isMuted:true,track:null};localParticipant={permissions:{canPublish:true},getTrackPublication:()=>this.publication,setMicrophoneEnabled:async(on)=>{if(on){this.ctx??=new AudioContext();await this.ctx.resume();if(!this.osc){this.osc=this.ctx.createOscillator();this.gain=this.ctx.createGain();this.gain.gain.value=.15;this.dest=this.ctx.createMediaStreamDestination();this.osc.connect(this.gain);this.gain.connect(this.dest);this.osc.start();this.publication.track={mediaStreamTrack:this.dest.stream.getAudioTracks()[0]}}window.testTone=this.gain;this.publication.track.mediaStreamTrack.enabled=true}else if(this.publication.track){this.publication.track.mediaStreamTrack.enabled=false}this.publication.isMuted=!on}};on(event,fn){this.handlers[event]=fn;return this}async connect(){this.state='connected';this.handlers.state?.('connected')}async startAudio(){}async disconnect(){this.state='disconnected';this.handlers.state?.('disconnected');await this.ctx?.close()}}`)
  await fs.writeFile(path.join(dir, 'library.ts'), `export const useKaraokeLibrary=()=>({library:{revision:0,songs:{},playlists:{}},loading:false,loadError:'',reload:async()=>{},mutate:async()=>{},favorite:async()=>{},exportSongs:async()=>{}})`)
  const { createServer } = await import('vite')
  const server = await createServer({ root: dir, configFile: false, resolve: { alias: [{find:'@/hooks/useKaraokeLibrary',replacement:path.join(dir,'library.ts')}, { find: '@/components/auth/AuthProvider', replacement: path.join(dir, 'auth.ts') }, { find: 'socket.io-client', replacement: path.join(dir, 'socket.ts') }, { find: 'livekit-client', replacement: path.join(dir, 'voice.ts') }, { find: '@', replacement: root }] }, define: { 'process.env.NODE_ENV': '"development"', 'process.env.NEXT_PUBLIC_WATCH_PARTY_SOCKET_URL': '"http://localhost:4001"', 'process.env.NEXT_PUBLIC_WATCH_PARTY_API_URL': '"http://localhost:4001"' }, esbuild: { jsx: 'automatic' }, server: { host: '127.0.0.1', port: 4318, strictPort: true, fs: { allow: [root] } } })
  await server.listen()
  const { chromium } = require(process.env.CINEMIND_PLAYWRIGHT_PATH || 'playwright')
  const browser = await chromium.launch({ headless: true })
  const errors = []
  try {
    for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['laptop', { width: 1366, height: 768 }], ['mobile', { width: 390, height: 844 }]]) {
      const page = await browser.newPage({ viewport, reducedMotion: 'reduce' }); page.on('pageerror', e => errors.push(e.message))
      await page.goto('http://127.0.0.1:4318'); await page.getByRole('button', { name: 'Chuẩn bị mic', exact: true }).waitFor()
      await page.getByRole('button', { name: 'Chuẩn bị mic', exact: true }).click(); await page.getByText('Đang nhận âm', { exact: true }).waitFor()
      await page.getByRole('button', { name: 'Bắt đầu hát', exact: true }).click(); await page.getByRole('button', { name: 'Tạm dừng', exact: true }).waitFor()
      if (name !== 'mobile') {
        const bounds = await page.getByRole('button', { name: 'Bài tiếp', exact: true }).boundingBox()
        assert.ok(bounds && bounds.y >= 0 && bounds.y + bounds.height <= viewport.height, name + ': transport fits viewport')
        assert.equal(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight + 1), false, name + ': room fits one screen')
      }
      await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true })
      const overflow = await page.evaluate(() => [...document.querySelectorAll('*')].filter(el => el.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(el).position !== 'absolute').map(el => ({ tag: el.tagName, class: el.className, right: el.getBoundingClientRect().right, width: el.getBoundingClientRect().width })).slice(0, 12))
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name}: no horizontal overflow ${JSON.stringify(overflow)}`)
      await page.evaluate(() => { window.testTone.gain.value = 0 }); await page.getByText('Chưa thấy tín hiệu', { exact: true }).waitFor({ timeout: 8000 })
      await page.getByRole('button', { name: 'Tắt mic', exact: true }).click(); await page.getByText('Mic đang tắt', { exact: true }).waitFor()
      assert.equal(await page.locator('[data-playing]').evaluate(el => el.style.getPropertyValue('--signal-level')), '0')
      await page.getByText('Âm lượng & cài đặt mic', { exact: true }).click()
      const range = page.getByRole('slider', { name: /Âm lượng nhạc/ }); await range.focus(); await range.press('ArrowRight'); assert.equal(await range.inputValue(), '61')
      await page.evaluate(() => { const f=window.testSocket; f.room.performance={...f.room.performance,singerMemberId:'friend',mics:{},state:'preparing'};f.room.queue=[];f.snapshot() }); await page.getByRole('region', { name: 'Giọng đang nhận' }).waitFor()
      await page.getByText('Thêm bài vào hàng chờ', { exact: true }).click()
      await page.getByLabel('Link YouTube', { exact: true }).fill('https://youtu.be/abcdefghijk'); await page.getByLabel(/Tên bài/).fill('Bài thêm từ kiểm tra trình duyệt'); await page.getByRole('button', { name: 'Đăng ký lượt của bạn', exact: true }).click()
      await page.getByRole('button', { name: 'Xóa Bài thêm từ kiểm tra trình duyệt', exact: true }).click(); await page.getByText('Chưa có bài trong hàng chờ.', { exact: false }).waitFor()
      await page.evaluate(() => window.testPlayer.options.events.onError()); await page.getByRole('alert').filter({ hasText: 'Video không phát được' }).waitFor()
      await page.evaluate(() => { const f=window.testSocket;f.room.queue=Array.from({length:20},(_,i)=>({id:'full'+i,videoId:'abcdefghijk',label:'Bài hát có tên rất dài '.repeat(5)+i,addedBy:'me',requests:[],duetMemberId:null}));f.snapshot() })
      assert.equal(await page.getByRole('button', { name: 'Đăng ký lượt của bạn', exact: true }).isDisabled(), true)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      await page.screenshot({ path: path.join(output, `${name}-full-error.png`), fullPage: true })
      await page.evaluate(() => { window.testSocket.s.connected=false;window.testSocket.handlers.disconnect() }); await page.getByText(/Mất kết nối · mic đã tắt/).waitFor()
      console.log(`${name}: measured synthetic track, silence, mute, singer change, keyboard volume, queue, video error, 20 long labels, disconnect: PASS`)
      await page.close()
    }
    assert.deepEqual(errors, [])
    const lobby = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); await lobby.goto('http://localhost:3000/karaoke'); await lobby.getByRole('button', { name: 'Đăng nhập bằng Google', exact: true }).waitFor(); await lobby.screenshot({ path: path.join(output, 'lobby-desktop.png'), fullPage: true }); await lobby.setViewportSize({ width: 390, height: 844 }); await lobby.screenshot({ path: path.join(output, 'lobby-mobile.png'), fullPage: true }); assert.equal(await lobby.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    console.log('Real Next.js lobby rendered. Screenshots: ' + output)
  } finally { await browser.close(); if (!process.argv.includes('--serve')) await server.close() }
  if (process.argv.includes('--serve')) console.log('UI fixture preview: http://127.0.0.1:4318 (synthetic data/audio, not a live room).')
}
main().catch(error => { console.error(error); process.exit(1) })
