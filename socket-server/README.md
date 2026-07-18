# MovieWiser Watch Party Service

Socket.IO + HTTP service authoritative cho phòng Xem chung. Service xử lý room state, đồng bộ playback, chat và reaction; voice media chạy qua LiveKit SFU.

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

Tạo Render Web Service với Runtime `Node`, Root Directory `socket-server`, Build Command `npm ci`, Start Command `npm start` và Health Check Path `/ready`. Khi đã đặt Root Directory, không thêm lại tiền tố `socket-server/` vào command.

```text
NODE_ENV=production
REDIS_URL=<Redis hoặc Upstash connection URL>
CLIENT_ORIGINS=https://your-vercel-domain.vercel.app
MEDIA_ALLOWED_HOSTS=s3.phim1280.tv
WATCH_PARTY_TOKEN_SECRET=<random-secret-at-least-32-bytes>
FIREBASE_PROJECT_ID=moviewiser-watch-party-77fb3
ROOM_TTL_SECONDS=43200
EMPTY_ROOM_TTL_SECONDS=300
HOST_GRACE_SECONDS=30
MAX_ROOM_MEMBERS=50
LIVEKIT_URL=wss://<project>.livekit.cloud
LIVEKIT_API_KEY=<server-only-api-key>
LIVEKIT_API_SECRET=<server-only-api-secret>
```

`CLIENT_ORIGINS` nhận nhiều origin phân cách bằng dấu phẩy. Server luôn cho phép loopback `localhost`, `127.0.0.1` và `::1` để frontend local gọi Render trong lúc phát triển.

`MEDIA_ALLOWED_HOSTS` nhận hostname CDN bổ sung, phân cách bằng dấu phẩy; có thể dùng dạng `*.example.com`. Các host KKPhim và `s3.phim1280.tv` đã có trong allowlist mặc định. Cùng một chính sách được áp dụng cho probe, tạo phòng, proxy và từng bước redirect.

Vercel và `.env` local cần trỏ hai biến sau tới public Render URL, không có dấu `/` cuối:

```text
NEXT_PUBLIC_WATCH_PARTY_API_URL=https://moviewiser-socket.onrender.com
NEXT_PUBLIC_WATCH_PARTY_SOCKET_URL=https://moviewiser-socket.onrender.com
```

Render Free có thể sleep và cold start khoảng một phút. Nếu `/ready` trả `"store":"memory"`, phòng sẽ mất khi service restart và không được scale nhiều instance. Cấu hình `NODE_ENV=production` cùng `REDIS_URL` để dùng Redis store.

## Voice SFU

Socket server dùng Watch Party token hiện tại để phát LiveKit participant token giới hạn theo đúng room và member. `LIVEKIT_API_KEY` và `LIVEKIT_API_SECRET` chỉ được đặt trên Render, không đưa vào biến `NEXT_PUBLIC_*` hoặc Vercel frontend.

Khi host bật voice, các thành viên online tự kết nối SFU với mic mặc định tắt. LiveKit quản lý ICE/TURN, reconnect và subscription. Khi host tắt voice, backend xóa LiveKit room và client ngắt media. Nút loa phòng chỉ tắt giọng nói và không làm mất tiếng phim.

## Operational endpoints

- `GET /health`: process đang chạy.
- `GET /ready`: Redis/store sẵn sàng nhận traffic.
- `GET /api/rooms`: danh sách phòng public.

## Production invariants

- Không dùng CORS wildcard.
- Không tin member ID, role hoặc timestamp do client gửi.
- Token phòng không được đưa vào URL hay logs.
- Trang xem riêng nhúng trực tiếp `link_embed` và không gọi service này.
- Phòng xem chung chỉ dùng HLS để có thể đồng bộ play, pause và seek chính xác; không fallback iframe.
