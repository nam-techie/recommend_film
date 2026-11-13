# Karaoke Pilot

Phiên bản thư viện cá nhân, chủ lượt và song ca hai mic: xem [karaoke-personalization.md](karaoke-personalization.md). Phần kết quả ban đầu dưới đây thuộc phiên bản cũ, không chứng minh thay đổi mới đã được kiểm tra.

## Chạy thử

### Giao diện sân khấu và chế độ mở local

Chạy `node scripts/dev-karaoke-local.cjs`, rồi mở `http://localhost:3000/karaoke`. Lệnh này chạy web và socket trên loopback, bật pilot cho mọi tài khoản Firebase đã đăng nhập ở localhost mà không cần danh sách tester. Không thay đổi `.env` hoặc cấu hình production. Chế độ này yêu cầu `NODE_ENV=development` cùng `KARAOKE_PILOT_ALLOW_ALL_LOCAL=true`; server bỏ qua chế độ mở khi chạy production. Giới hạn 4 thành viên, chủ lượt điều khiển bài của mình và quyền publish tối đa hai người hát được chọn vẫn áp dụng. Nếu web/socket đã chạy trên cổng 3000/4001, dừng các tiến trình đó trước khi chạy lệnh gộp.

Trang phòng dùng video bên trái, hàng chờ và bạn bè bên phải; màn hình nhỏ xếp video → người hát/mic → điều khiển → hàng chờ → bạn bè. Chuẩn bị mic trước, sau đó bấm Bắt đầu hát. Có nút Tắt mic; thao tác này chỉ thu hồi mic của bạn, không tự kết thúc lượt. Đánh giá và xuất JSON nằm trong mục chẩn đoán thu gọn cuối trang.

Biểu đồ canvas 40 cột đọc trực tiếp `mediaStreamTrack` của LiveKit bằng Web Audio, không xin thêm stream và không nối microphone vào loa. Người hát thấy “Mic của bạn”; người nghe thấy “Giọng đang nhận” từ track của người hát hiện tại. Canvas tối đa 30 fps, dừng khi tab bị ẩn, dọn tài nguyên khi track/room thay đổi. RMS dưới −50 dBFS liên tục 3 giây hiện “Chưa thấy tín hiệu”; đây không phải nhận dạng giọng nói. Tín hiệu local không chứng minh người khác đã nghe được. Phân tích âm thanh lỗi chỉ làm mất biểu đồ, không ngắt chức năng hát.

Giao diện kế thừa token màu, font và Button dùng chung của CineMind: nền xanh đen, nút chính fuchsia, nút phụ outline/ghost. Đã bỏ ánh sáng nền trang trí và bảng màu EDM riêng theo yêu cầu cập nhật. Vòng sáng nhẹ theo mức tín hiệu đo được; slider vẫn dùng phím mũi tên và hỗ trợ giảm chuyển động. Không có lấy lời YouTube, nhận dạng lời, ghi âm, bắt beat nhạc hoặc cảnh WebGL trang trí.

Header gom Phòng chiếu (`/watch-party`) và Karaoke (`/karaoke`) trong nhóm VIP có thể mở rộng trên desktop và mobile. Đã bỏ Quốc gia và mục Xem chung trùng trên header để dành diện tích cho nhóm này. Đây là nhóm điều hướng; quyền truy cập phòng và quyền mic vẫn do các cơ chế hiện có quản lý.

Nguồn cảm hứng: [Uiverse Buttons](https://uiverse.io/buttons), [React Bits Light Rays](https://reactbits.dev/backgrounds/light-rays), [Magic Rings](https://reactbits.dev/backgrounds/magic-rings), [Elastic Slider](https://reactbits.dev/components/elastic-slider). CSS/canvas được viết riêng cho module này; không sao chép mã nguồn các ví dụ.

Theo yêu cầu hiện tại của người dùng, các lượt sửa tiếp theo không tự chạy test, build hay kiểm tra trình duyệt; chờ lệnh test rõ ràng. Các lệnh bên dưới là hướng dẫn để chạy khi được yêu cầu.

### Chế độ allowlist thông thường

Giữ cấu hình Firebase Admin và LiveKit đang dùng cho socket service. Thêm vào môi trường của **socket server**:

```dotenv
KARAOKE_PILOT_ENABLED=true
KARAOKE_PILOT_UIDS=uid_tester_1,uid_tester_2
```

Không đưa UID allowlist, LiveKit secret hoặc Firebase Admin credential vào biến NEXT_PUBLIC. Frontend dùng NEXT_PUBLIC_WATCH_PARTY_SOCKET_URL (hoặc API URL) như phòng phim. `npm run dev` chạy web và socket; mở `/karaoke`, đăng nhập tài khoản test. HTTPS bắt buộc cho mic khi test qua mạng (localhost được phép). Thêm origin preview vào CLIENT_ORIGINS và Firebase authorized domains trước khi thử.

Nếu frontend local đang trỏ socket production, đặt NEXT_PUBLIC_WATCH_PARTY_API_URL và NEXT_PUBLIC_WATCH_PARTY_SOCKET_URL thành http://localhost:4001 trong môi trường local, rồi restart web. Cờ pilot và danh sách UID đặt tại `.env` root khi dùng script dev hiện có, hoặc environment của service khi deploy. Không sửa cấu hình production chỉ để chạy thử local.

Mặc định pilot tắt; không có link trong menu chính. Chỉ chạy một instance socket server. Phòng karaoke lưu trong RAM: restart kết thúc phòng. Production socket server vẫn cần Redis theo cấu hình Watch Party hiện có. Không có phục hồi lượt hoặc multi-instance karaoke.

## Buổi thử

1. Hai người ở hai mạng khác nhau, Chrome/Edge máy tính, tai nghe. Tạo phòng và gửi link.
2. Mỗi người bấm Bật âm thanh. Thêm 3 video thu sẵn đã kiểm tra nhúng được; không dùng live.
3. Chủ lượt đầu hàng bấm Chuẩn bị lượt. Chủ lượt bấm Chuẩn bị mic, cấp mic rồi Bắt đầu hát.
4. Nghe với offset 0 trước; thử căn nhạc trễ tại máy người nghe nếu cần. Offset là vị trí playback mục tiêu, không phải phép đo độ trễ audio.
5. Kết thúc từng bài, lưu đánh giá 1–5. Mỗi người xuất JSON riêng; không chứa âm thanh hoặc token.
6. Lặp lại với 3–4 người, đổi người hát. Thử ngắt mạng, refresh, tab trùng, từ chối mic, video không nhúng được.
7. Thực hiện ít nhất 3 buổi 20–30 phút. Không suy diễn một buổi local thành chất lượng Internet thực tế.

## Đánh giá

Mục tiêu: p95 độ lệch player <=500 ms trong đoạn ổn định, tối đa 2 lần tự seek / 3 phút, >=80% đánh giá đạt 4/5. JSON xuất mẫu thô có performanceId và cờ stable, p95StableDriftMs (null nếu chưa có mẫu), tổng số tự seek và số điều chỉnh thủ công riêng. Đoạn ổn định loại 5 giây đầu sau load/seek/buffering. RTT không phải độ trễ giọng một chiều. Không có khẳng định đã đạt các mục tiêu trước khi test nhóm.

Nếu phải căn liên tục hoặc nhạc–giọng vẫn khó nghe, dừng mở rộng và nghiên cứu nguồn nhạc có quyền xử lý để truyền chung luồng. Chưa triển khai 3D/AI scoring.

## Tắt và khôi phục

Đóng các phòng bằng host trước, sau đó đặt KARAOKE_PILOT_ENABLED=false và restart service. Kiểm tra các phòng có tiền tố karaoke-pilot trong LiveKit dashboard đã đóng; crash có thể để lại phòng LiveKit cho đến timeout của nhà cung cấp. Không xóa phòng phim. Client tắt mic khi socket mất kết nối và không tự bật lại sau reconnect.

## Kiểm tra tự động

`npm --prefix socket-server test` kiểm tra server. `npx vitest run tests/karaoke-sync.test.ts` kiểm tra target playback. `npx tsc --noEmit --incremental false` và `npm run build` kiểm tra ứng dụng. Test socket sử dụng HTTP cục bộ và LiveKit giả lập; vẫn cần kiểm tra LiveKit thật và buổi nghe trên nhiều mạng.

Khi có lệnh test, chạy frontend bằng `node node_modules/vitest/vitest.mjs run tests/karaoke-page.test.tsx tests/karaoke-sync.test.ts tests/karaoke-audio-meter.test.ts tests/karaoke-voice.test.tsx`. Các test mới bao gồm ngưỡng im lặng, giới hạn fps, tab ẩn, thu hồi tài nguyên, đổi người hát, quyền mic trả về muộn, từ chối quyền và track người nghe. Bộ kiểm tra UI tùy chọn: `node scripts/check-karaoke-ui.cjs` (cần Playwright; có thể trỏ `CINEMIND_PLAYWRIGHT_PATH` tới package đã cài). Harness dùng dữ liệu/âm thanh tổng hợp, không kết nối các dịch vụ thật và không được đưa vào app route.

Checklist nghe thật: hai tài khoản → chọn người hát/bài → Chuẩn bị mic → nói/im lặng → Bắt đầu hát → người nghe xác nhận cả tiếng và biểu đồ → đổi người hát → tắt mic/ngắt kết nối → xác nhận không tự bật lại. Chưa xác minh âm thanh LiveKit thật qua nhiều mạng. Production build chưa chạy cho đợt nâng cấp sân khấu; kiểm tra dừng theo yêu cầu người dùng trước khi hoàn tất toàn bộ vòng xác minh.

## Kết quả triển khai ban đầu

- 36 test backend được chọn đã qua: karaoke core, Socket.IO thật, room core/governance và service config. Có kiểm tra retry khi thu hồi mic bị lỗi tạm thời, participant đã rời LiveKit, token chỉ nghe, report từ người không được hát và chống command lặp.
- 5 test frontend đã qua: target playback và các trạng thái truy cập/lỗi ban đầu.
- TypeScript và production build đã qua; hai route karaoke có trong build. Trang đăng nhập karaoke đã mở thành công trong browser local.
- Chưa thực hiện đăng nhập nhóm tester, microphone/YouTube/LiveKit thật, kiểm tra phòng phim có voice bằng tay hoặc 3 buổi nghe nhiều mạng. Các tiêu chí âm thanh chưa có kết quả.
- Pilot vẫn tắt mặc định; chưa deploy hoặc thay đổi cấu hình tài khoản thực.
