# Kết bạn, chat phòng và email invite

## Firebase Console

1. Vào **Authentication → Sign-in method** và bật Google.
2. Chọn support email cho Google provider.
3. Thêm `localhost`, domain Vercel và domain production vào **Authorized domains**.
4. Deploy `firebase-database.rules.json` bằng `firebase deploy --only database` sau khi kiểm thử.

Firebase Authentication tiếp tục tự gửi email xác minh và reset mật khẩu. Gmail SMTP chỉ gửi lời mời xem chung.

## Render backend

Backend cần Firebase service account để lookup email và ghi invite bằng Admin SDK. Lưu JSON service account thành một dòng trong `FIREBASE_SERVICE_ACCOUNT_JSON`; không đưa nó vào Vercel frontend hoặc biến `NEXT_PUBLIC_*`.

## Xử lý lỗi 404 và permission denied

- Nếu `POST /api/friends/lookup-email` trả `404`, frontend đã trỏ đúng service nhưng Render đang chạy phiên bản cũ chưa có route này. Deploy lại thư mục `socket-server`, sau đó kiểm tra `/ready` trước khi thử lại.
- `/ready` cần trả `socialDatabaseConfigured: true`. Nếu là `false`, thêm `FIREBASE_SERVICE_ACCOUNT_JSON` vào Environment của Render rồi restart service.
- Nếu console báo `presenceConnections` hoặc `presenceLastSeen: permission_denied`, deploy file `firebase-database.rules.json` lên đúng project `moviewiser-watch-party-77fb3`. Sửa rules trong Git nhưng chưa deploy sẽ không thay đổi quyền của Realtime Database production.
- `NEXT_PUBLIC_WATCH_PARTY_API_URL` trên Vercel/local hiện vẫn dùng URL gốc của service (ví dụ `https://moviewiser-socket.onrender.com`); không cần thêm URL riêng cho endpoint tìm email.

Thiết lập các biến `FIREBASE_DATABASE_URL`, `APP_BASE_URL` và nhóm `MAIL_*` được liệt kê trong `socket-server/README.md`. Tài khoản Gmail gửi mail phải bật 2-Step Verification và dùng App Password 16 ký tự.

Kiểm tra sau deploy:

1. `GET /ready` trả `socialDatabaseConfigured: true` và `mailConfigured: true`.
2. Đăng nhập production bằng Google và xác nhận profile được tạo.
3. Tìm email đúng/sai; request thứ 11 trong một phút phải bị giới hạn.
4. Gửi lời mời từ một thành viên phòng đã đăng nhập; người nhận thấy notification và email. Chat chỉ hoạt động bên trong phòng xem chung.
5. Tắt **Email mời xem chung** trong Quyền riêng tư; lần mời sau chỉ xuất hiện trong ứng dụng.
