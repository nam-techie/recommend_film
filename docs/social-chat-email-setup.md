# Kết bạn, chat phòng và email invite

## Firebase Console

1. Vào **Authentication → Sign-in method** và bật Google.
2. Chọn support email cho Google provider.
3. Thêm `localhost`, domain Vercel và domain production vào **Authorized domains**.
4. Deploy `firebase-database.rules.json` bằng `firebase deploy --only database` sau khi kiểm thử.

Firebase Authentication tiếp tục tự gửi email xác minh và reset mật khẩu. Resend (hoặc SMTP fallback) chỉ gửi lời mời xem chung.

## Render backend

Backend cần Firebase service account để lookup email và ghi invite bằng Admin SDK. Tính năng này dùng được ở Firebase Spark, không cần mở billing. Khuyến nghị tạo Render Secret File `firebase-service-account.json`, sau đó cấu hình:

```env
GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/firebase-service-account.json
FIREBASE_PROJECT_ID=moviewiser-watch-party-77fb3
FIREBASE_DATABASE_URL=https://moviewiser-watch-party-77fb3-default-rtdb.asia-southeast1.firebasedatabase.app
```

Không gửi service-account JSON hoặc App Password qua chat, không commit vào Git. Nếu không dùng Secret File, backend cũng hỗ trợ `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_SERVICE_ACCOUNT_BASE64`, hoặc ba biến tách rời `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.

### Gửi email bằng Resend

Render Free nên dùng Resend HTTPS API thay cho SMTP. Sau khi verify domain trên Resend, đặt hai biến bắt buộc trên Render:

```env
RESEND_API_KEY=<resend-api-key>
RESEND_FROM=CineMind <invite@namtechie.id.vn>
```

`RESEND_REPLY_TO=support@namtechie.id.vn` là tùy chọn. Không thêm biến này vẫn gửi được; chỉ thêm khi địa chỉ support thực sự nhận thư. Server ưu tiên Resend nếu có đủ hai biến trên, còn nhóm `MAIL_*` chỉ làm fallback. Không đặt bất kỳ biến Resend nào ở Vercel hoặc dưới tiền tố `NEXT_PUBLIC_*`.

## Xử lý lỗi 404 và permission denied

- Nếu `POST /api/friends/lookup-email` trả `404`, frontend đã trỏ đúng service nhưng Render đang chạy phiên bản cũ chưa có route này. Deploy lại thư mục `socket-server`, sau đó kiểm tra `/ready` trước khi thử lại.
- `/ready` cần trả `firebaseAuthConfigured: true`, `firebaseAuthHealthy: true`, `socialDatabaseConfigured: true` và `socialDatabaseHealthy: true`. Nếu configured là `false`, credential chưa được nhận; nếu healthy là `false`, file/key không đọc được, key bị thu hồi, URL regional hoặc project ID đang sai.
- Nếu console báo `presenceConnections` hoặc `presenceLastSeen: permission_denied`, deploy file `firebase-database.rules.json` lên đúng project `moviewiser-watch-party-77fb3`. Sửa rules trong Git nhưng chưa deploy sẽ không thay đổi quyền của Realtime Database production.
- `NEXT_PUBLIC_WATCH_PARTY_API_URL` trên Vercel/local hiện vẫn dùng URL gốc của service (ví dụ `https://moviewiser-socket.onrender.com`); không cần thêm URL riêng cho endpoint tìm email.

Thiết lập các biến `FIREBASE_DATABASE_URL`, `APP_BASE_URL`, `RESEND_*` và SMTP fallback được liệt kê trong `socket-server/README.md`.

Kiểm tra sau deploy:

1. `GET /ready` trả bốn trạng thái Firebase là `true`, cùng `mailProvider: "resend"`, `mailConfigured: true` và `mailHealthy: true`.
2. Đăng nhập production bằng Google và xác nhận profile được tạo.
3. Tìm email đúng/sai; request thứ 11 trong một phút phải bị giới hạn.
4. Gửi lời mời từ một thành viên phòng đã đăng nhập; người nhận thấy notification có link vào phòng. API báo email `sent`, hoặc báo lý do `not_configured`, `disabled`, `no_email`, `unverified`, `firebase_admin`, `email_api_error`, `smtp_error` mà không làm mất notification web.
5. Tắt **Email mời xem chung** trong Quyền riêng tư; lần mời sau chỉ xuất hiện trong ứng dụng.
