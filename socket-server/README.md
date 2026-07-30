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
FIREBASE_DATABASE_URL=https://moviewiser-watch-party-77fb3-default-rtdb.asia-southeast1.firebasedatabase.app
GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/firebase-service-account.json
APP_BASE_URL=https://your-vercel-domain.vercel.app
RESEND_API_KEY=<server-only-resend-api-key>
RESEND_FROM=CineMind <invite@your-domain.example>
# Optional; omit when the mailbox does not exist
RESEND_REPLY_TO=support@your-domain.example
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USERNAME=<sender@gmail.com>
MAIL_PASSWORD=<16-character-google-app-password>
MAIL_FROM=<sender@gmail.com>
MAIL_FROM_NAME=CineMind
ROOM_TTL_SECONDS=43200
EMPTY_ROOM_TTL_SECONDS=300
HOST_GRACE_SECONDS=30
MAX_ROOM_MEMBERS=50
LIVEKIT_URL=wss://<project>.livekit.cloud
LIVEKIT_API_KEY=<server-only-api-key>
LIVEKIT_API_SECRET=<server-only-api-secret>
```

### Email trên Render Free

Resend qua HTTPS là cấu hình được ưu tiên. Chỉ cần `RESEND_API_KEY` và `RESEND_FROM`; `RESEND_REPLY_TO` hoàn toàn tùy chọn và sẽ không được gửi trong request nếu bỏ trống. Domain trong `RESEND_FROM` phải ở trạng thái verified trên Resend. Ví dụ hợp lệ: `CineMind <invite@namtechie.id.vn>`.

Nhóm `MAIL_*` chỉ là SMTP fallback cho local hoặc hạ tầng cho phép kết nối SMTP. Khi cả Resend và SMTP cùng được cấu hình, server luôn chọn Resend. Tất cả key và mật khẩu mail là server-only: chỉ đặt trên Render, không đưa sang Vercel, Git hoặc biến `NEXT_PUBLIC_*`.

`CLIENT_ORIGINS` nhận nhiều origin phân cách bằng dấu phẩy. Server luôn cho phép loopback `localhost`, `127.0.0.1` và `::1` để frontend local gọi Render trong lúc phát triển.

`MEDIA_ALLOWED_HOSTS` nhận hostname CDN bổ sung, phân cách bằng dấu phẩy; có thể dùng dạng `*.example.com`. Các host KKPhim và `s3.phim1280.tv` đã có trong allowlist mặc định. Cùng một chính sách được áp dụng cho probe, tạo phòng, proxy và từng bước redirect.

Firebase Admin không cần nâng Firebase lên Blaze. Cách ít lỗi nhất trên Render là tạo **Secret File** tên `firebase-service-account.json`, dán nguyên JSON tải từ Firebase Console → Project settings → Service accounts, rồi đặt `GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/firebase-service-account.json`. Có thể dùng một trong ba phương án thay thế: `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_SERVICE_ACCOUNT_BASE64`, hoặc bộ `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`; không cấu hình nhiều phương án cùng lúc.

Tất cả Firebase Admin credential, `RESEND_*` và `MAIL_*` là server-only. Firebase Authentication vẫn tự gửi email xác minh/reset mật khẩu; Resend hoặc SMTP chỉ gửi email mời xem chung. Không cần cài Firebase Trigger Email Extension (extension này yêu cầu billing).

Một lần mời luôn ghi notification trên web trước, sau đó mới thử nhà cung cấp email. Vì vậy lỗi Resend/SMTP không xóa lời mời đã ghi. API trả riêng `inAppStatus`, `emailStatus` và `emailReason`; email chỉ gửi tới địa chỉ đã xác minh. Nếu mail chưa cấu hình, notification và chat vẫn hoạt động.

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
- `GET /ready`: Redis/store sẵn sàng nhận traffic và báo riêng `firebaseCredentialSource`, `firebaseAuthConfigured`, `firebaseAuthHealthy`, `socialDatabaseConfigured`, `socialDatabaseHealthy`, `mailProvider`, `mailConfigured`, `mailHealthy` và voice. Với Resend, `mailHealthy` xác nhận client đã đủ cấu hình; lần gửi invite thực tế vẫn trả riêng trạng thái từ Resend.
- `GET /api/rooms`: danh sách phòng public.
- `POST /api/friends/lookup-email`: tìm chính xác tài khoản bằng email, yêu cầu Firebase Bearer token và giới hạn 10 lần/phút.
- `POST /api/rooms/:roomId/invites`: tạo notification/email invite cho một người bạn, yêu cầu Firebase Bearer token.

## Production invariants

- Không dùng CORS wildcard.
- Không tin member ID, role hoặc timestamp do client gửi.
- Token phòng không được đưa vào URL hay logs.
- Trang xem riêng nhúng trực tiếp `link_embed` và không gọi service này.
- Phòng xem chung chỉ dùng HLS để có thể đồng bộ play, pause và seek chính xác; không fallback iframe.
