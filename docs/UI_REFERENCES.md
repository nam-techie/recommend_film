# Nguồn tham khảo UI
- React Bits: https://reactbits.dev/get-started/index
- Uiverse: https://uiverse.io/elements

Karaoke dùng tương tác cổ vũ ngắn và nút có phản hồi khi nhấn lấy cảm hứng từ hai thư viện. Component được viết bằng React/CSS sẵn có, không thêm thư viện animation. Hiệu ứng chỉ chạy khi phòng nhận reaction; tối đa 8 hiệu ứng, tự hết sau 2,4 giây. Khi bật giảm chuyển động, chỉ hiện thông báo cổ vũ.

## Quyền karaoke
| Gói | Nghe và reaction | Thêm bài, hát solo | Song ca | Tạo và quản lý phòng |
| --- | --- | --- | --- | --- |
| Miễn phí | Có | Không | Không | Không |
| CinePass Plus | Có | Có | Không | Không |
| CinePass Ultra | Có | Có | Có | Có |

Mọi tài khoản Google được vào phòng bằng link/mã; vẫn giới hạn 4 người/phòng, 2 mic được chọn. Server đọc entitlement từ Firebase; không tin plan gửi từ client. Quyền thao tác và xin mic được kiểm tra lại; kiểm tra định kỳ 15 giây thu hồi quyền sau khi hạ gói. Lỗi dịch vụ quyền mặc định không cấp quyền hát.

## Deploy bản sửa
Deploy cùng nhánh lên Vercel (web) và Render (socket-server). Không chỉ deploy frontend.
Karaoke mở theo gói mặc định, không còn dùng KARAOKE_PILOT_ENABLED/KARAOKE_PILOT_UIDS. Có thể đặt KARAOKE_ENABLED=false trên Render để bảo trì. Khởi động lại socket sẽ kết thúc các phòng karaoke trong RAM; không restart giữa buổi đang hát.
CDN a.kvp726.com đã được thêm chính xác vào chính sách dùng chung cho tạo phòng, probe và proxy HLS. MEDIA_ALLOWED_HOSTS vẫn hỗ trợ CDN bổ sung.
