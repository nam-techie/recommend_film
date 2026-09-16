# Bản thử nhân vật trong rạp 3D

Mở `/watch-party/demo-3d` để thử bốn nhân vật trong `public/3d`. Demo dùng khán giả minh họa. Room 3D trong phòng thật cũng đã bật nhân vật cho các ghế được máy chủ xác nhận.

## Cách thử

1. Chọn trang phục **Thường** hoặc **VIP**, rồi chọn **Nam** hoặc **Nữ**.
2. Nhân vật của bạn bắt đầu ở ghế D4. Chọn góc **Nhân vật** để quan sát gần, kéo để xoay, cuộn/chụm để zoom.
3. Chọn ghế trống rồi bấm **Ngồi thử ghế…**. Nhân vật đi từ lối sau, qua lối giữa, đến hàng ghế rồi ngồi. Có thể thử cả ghế đỏ và ghế VIP trắng.
4. Đổi sang ghế trống khác để xem nhân vật đi và ngồi. Ghế đã có người vẫn không thể chọn. Nút tải lại chỉ xuất hiện khi model tải lỗi.

Lựa chọn ngoại hình được nhớ bằng khóa localStorage `cinemind:character-demo:v1`. Dữ liệu này chỉ dành cho demo, không cấp quyền VIP. Khi trình duyệt không cho lưu, lựa chọn vẫn hoạt động trong lần xem hiện tại. Thiết bị bật giảm chuyển động sẽ chuyển thẳng sang tư thế ngồi.

## Tài nguyên

| Mẫu | File gốc | File dùng trong demo | Tam giác sau tối ưu |
| --- | --- | --- | ---: |
| Nam thường | male_3d.glb | male_3d.optimized.glb | 11.558 |
| Nữ thường | female_3d.glb | female_3d.optimized.glb | 13.430 |
| Nam VIP | male_vip_3d.glb | male_vip_3d.optimized.glb | 13.032 |
| Nữ VIP | female_vip_3d.glb | female_vip_3d.optimized.glb | 17.216 |

Bốn bản tối ưu có dung lượng tổng khoảng 2,35 MiB, so với khoảng 107 MiB của bản gốc. File gốc được giữ nguyên. Ảnh chọn nhân vật hiện lấy từ bốn PNG người dùng cung cấp: `male.png`, `female.png`, `male_vip.png`, `female_vip.png`. Bản WebP nhẹ nằm ở `public/3d/character-cards` (tổng khoảng 27 KiB), tạo lại bằng `node scripts/prepare-cinema-character-cards.cjs`. Các ảnh render GLB cũ trong `portraits` được giữ nguyên.

Tái tạo tài nguyên:

```powershell
node scripts/optimize-cinema-characters.mjs
# Hai biến này chỉ cần đặt nếu Playwright/browser không nằm ở đường dẫn mặc định.
$env:CINEMIND_PLAYWRIGHT_PATH = '<duong-dan-goi-playwright>'
$env:CINEMIND_CHROMIUM_PATH = '<duong-dan-chrome.exe>'
node scripts/preview-cinema-character-assets.cjs
```

## Chuyển động và giới hạn

File GLB gốc không có xương hoặc clip hoạt ảnh. `cinema-character-rig.ts` tạo bộ xương 15 khớp và trọng số theo vị trí hình học cho riêng bốn model A-pose này. Mỗi người có bộ xương độc lập; hình học và texture được dùng chung theo mẫu. Hoạt ảnh chân, tay, ngồi và quay đầu nhẹ được điều khiển bằng code.

Đây là rig ước lượng để duyệt phong cách, tỷ lệ và đường đi. Vai, khuỷu tay, váy và tóc dài có thể biến dạng khi nhìn gần; chưa tương đương một model được chỉnh skin weights thủ công. Ngoại hình không có mắt/mũi chi tiết là từ tài nguyên gốc. Lựa chọn nam/nữ trong phòng thật đã được đồng bộ qua Socket.IO. Cửa tự mở và tùy biến quần áo vẫn chưa có; quyền mic giữ theo chính sách phòng hiện tại.

Room 3D cho chọn nam/nữ và đồng bộ tới mọi thành viên trong cùng phòng. Gói Ultra tự động dùng mẫu VIP ở mọi ghế; CinePass/Plus dùng mẫu thường. Người xem hiện tại lấy gói từ entitlement provider, những người khác lấy `accountPlan` do server gửi trong dữ liệu thành viên. Vị trí ghế chỉ ảnh hưởng tư thế ngồi, không quyết định mẫu nhân vật. Sau lần xác nhận ghế mới, cảnh 3D giữ nguyên để xem nhân vật đi/ngồi; bấm Vào xem phim để sang trình phát chính. Quyền giữ ghế và mic vẫn do máy chủ kiểm tra. Server lưu `characterGender` và `characterRevision` riêng khỏi snapshot phòng để heartbeat/phát phim không ghi đè ngoại hình. Redis lưu theo room/member với TTL của phòng; local memory dùng cùng giao thức. Giá trị cục bộ cũ chỉ khởi tạo khi server chưa có lựa chọn, không ghi đè sau reconnect. Cả chính mình và người khác dựng model từ giới tính đã xác nhận và gói tài khoản, không tự đoán theo memberId. Lựa chọn này tồn tại trong vòng đời phòng, chưa phải hồ sơ nhân vật toàn tài khoản.

## Kiểm tra

- `tests/cinema-character.test.ts`: đọc geometry của cả bốn GLB tối ưu; kiểm tra tổng trọng số, bind pose, vị trí đầu gối khi ngồi, số hữu hạn và bộ xương riêng cho từng người.
- `scripts/check-cinema-characters.cjs`: kiểm tra bốn lựa chọn, ghế thường/VIP, từ chối ghế có người, ghi nhớ ngoại hình, giảm chuyển động, phát lại đường đi, lỗi trang và tải tài nguyên trên desktop/mobile.
- Ảnh kiểm tra được ghi vào `.impeccable/review/characters/`.

```powershell
node node_modules/vitest/vitest.mjs run tests/cinema-character.test.ts
node scripts/check-cinema-characters.cjs
```


## Avatar nhận diện

Avatar tài khoản (hoặc chữ viết tắt khi thiếu ảnh/tải lỗi) hiện phía trên đầu và đi theo xương đầu khi đi/ngồi. Góc nhìn từ ghế ẩn nhân vật và avatar của chính ghế đó; góc màn chiếu không hiện nhân vật. Badge không tạo quyền VIP, không thay đổi quyền ghế hay mic.

Kiểm tra tích hợp: `tests/cinema-room-character.test.tsx` xác minh phòng thật truyền nhân vật cho cảnh, Ultra dùng VIP cả trước khi chọn ghế và trên ghế A1, hạ gói chuyển về mẫu thường. `tests/cinema-character.test.ts` xác minh quy tắc gói và vị trí avatar theo xương đầu.


## Kiểm tra đồng bộ nhiều người

`socket-server/test/cinema-characters.test.js` chạy hai Socket.IO client trên server tạm: đổi nam/nữ, người vào sau, reconnect, khởi tạo từ lựa chọn cũ, giới hạn tốc độ, chặn giả mạo memberId/gói và thiết bị remote. `tests/cinema-character-sync.test.tsx` kiểm tra server ưu tiên hơn localStorage, lỗi lưu và snapshot cũ. Khi triển khai cần cập nhật cả Next.js và socket server.
