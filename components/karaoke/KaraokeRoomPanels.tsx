'use client'
import { Heart, ArrowDown, ArrowUp, ListMusic, Plus, Shuffle, Trash2, Users } from 'lucide-react'
import type { KaraokeRoom, KaraokeQueueItem } from '@/lib/karaoke-types'
import type { KaraokeLibrary } from '@/lib/karaoke-library'
import { StageButton } from './KaraokePrimitives'
import styles from './KaraokeStage.module.css'

type Props = {
 room: KaraokeRoom; host: boolean; uid?: string; link: string; setLink:(s:string)=>void; label:string; setLabel:(s:string)=>void
 disabled:boolean; add:()=>void; select:(id:string)=>void; remove:(id:string)=>void
 move:(id:string,direction:'up'|'down'|'first')=>void; shuffle:()=>void; queueNotice:string
 library:KaraokeLibrary; favorite:(song:KaraokeQueueItem)=>void; command:(event:string,data:object)=>void
}
export function DuetControls({room,uid,turnId,owner,requests,selected,disabled,command}:{room:KaraokeRoom;uid?:string;turnId:string;owner:string;requests:string[];selected:string|null;disabled:boolean;command:Props['command']}) {
 const own=owner===uid
 return <div className={styles.duetControls}>
  {selected && <p>Song ca: {room.members[selected]?.displayName || 'Thành viên'}</p>}
  {!own && <StageButton quiet disabled={disabled || !!room.micBlocked[uid || '']} onClick={()=>command(selected===uid ? 'duet:leave' : requests.includes(uid || '') ? 'duet:withdraw' : 'duet:request',{turnId})}>{selected===uid ? 'Rời song ca' : requests.includes(uid || '') ? 'Rút yêu cầu' : 'Xin hát cùng'}</StageButton>}
  {own && <>{selected && <StageButton quiet disabled={disabled} onClick={()=>command('duet:remove',{turnId})}>Kết thúc song ca</StageButton>}{requests.map(id=><div className={styles.row} key={id}><span>{room.members[id]?.displayName || 'Thành viên'}</span><StageButton disabled={disabled || !room.members[id]?.connected || !!room.micBlocked[id] || selected===id} onClick={()=>command('duet:select',{turnId,memberId:id})}>{selected ? 'Đổi người' : 'Chọn song ca'}</StageButton><StageButton quiet disabled={disabled} onClick={()=>command('duet:reject',{turnId,memberId:id})}>Từ chối</StageButton></div>)}</>}
 </div>
}
export function KaraokeRoomPanels({room,host,uid,link,setLink,label,setLabel,disabled,add,select,remove,move,shuffle,queueNotice,library,favorite,command}:Props) {
 const members=Object.values(room.members),p=room.performance
 const first=room.queue.find(song=>room.members[song.addedBy]?.connected && !room.micBlocked[song.addedBy] && !room.banned[song.addedBy])
 const heart=(song:KaraokeQueueItem)=><StageButton quiet disabled={disabled} aria-label={'Yêu thích '+song.label} aria-pressed={!!library.songs[song.videoId]?.favorite} onClick={()=>favorite(song)}><Heart size={16} fill={library.songs[song.videoId]?.favorite ? 'currentColor' : 'none'}/>Yêu thích</StageButton>
 return <aside className={styles.sidebar}><section className={styles.queue}>
  <div className={styles.sectionHeading}><h2><ListMusic size={21}/>Hàng chờ</h2><span>{room.queue.length}/20</span></div>
  {host && room.queue.length>1 && <StageButton quiet disabled={disabled} onClick={shuffle}><Shuffle size={16}/>Trộn bài</StageButton>}
  {queueNotice && <p role="status">{queueNotice}</p>}
  {p && p.state!=='ended' && <div className={styles.currentSong}><strong>{p.song.label}</strong><p>Chủ lượt: {room.members[p.singerMemberId]?.displayName}</p>{heart(p.song)}{(p.duetRemovalPending || Object.values(p.mics).some(m=>m.revocationPending)) && <p role="status">Đang thu hồi mic, vui lòng chờ…</p>}<DuetControls room={room} uid={uid} turnId={p.performanceId} owner={p.singerMemberId} requests={p.requests} selected={p.duetMemberId} disabled={disabled || !!p.duetRemovalPending || !!p.finishPending || Object.values(p.mics).some(m=>m.revocationPending)} command={command}/></div>}
  <details className={styles.addDisclosure}><summary><Plus size={16}/>Thêm bài vào hàng chờ</summary><form onSubmit={e=>{e.preventDefault();add()}} className={styles.addSong}><label htmlFor="song-url">Link YouTube</label><input id="song-url" type="url" value={link} onChange={e=>setLink(e.target.value)} required disabled={disabled || room.queue.length>=20} placeholder="https://youtu.be/…"/><label htmlFor="song-label">Tên bài (tùy chọn)</label><input id="song-label" value={label} onChange={e=>setLabel(e.target.value)} maxLength={120} disabled={disabled}/><StageButton type="submit" disabled={disabled || room.queue.length>=20}><Plus size={16}/>Đăng ký lượt của bạn</StageButton></form></details>
  {!room.queue.length ? <p className={styles.empty}>Chưa có bài trong hàng chờ.</p> : <ol className={styles.queueList}>{room.queue.map((q,index)=><li key={q.id}><span className={styles.queueNumber}>{index+1}</span><div className={styles.queueSong}><strong>{q.label}</strong><small>Chủ lượt: {room.members[q.addedBy]?.displayName || 'Thành viên'}{room.micBlocked[q.addedBy] ? ' · Đang chặn mic, chưa thể bắt đầu' : !room.members[q.addedBy]?.connected ? ' · Ngoại tuyến' : ''}</small><div className={styles.queueActions}>{heart(q)}{q.addedBy===uid && q.id===first?.id && (!p || p.state==='ended') && <StageButton disabled={disabled} onClick={()=>select(q.id)}>Chuẩn bị lượt</StageButton>}{host && <><StageButton quiet disabled={disabled || !index} onClick={()=>move(q.id,'up')} aria-label="Đưa bài lên"><ArrowUp size={16}/></StageButton><StageButton quiet disabled={disabled || index===room.queue.length-1} onClick={()=>move(q.id,'down')} aria-label="Đưa bài xuống"><ArrowDown size={16}/></StageButton></>}{(host || q.addedBy===uid) && <StageButton quiet disabled={disabled} onClick={()=>remove(q.id)} aria-label={'Xóa '+q.label}><Trash2 size={16}/></StageButton>}</div><DuetControls room={room} uid={uid} turnId={q.id} owner={q.addedBy} requests={q.requests} selected={q.duetMemberId} disabled={disabled} command={command}/></div></li>)}</ol>}
 </section><details className={styles.members}><summary><Users size={18}/>Bạn bè · {members.filter(m=>m.connected).length}/4</summary><ul>{members.map(m=><li key={m.memberId}><div><strong>{m.displayName}{m.memberId===uid ? ' (bạn)' : ''}</strong><small>{m.host ? 'Chủ phòng · ' : ''}{room.banned[m.memberId] ? 'Đã ban' : m.connected ? 'Trực tuyến' : 'Ngoại tuyến'}{room.micBlocked[m.memberId] ? ' · Mic bị chặn' : ''}</small>{host && m.memberId!==uid && <div className={styles.row}><StageButton quiet disabled={disabled} onClick={()=>command('member:mic',{memberId:m.memberId,blocked:!room.micBlocked[m.memberId]})}>{room.micBlocked[m.memberId] ? 'Cho phép mic lại' : 'Chặn mic'}</StageButton><StageButton quiet disabled={disabled} onClick={()=>command('member:ban',{memberId:m.memberId,blocked:!room.banned[m.memberId]})}>{room.banned[m.memberId] ? 'Gỡ ban' : 'Ban khỏi phòng'}</StageButton></div>}</div></li>)}</ul></details></aside>
}
