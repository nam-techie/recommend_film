# Karaoke

Karaoke mở cho mọi tài khoản đã đăng nhập, phân quyền theo gói ở server. Quyền và nguồn tham khảo UI được lưu tại [UI_REFERENCES.md](UI_REFERENCES.md).

- Miễn phí: vào bằng link/mã, nghe và thả cảm xúc.
- CinePass Plus: thêm bài và hát solo trong phòng được mời.
- CinePass Ultra: tạo phòng, quản lý thành viên/hàng chờ và song ca.
- Tối đa 4 người/phòng, 2 microphone được chọn, 100 phòng trên một instance. Mỗi chủ phòng có một phòng, hết hạn sau 2 giờ.
- Thư viện cá nhân và song ca: xem [karaoke-personalization.md](karaoke-personalization.md).

## Cấu hình và chạy

Dùng Firebase Admin và LiveKit của socket service. Frontend dùng NEXT_PUBLIC_WATCH_PARTY_SOCKET_URL hoặc NEXT_PUBLIC_WATCH_PARTY_API_URL như phòng phim.

Karaoke bật mặc định theo gói. KARAOKE_PILOT_ENABLED, KARAOKE_PILOT_UIDS và KARAOKE_PILOT_ALLOW_ALL_LOCAL không còn quyết định quyền. Đặt KARAOKE_ENABLED=false trên socket server khi cần bảo trì.

Chạy node scripts/dev-karaoke-local.cjs rồi mở http://localhost:3000/karaoke. Local vẫn đọc gói từ Firebase; không tự cấp quyền Ultra. Không thay đổi cấu hình production để test local.

Deploy web lên Vercel và socket-server lên Render cùng phiên bản. Có link Karaoke trên header/menu di động. Một instance socket; phòng karaoke lưu trong RAM và kết thúc khi restart. Redis vẫn cần cho Watch Party production, không cung cấp phục hồi hay đồng bộ nhiều instance karaoke.

## Giọng hát và quyền

Token vào LiveKit chỉ được nghe. Server đọc entitlement trước thao tác và cấp mic; chỉ người được chọn ở lượt hiện tại được publish microphone. Kiểm tra lại gói mỗi 15 giây để thu hồi mic sau hạ gói. Lỗi đọc entitlement không cấp thêm quyền. Quyền mic bị lỗi khi thu hồi được retry độc lập.

Chủ lượt chuẩn bị mic rồi bắt đầu hát; Tắt mic chỉ tắt mic của mình. Đồng hồ playback và RTT không đo độ trễ giọng hát một chiều.

Biểu đồ 40 cột đọc MediaStreamTrack thật; local signal không chứng minh người khác nghe được. HTTPS hoặc localhost cần cho microphone.

Reaction được gửi cả phòng, giới hạn 1 lần/1,2 giây/socket. UI giữ tối đa 8 hiệu ứng trong 2,4 giây; chế độ giảm chuyển động dùng thông báo chữ.

## Kiểm thử

Backend: npm --prefix socket-server test.
Frontend: npx vitest run tests/karaoke-page.test.tsx tests/karaoke-voice.test.tsx tests/karaoke-sync.test.ts tests/karaoke-audio-meter.test.ts.
TypeScript: npx tsc --noEmit --incremental false. Build: npm run build.

Playwright dùng đúng component và server.js, mô phỏng Firebase trong tiến trình riêng:
1. Cài Playwright vào .qa/deps: npm install --prefix .qa/deps playwright.
2. Đặt ROOM_TEST_MODE=1, PORT=4411, CLIENT_ORIGINS=http://127.0.0.1:4318, chạy node --import ./scripts/test-room-services.mjs socket-server/server.js.
3. Chạy node scripts/check-room-access.cjs. Ảnh và báo cáo nằm trong .qa/results.

Fixture xác minh tạo phòng phim HTTP 201 với a.kvp726.com, tạo phòng karaoke Ultra, quyền Plus/miễn phí, reaction đa người, reduced motion và mobile overflow. YouTube/LiveKit và danh tính Firebase được mô phỏng, font UI dùng sans-serif dự phòng. Không thay thế kiểm tra microphone thật, tài khoản production hay nghe LiveKit qua hai mạng.
