# MovieWiser Watch Party Service

Socket.IO + HTTP service authoritative cho phòng Xem chung. Service xử lý room state, đồng bộ playback, chat, reaction và signaling WebRTC.

## Local development

```powershell
npm install
$env:WATCH_PARTY_TOKEN_SECRET="local-secret"
npm run dev
```

Frontend local có thể dùng socket server local:

```text
NEXT_PUBLIC_WATCH_PARTY_API_URL=http://localhost:4001
NEXT_PUBLIC_WATCH_PARTY_SOCKET_URL=http://localhost:4001
```

Hoặc trỏ trực tiếp tới Render để kiểm thử CORS từ localhost.

## Render

Tạo Render Web Service với Root Directory `socket-server`, Build Command `npm install` và Start Command `npm start`.

```text
NODE_ENV=production
REDIS_URL=<Redis hoặc Upstash connection URL>
CLIENT_ORIGINS=https://your-vercel-domain.vercel.app
WATCH_PARTY_TOKEN_SECRET=<random-secret-at-least-32-bytes>
FIREBASE_PROJECT_ID=moviewiser-watch-party-77fb3
ROOM_TTL_SECONDS=14400
EMPTY_ROOM_TTL_SECONDS=300
HOST_GRACE_SECONDS=15
MAX_ROOM_MEMBERS=50
```

`CLIENT_ORIGINS` nhận nhiều origin phân cách bằng dấu phẩy. Server luôn cho phép loopback `localhost`, `127.0.0.1` và `::1` để frontend local gọi Render trong lúc phát triển.

Vercel và `.env` local cần trỏ hai biến sau tới public Render URL, không có dấu `/` cuối:

```text
NEXT_PUBLIC_WATCH_PARTY_API_URL=https://moviewiser-socket.onrender.com
NEXT_PUBLIC_WATCH_PARTY_SOCKET_URL=https://moviewiser-socket.onrender.com
```

Render Free có thể sleep và cold start khoảng một phút. Nếu `/ready` trả `"store":"memory"`, phòng sẽ mất khi service restart và không được scale nhiều instance. Cấu hình `NODE_ENV=production` cùng `REDIS_URL` để dùng Redis store.

## Voice WebRTC

Socket server chỉ vận chuyển signaling; audio truyền trực tiếp giữa các trình duyệt. STUN mặc định đủ cho nhiều mạng, nhưng production nên cấu hình TURN ở frontend/Vercel:

```text
NEXT_PUBLIC_WATCH_PARTY_ICE_SERVERS_JSON=[{"urls":"stun:stun.l.google.com:19302"},{"urls":"turn:turn.example.com:3478","username":"...","credential":"..."}]
```

Host có thể cho phép mọi người mở mic hoặc tắt mic toàn phòng. Trình duyệt không cho phép host tự bật microphone của thành viên nếu họ chưa cấp quyền; mỗi thành viên luôn có quyền tắt mic của mình. Nút loa phòng chỉ tắt giọng nói WebRTC và không làm mất tiếng phim.

## Operational endpoints

- `GET /health`: process đang chạy.
- `GET /ready`: Redis/store sẵn sàng nhận traffic.
- `GET /api/rooms`: danh sách phòng public.

## Production invariants

- Không dùng CORS wildcard.
- Không tin member ID, role hoặc timestamp do client gửi.
- Token phòng không được đưa vào URL hay logs.
- HLS hỗ trợ full sync; iframe chỉ limited sync.
