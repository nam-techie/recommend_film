# MovieWiser Watch Party Service

Socket.IO + HTTP service authoritative cho tính năng Phòng xem chung. Production dùng Redis cho room state, TTL, distributed rate limiting và Socket.IO adapter.

## Local development

```powershell
npm install
$env:WATCH_PARTY_TOKEN_SECRET="local-secret"
npm run dev
```

Không có `REDIS_URL`, development dùng memory store. Production bắt buộc Redis.

Frontend local:

```text
NEXT_PUBLIC_WATCH_PARTY_API_URL=http://localhost:4001
NEXT_PUBLIC_WATCH_PARTY_SOCKET_URL=http://localhost:4001
```

## Railway

Tạo một Railway service từ thư mục `socket-server` và một Redis service, sau đó cấu hình:

```text
NODE_ENV=production
REDIS_URL=${{Redis.REDIS_URL}}
CLIENT_ORIGINS=https://your-vercel-domain.vercel.app
WATCH_PARTY_TOKEN_SECRET=<random-secret-at-least-32-bytes>
ROOM_TTL_SECONDS=14400
EMPTY_ROOM_TTL_SECONDS=300
HOST_GRACE_SECONDS=15
MAX_ROOM_MEMBERS=50
```

Vercel cần trỏ hai biến `NEXT_PUBLIC_WATCH_PARTY_API_URL` và `NEXT_PUBLIC_WATCH_PARTY_SOCKET_URL` tới public Railway URL. Không dùng dấu `/` ở cuối URL.

Endpoints vận hành:

- `GET /health`: process đang chạy.
- `GET /ready`: Redis/store sẵn sàng nhận traffic.
- `GET /api/rooms`: danh sách phòng public thật.

## Production invariants

- Không dùng CORS wildcard.
- Không tin member ID, role hoặc timestamp do client gửi.
- Token phòng không được đưa vào URL hay logs.
- HLS hỗ trợ full sync; iframe chỉ limited sync.
