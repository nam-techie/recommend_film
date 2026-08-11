# CineMind — Bảng chức năng và lộ trình kiếm tiền

> Tài liệu theo dõi nghiệp vụ. Cập nhật sau mỗi công đoạn; có thể đổi trạng thái, chỉnh quyền lợi hoặc xoá tính năng nếu không còn phù hợp.
>
> Cập nhật lần cuối: 11/08/2026

## 1. Quy ước trạng thái

- `[x] Đã có`: Đã có trong code và có thể kiểm thử.
- `[~] Một phần`: Có giao diện hoặc nền tảng, nhưng chưa hoàn chỉnh/chưa giới hạn theo gói.
- `[ ] Chưa có`: Chưa triển khai.
- `[?] Cần quyết định`: Chưa chốt nghiệp vụ trước khi code.
- `Bỏ`: Không triển khai hoặc loại khỏi phạm vi.

Mức ưu tiên: `P0` = cần làm trước để vận hành/thu tiền; `P1` = tăng chuyển đổi/giữ chân; `P2` = tính năng cao cấp làm sau khi có dữ liệu.

## 2. Ba gói tài khoản hiện tại

| Gói hiển thị | ID nội bộ | Giá tháng hiện tại | Giá năm hiện tại | Quyền đang áp dụng |
|---|---|---:|---:|---|
| CinePass | `normal` | 0đ | 0đ | 3 phim khác nhau/ngày; 5 tập trong mỗi phim/ngày; tham gia phòng ở chế độ xem |
| CinePass Plus | `premium` | 39.000đ | 390.000đ | Xem không giới hạn; tạo phòng bằng link; tối đa 8 người; chat/reaction |
| CinePass Ultra | `ultra` | 69.000đ | 690.000đ | Mọi quyền Plus; phòng công khai/link/mật khẩu; tối đa 50 người; voice |

ID nội bộ không đổi để không làm hỏng entitlement và mã giảm giá cũ.

## 3. Bảng chức năng theo gói

| Chức năng | CinePass | Plus | Ultra | Trạng thái hiện tại | Ưu tiên | Ghi chú cập nhật |
|---|---|---|---|---|---|---|
| Xem phim theo giới hạn ngày | 3 phim, 5 tập/phim | Không giới hạn | Không giới hạn | `[x] Đã có` | P0 | Server chặn quota và UI hiển thị usage/reset; xem lại không tăng quota |
| Quảng cáo khi xem | Có | Ít hơn (mỗi phiên thứ 3) | Không | `[x] Đã có` | P0 | Interstitial 8 giây dừng khi tab ẩn; impression cần 50% visibility; player chỉ mount sau khi tiếp tục |
| Link Shopee Affiliate | Có | Có/ít hơn | Không | `[x] Đã có` | P0 | CRUD, lịch chạy, trọng số, impression/click idempotent và redirect nội bộ |
| Tham gia phòng | Có, chỉ xem | Có | Có | `[x] Đã có` | P0 | Người miễn phí vẫn nên tham gia để tạo tăng trưởng tự nhiên |
| Tạo phòng | Không | Có | Có | `[x] Đã có` | P0 | CinePass bị chặn ở UI và socket |
| Chế độ phòng | Không | Link | Công khai/link/mật khẩu | `[x] Đã có` | P0 | Server kiểm tra mode theo host |
| Giới hạn thành viên | — | 8 | 50 | `[x] Đã có` | P0 | Có thể điều chỉnh từ cấu hình gói sau này |
| Đồng bộ phát/dừng/đổi tập | — | Có | Có | `[x] Đã có` | P0 | Host điều khiển |
| Chat chữ | Không theo chính sách hiện tại | Có | Có | `[x] Đã có` | P0 | Có thể cân nhắc cho CinePass chat giới hạn |
| Reaction | Không | Có | Có | `[x] Đã có` | P0 | Reaction động độc quyền chưa có |
| Voice chat | Không | Không | Có | `[x] Đã có` | P1 | LiveKit; cần kiểm tra chi phí khi tăng người dùng |
| Video chat | Không | Không | Có | `[ ] Chưa có` | P2 | Chỉ làm sau khi voice ổn định |
| Co-host | Không | Không | Có | `[ ] Chưa có` | P1 | Hiện mô tả Ultra có chữ co-host nhưng code chưa hỗ trợ |
| Kick/ban thành viên phòng | Không | Host cơ bản | Host + quản trị đầy đủ | `[ ] Chưa có` | P1 | Cần log audit và chống lạm dụng |
| Đặt lịch phòng | Không | Không | Có | `[ ] Chưa có` | P1 | Tạo phòng theo thời gian và gửi thông báo |
| Danh sách phim chung/bình chọn | Không | Có | Có nâng cao | `[ ] Chưa có` | P1 | Tạo lý do dùng phòng thường xuyên |
| AI gợi ý phim | Có bản chung | Có | Có | `[~] Một phần` | P1 | Đã có AI recommender nhưng chưa phân hạn mức |
| Hạn mức AI theo gói | 3 lượt/ngày | 20 lượt/ngày | Không giới hạn | `[ ] Chưa có` | P1 | Cần đo chi phí API trước khi áp dụng |
| AI tóm tắt/quiz trong phòng | Không | Không | Có | `[ ] Chưa có` | P2 | Tính năng khác biệt cho Ultra |
| Chọn chất lượng video | Tự động/giới hạn | Tối đa 1080p | Cao nhất nguồn phim | `[~] Một phần` | P1 | Player có chọn quality nhưng chưa khóa theo gói |
| Số thiết bị đồng thời | 1 | 2 | 4 | `[~] Một phần` | P1 | Đã ghi nhận session, chưa chặn số thiết bị |
| Lịch sử/danh sách yêu thích | Có | Có | Có | `[x] Đã có` | P1 | Không nên khóa tính năng nền tảng này |
| Huy hiệu thành viên | Badge CinePass cơ bản | Badge Plus | Badge Ultra | `[x] Đã có` | P2 | Badge tối giản theo entitlement thật trên tài khoản, hồ sơ công khai và Watch Party |
| Theme phòng/khung avatar | Không | Một số theme | Toàn bộ theme | `[ ] Chưa có` | P2 | Không ảnh hưởng chi phí vận hành |
| Guest Pass | Không | Không | 3 khách/tháng | `[ ] Chưa có` | P1 | Khách dùng quyền phòng Ultra trong phiên được mời |

## 4. Thanh toán, discount và affiliate

| Hạng mục | Trạng thái | Ưu tiên | Ghi chú |
|---|---|---|---|
| Trang checkout hiển thị gói | `[x] Đã có` | P0 | Có chọn tháng/năm và nhập mã |
| Tính giá theo mã giảm giá | `[x] Đã có` | P0 | Có mã 1–100%, gói và chu kỳ |
| Mỗi user dùng một mã một lần | `[x] Đã có` | P0 | Có redemption record theo UID |
| Giới hạn tổng lượt mã | `[x] Đã có` | P0 | Có `maxRedemptions` |
| Mã 100% kích hoạt trực tiếp | `[x] Đã có` | P0 | Không cần cổng thanh toán |
| Thanh toán mã giảm một phần | `[ ] Chưa có` | P0 | Chờ SePay/VNPAY/MoMo |
| Tự động gia hạn | `[ ] Chưa có` | P1 | Cần payment provider + webhook |
| Hoàn tiền | `Bỏ tạm thời` | P2 | Chưa làm giai đoạn đầu |
| Admin tạo/sửa/tạm dừng mã | `[x] Đã có` | P0 | Đã có trang `/admin/discounts` |
| Admin chỉnh giá gói | `[x] Đã có` | P0 | Version bất biến tại `/admin/plans` |
| Admin CRUD Shopee link | `[x] Đã có` | P0 | Kho link và emergency toggle tại `/admin/affiliate` |
| Theo dõi impression/click affiliate | `[x] Đã có` | P1 | Thống kê idempotent; không tự chuyển hướng người dùng |

### Trạng thái P0 phía user sau nghiệm thu 10/08/2026

- [x] Pricing và checkout dùng catalog giá động, `planVersionId` và chặn bán phía server.
- [x] Entitlement/catalog dùng provider chung; tự refresh khi focus, tab visible, sau redeem và mỗi 30 giây khi tab đang hiển thị.
- [x] Account hiển thị nguồn gói, chu kỳ, hạn dùng, quyền lợi và nút refresh.
- [x] CinePass dùng quota **3 phim khác nhau/ngày và 5 tập khác nhau trong mỗi phim/ngày**; không dùng giới hạn theo giờ.
- [x] Movie Detail hiển thị quota/reset; Plus và Ultra hiển thị xem không giới hạn.
- [x] Affiliate cadence: CinePass mỗi phiên hợp lệ, Plus phiên 3/6/9…, Ultra không có; Watch Party không chạy affiliate.
- [x] Checkout mã 100% kích hoạt entitlement; mã giảm một phần chỉ báo giá cho tới khi có cổng thanh toán.
- [x] Watch Party resolve lại entitlement khi join, đổi tập, chat, reaction và voice; video hiện tại không bị cắt khi gói hết hạn.
- [ ] Thanh toán mã giảm một phần, order snapshot, webhook và auto-renew.

### Trạng thái Admin phục vụ kiểm thử user

- [x] Users: khóa/mở, thu hồi phiên, cấp/đổi/gia hạn/hủy gói, audit và MFA.
- [x] Plans: version giá bất biến, lịch tương lai, tắt bán, audit và MFA.
- [x] Affiliate: kho link, trọng số, lịch chạy, policy khẩn cấp và thống kê.
- [x] Discount: tạo/cập nhật/tạm dừng dùng `AdminShell`, API chung, lý do bắt buộc, audit pending/succeeded/failed và MFA một lần.

## 5. Phương án giá tháng/năm

### Phương án A — Giá niêm yết ổn định, dùng discount để thử thị trường

| Gói | Tháng | Năm | Tiết kiệm năm |
|---|---:|---:|---:|
| Plus | 39.000đ | 390.000đ | 78.000đ, khoảng 16,7% |
| Ultra | 69.000đ | 690.000đ | 138.000đ, khoảng 16,7% |

Tạo mã khuyến mãi năm 10% sẽ đưa giá thực tế về khoảng 351.000đ và 621.000đ. Đây là phương án an toàn để đo nhu cầu mà không hạ giá niêm yết vĩnh viễn.

### Phương án B — Giá năm rẻ ngay từ đầu

| Gói | Tháng | Năm | Bình quân/tháng | Tiết kiệm năm |
|---|---:|---:|---:|---:|
| Plus | 39.000đ | 350.000đ | 29.167đ | 118.000đ, khoảng 25,2% |
| Ultra | 69.000đ | 620.000đ | 51.667đ | 208.000đ, khoảng 25,1% |

Khuyến nghị ban đầu: dùng **Phương án A + discount năm** trong 30–60 ngày đầu. Nếu tỷ lệ mua năm thấp, chuyển sang Phương án B bằng cấu hình admin.

## 6. Yêu cầu trang Admin Gói & Giá

Trang dự kiến: `/admin/plans`.

- [x] Chỉnh giá tháng Plus/Ultra.
- [x] Chỉnh giá năm Plus/Ultra.
- [x] Hiển thị số tiền tiết kiệm và phần trăm tự động.
- [x] Bật/tắt bán từng gói.
- [x] Đặt thời điểm áp dụng giá mới.
- [x] Xem bản xem trước trên trang pricing và checkout.
- [x] Xác nhận hai bước trước khi lưu.
- [x] Ghi audit log người thay đổi, thời gian, giá cũ và giá mới.
- [ ] Giá đã tạo trong đơn hàng không bị thay đổi ngược.
- [x] Người đã mua giữ entitlement đến hết chu kỳ hiện tại.

> Cấu hình nên lưu ở `monetization/plans`, không ghi cứng trong component. Mỗi đơn hàng phải lưu snapshot giá tại thời điểm tạo đơn.

## 7. Lộ trình đề xuất

### Giai đoạn P0 — Có thể bán và đo lường

- [x] Tách giá gói khỏi code, tạo `/admin/plans`.
- [x] Hoàn thiện Shopee Affiliate CRUD.
- [x] Hoàn thiện quảng cáo/CTA theo gói.
- [ ] Kết nối SePay QR và webhook xác nhận.
- [ ] Cho checkout mã giảm một phần tạo đơn thật.
- [x] Kiểm thử hết hạn/hủy gói và quay về CinePass ở thao tác kế tiếp mà không cắt video hiện tại.

### Giai đoạn P1 — Tạo lý do nâng Plus/Ultra

- [ ] Cho CinePass tham gia phòng và chat giới hạn.
- [ ] Co-host, kick/ban và quản lý phòng.
- [ ] Danh sách phim chung và bình chọn.
- [ ] Hạn mức AI theo gói.
- [ ] Chất lượng video và số thiết bị theo gói.
- [ ] Guest Pass cho Ultra.
- [ ] Đo chuyển đổi: miễn phí → Plus → Ultra.

### Giai đoạn P2 — Tính năng cao cấp

- [ ] Video chat.
- [ ] Đặt lịch phòng.
- [ ] AI quiz/tóm tắt trong phòng.
- [ ] Theme và khung avatar (badge thành viên cơ bản đã hoàn thiện).
- [ ] Tự động gia hạn và quản lý thanh toán định kỳ.

## 8. Chỉ số cần theo dõi trước khi quyết định thêm/bỏ

- Tỷ lệ người xem quay lại sau 1 ngày và 7 ngày.
- Số người chạm giới hạn CinePass nhưng không nâng gói.
- Tỷ lệ checkout bắt đầu → thanh toán thành công.
- Tỷ lệ Plus → Ultra.
- Số phòng được tạo mỗi ngày và số người/phòng.
- Chi phí voice/AI trung bình trên mỗi tài khoản Ultra.
- Doanh thu subscription so với doanh thu affiliate.
- Tỷ lệ người dùng rời web sau khi gặp quảng cáo.

## 9. Nhật ký quyết định

| Ngày | Quyết định | Lý do | Người cập nhật |
|---|---|---|---|
| 02/08/2026 | Giữ ID nội bộ `normal/premium/ultra` | Tránh hỏng dữ liệu entitlement cũ | Admin |
| 02/08/2026 | Chưa triển khai hoàn tiền | Ngoài phạm vi giai đoạn đầu | Admin |
| 02/08/2026 | Ưu tiên giá động, affiliate và thanh toán QR | Đây là nền tảng doanh thu đầu tiên | Admin |

## 10. Ghi chú thay đổi

Thêm các dòng mới ở đầu bảng này sau mỗi lần cập nhật:

| Ngày | Thay đổi | Trạng thái sau thay đổi | Ghi chú |
|---|---|---|---|
| 11/08/2026 | Audit trước production và thêm huy hiệu thành viên | `[x]` Code và test tự động đạt | Tài khoản cũ không có entitlement mặc định là CinePass; badge CinePass/Plus/Ultra hiển thị theo entitlement server |
| 10/08/2026 | Hoàn thiện Monetization P0 phía user | `[x]` Code và test tự động đạt | Giá động, entitlement sync, quota UI/server, affiliate cadence/visibility, checkout mã 100%, Watch Party refresh quyền |

## 11. Checklist nghiệm thu ba gói — 10/08/2026

- [x] Test tự động web: `40/40` đạt (gồm huy hiệu CinePass/Plus/Ultra).
- [x] Test Watch Party server: `29/29` đạt.
- [x] Production build hoàn tất.
- [x] `check:tokens` đạt.
- [x] Firebase Rules emulator: `3/3` đạt, client không đọc/ghi được toàn bộ `monetization`.
- [x] CinePass: quota 3 phim/5 tập, xem lại không tăng, affiliate mỗi phiên khi có inventory.
- [x] Plus: không quota, affiliate đúng cadence 3/6/9.
- [x] Ultra: không quota, không affiliate.
- [x] Countdown dừng khi tab ẩn; impression chỉ ghi một lần khi đủ 50% visibility.
- [x] Catalog current/future/cancelled/fallback và fallback tạm không bán có test.
- [x] Entitlement cancelled/expired quay về CinePass; Watch Party khóa quyền ở thao tác kế tiếp.
- [~] Test thủ công end-to-end với ba tài khoản Firebase và link Shopee production vẫn cần chạy trên dữ liệu thật trước khi bật policy production.
- [ ] Orders, snapshot đơn hàng, webhook, thanh toán một phần và auto-renew chưa triển khai.
- [ ] Admin nội dung, cộng đồng và cấu hình chưa triển khai.
