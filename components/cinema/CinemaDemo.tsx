'use client'

import { useState } from 'react'
import CinemaRoom from './CinemaRoom'
import type { CinemaSeatSnapshot } from '@/lib/cinema-layout'

const names = ['Minh Anh', 'Hoàng Nam', 'Thu Hà', 'Đức Huy', 'Ngọc Linh', 'Gia Bảo', 'Khánh Vy', 'Tuấn Anh', 'Phương Thảo', 'Quốc Bảo', 'Mai Chi', 'Hải Đăng']
const occupied = ['A1', 'B2', 'B3', 'C1', 'C4', 'D2', 'D3', 'E1', 'E4', 'F2', 'G3', 'H4']
export default function CinemaDemo() {
  const [snapshot, setSnapshot] = useState<CinemaSeatSnapshot>({ revision: 0, capacity: 36, seats: Object.fromEntries(occupied.map((seat, i) => [seat, `demo-${i}`])) })
  const [entered, setEntered] = useState(false)
  if (entered) return <div style={{ minHeight: '100dvh', background: '#0c0e13', color: '#f3f1ec', display: 'grid', placeItems: 'center', padding: 24 }}><div style={{ maxWidth: 520, textAlign: 'center' }}><h1 style={{ fontSize: 30, marginBottom: 16 }}>Chỗ của bạn đã sẵn sàng</h1><p style={{ lineHeight: 1.8, color: '#b7bfcc' }}>Trong phòng thật, bước này mở trình phát phim hiện tại. Đây là bản xem trước không gian và chọn ghế.</p><button onClick={() => setEntered(false)} style={{ background: '#9de5c3', color: '#10281d', padding: '14px 24px', borderRadius: 8, marginTop: 24 }}>Room 3D · Quay lại rạp</button><p style={{ marginTop: 24 }}><a href="/watch-party">Đến Xem chung</a></p></div></div>
  return <CinemaRoom demo roomName="Phòng chiếu thử" movieTitle="Một buổi tối cùng nhau" memberId="you" members={[...names.map((displayName, i) => ({ memberId: `demo-${i}`, displayName, connected: true })), { memberId: 'you', displayName: 'Bạn', connected: true }]} snapshot={snapshot} connected onConfirm={async seatId => { setSnapshot(current => ({ ...current, revision: current.revision + 1, seats: { ...Object.fromEntries(Object.entries(current.seats).filter(([, id]) => id !== 'you')), [seatId]: 'you' } })); return { ok: true } }} onEnter={() => setEntered(true)} onLeave={() => { window.location.href = '/watch-party' }} />
}
