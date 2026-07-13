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

## Railway Watch Party server

Sau khi Railway cấp public domain, cấu hình trên Vercel (không dùng localhost):

```text
NEXT_PUBLIC_WATCH_PARTY_API_URL=https://<watch-party-service>.up.railway.app
NEXT_PUBLIC_WATCH_PARTY_SOCKET_URL=https://<watch-party-service>.up.railway.app
```

Luồng production là: trình duyệt → watch-party server → CDN HLS của KKPhim. API phim vẫn cung cấp metadata và URL nguồn; watch-party server chỉ proxy manifest/segment để tránh CDN bị browser chặn và để CORS ổn định.

```text
REDIS_URL=...
CLIENT_ORIGINS=https://your-vercel-domain.vercel.app
WATCH_PARTY_TOKEN_SECRET=use-a-long-random-secret
FIREBASE_SERVICE_ACCOUNT_JSON={...single-line service account JSON...}
ROOM_TTL_SECONDS=14400
EMPTY_ROOM_TTL_SECONDS=300
HOST_GRACE_SECONDS=15
MAX_ROOM_MEMBERS=50
NODE_ENV=production
```

Never commit the Firebase service-account JSON. `CLIENT_ORIGINS` is a comma-separated allowlist and must not be `*` in production.

Run locally with `npm run dev`. If port 4001 is already occupied, stop the previous Watch Party Node process before starting another one.
