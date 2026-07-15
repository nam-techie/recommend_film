# Watch Party setup

## Local/Vercel client

Set the existing `NEXT_PUBLIC_FIREBASE_*` variables and:

```text
NEXT_PUBLIC_WATCH_PARTY_API_URL=http://localhost:4001
NEXT_PUBLIC_WATCH_PARTY_SOCKET_URL=http://localhost:4001
```

### Bắt buộc thiết lập Firebase Authentication

1. Mở Firebase Console đúng project trong `NEXT_PUBLIC_FIREBASE_PROJECT_ID`.
2. Vào **Build → Authentication** và bấm **Get started**. Nếu chưa bấm bước này, Firebase trả `auth/configuration-not-found` dù `.env` đã đúng.
3. Vào **Sign-in method**:
   - Bật **Email/Password** (không cần bật Email link).
   - Bật **Google**, chọn support email rồi Save.
4. Vào **Authentication → Settings → Authorized domains**:
   - Thêm `localhost` để chạy local.
   - Thêm domain Vercel thực tế, không bao gồm `https://` hoặc đường dẫn.
5. Deploy `firebase-database.rules.json` để mỗi tài khoản chỉ truy cập được `users/{auth.uid}`.

Các biến client bắt buộc:

```text
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://<database-name>.<region>.firebasedatabase.app
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

Sau khi thay `.env`, phải dừng và chạy lại `npm run dev`; Next.js không nạp lại toàn bộ Firebase config chỉ bằng Fast Refresh.

Nếu vẫn thấy `auth/configuration-not-found`, kiểm tra project trong `NEXT_PUBLIC_FIREBASE_PROJECT_ID` có đúng project vừa bật Authentication hay không. Nếu thấy `auth/unauthorized-domain`, thêm domain hiện tại vào Authorized domains.

## Render Watch Party server

Sau khi Render cấp public domain, cấu hình trên Vercel (không dùng localhost):

```text
NEXT_PUBLIC_WATCH_PARTY_API_URL=https://<watch-party-service>.onrender.com
NEXT_PUBLIC_WATCH_PARTY_SOCKET_URL=https://<watch-party-service>.onrender.com
```

Trang xem riêng nhúng thẳng `link_embed`, không gọi Render, Redis hay HLS proxy. Phòng xem chung ưu tiên tải HLS trực tiếp từ CDN trong trình duyệt; nếu tuyến trực tiếp lỗi thì player mới thử HLS proxy của watch-party server. API phim vẫn cung cấp metadata và URL nguồn, còn Render chỉ là tuyến media dự phòng bên cạnh API/Socket.IO.

Render dùng Runtime `Node`, Root Directory `socket-server`, Build Command `npm ci`, Start Command `npm start` và Health Check Path `/ready`.

```text
REDIS_URL=...
CLIENT_ORIGINS=https://your-vercel-domain.vercel.app
MEDIA_ALLOWED_HOSTS=s3.phim1280.tv
WATCH_PARTY_TOKEN_SECRET=use-a-long-random-secret
FIREBASE_SERVICE_ACCOUNT_JSON={...single-line service account JSON...}
ROOM_TTL_SECONDS=14400
EMPTY_ROOM_TTL_SECONDS=300
HOST_GRACE_SECONDS=15
MAX_ROOM_MEMBERS=50
LIVEKIT_URL=wss://<project>.livekit.cloud
LIVEKIT_API_KEY=<server-only-api-key>
LIVEKIT_API_SECRET=<server-only-api-secret>
NODE_ENV=production
```

Never commit the Firebase service-account JSON. `CLIENT_ORIGINS` is a comma-separated allowlist and must not be `*` in production.

`MEDIA_ALLOWED_HOSTS` bổ sung các hostname CDN HLS/segment tin cậy, phân cách bằng dấu phẩy. Không thêm `*`; server đã cho phép sẵn các host KKPhim và `s3.phim1280.tv`.

Trên Vercel, đặt cả hai URL xem chung thành cùng origin HTTPS rồi redeploy vì biến `NEXT_PUBLIC_*` được đóng vào bundle lúc build:

```text
NEXT_PUBLIC_WATCH_PARTY_API_URL=https://moviewiser-socket.onrender.com
NEXT_PUBLIC_WATCH_PARTY_SOCKET_URL=https://moviewiser-socket.onrender.com
```

Voice dùng LiveKit Cloud SFU. Chỉ cấu hình `LIVEKIT_URL`, `LIVEKIT_API_KEY` và `LIVEKIT_API_SECRET` trên Render; không cấu hình STUN/TURN hoặc secret LiveKit trên frontend. `GET /ready` trả thêm `voiceConfigured` để xác nhận máy chủ đã nhận đủ ba biến này.

Run locally with `npm run dev`. If port 4001 is already occupied, stop the previous Watch Party Node process before starting another one.
