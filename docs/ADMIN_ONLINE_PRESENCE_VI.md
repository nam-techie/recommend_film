# Trạng thái trực tuyến trong admin

## Ý nghĩa số liệu

- **Online**: tài khoản đăng nhập có ít nhất một tab gửi heartbeat hợp lệ trong 90 giây. Tab nền vẫn được tính nếu còn liên lạc. Khách anonymous không được tính; tài khoản admin được tính như tài khoản khác.
- **Đang tương tác**: một tab đang hiển thị và trình duyệt báo thao tác bàn phím, chạm, cuộn hoặc nhấn trong vòng 60 giây. Đây là tín hiệu tương tác giao diện, không xác minh việc xem phim. Lần mở trang được tính là một thao tác.
- **Đang xem phim**: playback session đã xác minh, chưa kết thúc, đang phát và hiển thị hoặc Picture-in-Picture, có heartbeat trong 60 giây. Player nhúng ước tính không được cộng.
- **Chưa bị khóa**: trạng thái cho phép đăng nhập trong Firebase Authentication. Không phải trạng thái online hay hoạt động gần đây.
- **Xác thực đăng nhập cuối**: metadata đăng nhập của Firebase Auth. Không dùng mốc này để suy ra thời gian truy cập.

## Ghi nhận phiên

`OnlineSessionTracker` nằm trong root layout, chạy một lần trên mỗi tab đăng nhập và giữ nguyên phiên khi chuyển route. Client gửi heartbeat mỗi 25 giây và khi chuyển trạng thái hiển thị. API `/api/me/online-session` kiểm tra Firebase ID token (cả thu hồi), lấy UID từ token và đóng dấu thời gian bằng đồng hồ server. Client không gửi UID hay thời lượng tin cậy.

Server lưu `analytics/onlineSessions/{uid}/{sessionId}`; transaction theo tài khoản xử lý thứ tự request, nhiều tab, request trễ và đóng phiên trước khi heartbeat đầu tới. Khi rời trang/đăng xuất, client cố gửi kết thúc bằng fetch keepalive. Nếu trình duyệt tắt đột ngột, ngủ hoặc mất mạng, quá 90 giây không có heartbeat thì phiên hết hạn. Mốc cuối trong trường hợp này là **lần liên lạc cuối**, không phải giờ đóng tab chính xác. Kết nối lại sau hết hạn mở phiên mới, không cộng thời gian mất mạng.

Lịch sử giữ tối đa 50 phiên trong 30 ngày mỗi tài khoản, tối đa 12 kết nối đồng thời. Thời lượng từng phiên = từ lúc bắt đầu tới lần liên lạc cuối/kết thúc; không cộng phần thời gian đang chờ timeout. Các tab có thể trùng thời gian nên không cộng các dòng thành tổng thời gian online của một người. Số người online luôn khử trùng theo UID.

Admin đọc `/api/admin/online-presence` mỗi 15 giây khi tab admin hiển thị; endpoint yêu cầu `analytics.read`. Phần phiên online không chứa tên phim, URL trang, IP hay nội dung thao tác. Timeline phim vẫn giữ cơ chế duyệt riêng có MFA/audit.

Đây là cập nhật gần thời gian thực: trạng thái mới thường đến sau heartbeat tiếp theo + chu kỳ làm mới. Mất kết nối đột ngột có thể cần tối đa khoảng 105 giây để phản ánh ở admin, chưa tính độ trễ mạng. Tab bị trình duyệt đóng băng có thể hết hạn dù cửa sổ vẫn mở; online biểu thị kết nối đã xác nhận, không phải bằng chứng người ngồi trước máy.

## Dữ liệu cũ và vận hành

- Không đọc `presenceConnections` dạng boolean để tính admin online nữa. Node cũ còn sót không làm tăng số đếm.
- Không backfill phiên từ `lastSignInTime`, `presenceLastSeen` hay lịch sử resume. Người chưa có phiên mới hiển thị **Chưa ghi nhận**.
- Peak online dùng nhánh mới `analytics/aggregates/onlinePresence5m`, lấy giá trị lớn nhất trong mẫu admin/cron. Đây là đỉnh **ghi nhận được**, không cam kết bắt được mọi đỉnh giữa hai mẫu; không dùng bucket cũ.
- Retention analytics hiện có dọn phiên quá 30 ngày và peak quá 90 ngày. Hết hạn online được tính trực tiếp khi đọc, không phụ thuộc cron đang chạy. Mỗi lần ghi heartbeat cũng giới hạn lịch sử tài khoản.
- Dữ liệu mới nằm dưới nhánh `analytics` đã cấm client đọc/ghi trong rules hiện tại. Không cần biến môi trường mới. Server dùng Firebase Admin như analytics hiện có.
- Khi xóa dữ liệu tài khoản, nhánh phiên online của UID cũng được xóa.
- Snapshot hiện đọc tập phiên được giới hạn theo từng tài khoản. Khi số lượng tài khoản lớn, cần chuyển phần trạng thái hiện tại sang chỉ mục riêng để giảm lượng dữ liệu mỗi lần đọc; không tăng tần suất polling toàn bộ lịch sử.

## Tự kiểm tra sau cập nhật

Tải lại các tab CineMind để nạp tracker mới. Mở nhiều tab cùng một tài khoản: số online chỉ tăng một người; chi tiết tài khoản hiển thị nhiều kết nối. Dừng thao tác trên một tab hiển thị hơn 60 giây: vẫn online nếu heartbeat còn tới, nhưng không còn đang tương tác. Đóng hết tab của tài khoản thử nghiệm hoặc ngắt mạng: trạng thái chuyển offline sau kết thúc được server nhận hoặc hết hạn 90 giây. Giữ admin bằng tài khoản khác thì tài khoản admin vẫn được tính online.

Không chạy test, build hoặc xác nhận hành vi live trong lần sửa này theo yêu cầu của người dùng; các tình huống trên dành cho việc kiểm tra thủ công.
