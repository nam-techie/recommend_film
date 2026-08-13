# CineMind — Bảng chức năng và lộ trình kiếm tiền

> Tài liệu theo dõi nghiệp vụ. Cập nhật sau mỗi công đoạn; có thể đổi trạng thái, chỉnh quyền lợi hoặc xoá tính năng nếu không còn phù hợp.
>
> Cập nhật lần cuối: 12/08/2026

## 1. Quy ước trạng thái

- `[x] Đã có`: Đã có trong code và có thể kiểm thử.
- `[~] Một phần`: Có giao diện hoặc nền tảng, nhưng chưa hoàn chỉnh/chưa giới hạn theo gói.
- `[ ] Chưa có`: Chưa triển khai.
- `[?] Cần quyết định`: Chưa chốt nghiệp vụ trước khi code.
- `[ ] DESIGN_LOCKED / NOT_IMPLEMENTED`: Nghiệp vụ đã chốt nhưng chưa có code hoặc chưa được bật vận hành.
- `Bỏ`: Không triển khai hoặc loại khỏi phạm vi.

### Mức độ sẵn sàng vận hành

Một tính năng chỉ được gọi là production-ready khi đi qua đủ bốn lớp độc lập:

1. `CODE_IMPLEMENTED`: Đã có code trong working tree/nhánh được quản lý.
2. `AUTOMATED_VERIFIED`: Đã qua test, typecheck và build tại một commit/build xác định.
3. `PROVIDER_UAT_VERIFIED`: Đã thử nghiệm end-to-end với dịch vụ bên thứ ba liên quan.
4. `PRODUCTION_READY`: Đã cấu hình, deploy, giám sát và xác minh trên môi trường thật.

Không suy ra production-ready chỉ từ việc test hoặc build thành công.

Mức ưu tiên: `P0` = cần làm trước để vận hành/thu tiền; `P1` = tăng chuyển đổi/giữ chân; `P2` = tính năng cao cấp làm sau khi có dữ liệu.

## 2. Ba gói tài khoản hiện tại

| Gói hiển thị | ID nội bộ | Giá tháng hiện tại | Giá năm hiện tại | Quyền đang áp dụng |
|---|---|---:|---:|---|
| CinePass | `normal` | 0đ | 0đ | 3 phim khác nhau/ngày; 5 tập trong mỗi phim/ngày; tham gia phòng ở chế độ xem |
| CinePass Plus | `premium` | 39.000đ | 390.000đ | Xem không giới hạn; tạo phòng bằng link; tối đa 8 người; chat/reaction |
| CinePass Ultra | `ultra` | 69.000đ | 690.000đ | Mọi quyền Plus; phòng công khai/link/mật khẩu; tối đa 50 người; voice |

ID nội bộ không đổi để không làm hỏng entitlement và mã giảm giá cũ.

> Định hướng gói ngày 12/08/2026: Plus vẫn giữ giá catalog để người dùng có thể mua bình thường; đồng thời nghiên cứu chương trình cấp Plus 1 năm không cần thanh toán. Ultra giữ nguyên mô hình trả phí và quyền hiện tại.
>
> Owner đã quyết định pilot Star GitHub đổi Plus 1 năm và chấp nhận rủi ro chính sách bên thứ ba. Thiết kế bắt buộc có kill switch, manual review giai đoạn đầu, webhook/reconciliation và grant ledger tách khỏi payment; xem Mục 4.

> Giá trong bảng là snapshot tham khảo theo tài liệu ngày 12/08/2026, không phải nguồn sự thật lúc chạy. Pricing, checkout và order phải đọc version catalog đang có hiệu lực; admin có thể thay đổi giá mà không sửa tài liệu này.

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
| Mood/genre rule-based discovery | Có bản chung | Có | Có | `[~] Một phần` | P1 | Ánh xạ tâm trạng sang thể loại; chưa cá nhân hóa theo hành vi account |
| AI cá nhân hóa theo account | Fallback chung | Có | Có nâng cao | `[~] Một phần` | P1 | Đã có baseline content-based: cửa sổ 180 ngày, ngưỡng 3 phim/60 phút, genre affinity, reason code, exploration 20%, opt-out/reset; còn thiếu explicit signals, funnel đầy đủ, scoring version và consent rõ ràng |
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
| Thanh toán mã giảm một phần | `CODE_IMPLEMENTED / LIVE_BLOCKED_BANK_LINK` | P0 | Order snapshot, reserve, SePay/VNPAY và IPN đã có code; UAT/live tạm dừng do liên kết bank/provider |
| GitHub Star đổi Plus 1 năm | `[~] CODE_IMPLEMENTED / FEATURE_FLAGGED / UAT_PENDING` | P1 | Pilot 500 claim hoặc 90 ngày; 50 claim đầu admin duyệt; username + ảnh là đầu vào, webhook/reconciliation repo là bằng chứng vận hành; Unstar có grace 7 ngày |
| Entitlement grant theo nguồn | `[~] CODE_IMPLEMENTED / SHADOW_MODE / WRITER_MIGRATION_PENDING` | P0 | Phải có trước Star pilot: payment/discount/github_star/admin là các grant riêng, thu hồi đúng grant và không ghi đè quyền hợp lệ |
| Tự động gia hạn | `[ ] Chưa có` | P1 | Cần payment provider + webhook |
| Hoàn tiền | `[ ] Ngoài hệ thống` | P2 | Chưa có workflow admin/API lưu reason, amount, provider reference và evidence; không được gọi là đã kiểm soát trong app |
| Đối soát settlement/reconciliation | `[ ] Chưa có` | P0 | Chưa có job đối soát provider, phát hiện đơn lệch và workflow xử lý chênh lệch |
| Firebase index cho payment history/orders | `[ ] Chưa deploy đầy đủ` | P0 | Cần index `paymentOrders.createdAt` và `paymentOrdersByUid/$uid/.value`; nếu thiếu, lịch sử đơn hoặc admin orders có thể lỗi 500 |
| Admin tạo/sửa/tạm dừng mã | `[x] Đã có` | P0 | Đã có trang `/admin/discounts` |
| Admin chỉnh giá gói | `[x] Đã có` | P0 | Version bất biến tại `/admin/plans` |
| Admin CRUD Shopee link | `[x] Đã có` | P0 | Kho link và emergency toggle tại `/admin/affiliate` |
| Theo dõi impression/click affiliate | `[x] Đã có` | P1 | Thống kê idempotent; không tự chuyển hướng người dùng |

### Chuyển hướng Plus 1 năm không cần thanh toán

#### Quyết định pilot đã khóa

- `[~] CODE_IMPLEMENTED / FEATURE_FLAGGED / UAT_PENDING` Star repo `nam-techie/recommend_film` để nhận CinePass Plus 1 năm.
- Không yêu cầu OAuth từ user. User đăng nhập CineMind, email verified, nhập GitHub username và gửi ảnh chụp trạng thái Star.
- Ảnh chụp chỉ là evidence hỗ trợ. Trạng thái Star/Unstar vận hành dựa trên repository webhook và reconciliation bằng quyền repo admin/collaborator.
- Owner đã chấp nhận rủi ro chính sách bên thứ ba. Campaign phải có kill switch cho claim mới, auto-approval và grant mới.
- Pilot dừng khi đạt 500 grant được duyệt hoặc 90 ngày, điều kiện nào đến trước. 50 claim đầu luôn cần admin duyệt.

#### Điều kiện và chống lạm dụng

1. Một CineMind UID và một GitHub numeric user ID chỉ nhận một lần trong campaign; không dùng username làm khóa vì username có thể đổi.
2. GitHub account phải là `User`, tối thiểu 30 ngày tuổi. Anonymous CineMind account không được claim.
3. Claim/quota reservation phải atomic, idempotent; pending claim giữ slot tối đa 72 giờ.
4. Nếu username bị claim bởi UID khác hoặc webhook không đủ chứng minh, admin yêu cầu proof bổ sung bằng mã tạm thời trong GitHub bio.
5. Grant có source `github_star`, không tạo payment order, doanh thu hoặc refund record.
6. Đang Plus: grant nối sau hạn Plus. Đang Ultra: grant Plus ở trạng thái scheduled sau Ultra; tuyệt đối không downgrade Ultra.

#### Unstar và reconciliation

- `star.deleted` chuyển claim sang grace 7 ngày và thông báo user.
- Star lại trong grace thì hủy lịch thu hồi. Hết grace chỉ revoke grant `github_star`, không đụng payment/discount/admin grant khác.
- Star lại sau khi revoke chỉ khôi phục phần hạn gốc còn lại; không tạo thêm một năm mới.
- Webhook phải xác minh `X-Hub-Signature-256`, chống replay bằng `X-GitHub-Delivery`, kiểm tra repository ID và sender numeric ID.
- Cron reconciliation chạy hằng ngày để xử lý missed delivery. Auto-approval chỉ được bật thủ công sau 50 claim nếu webhook ổn định 7 ngày, không có double-grant, mismatch <1% và reject/fraud <5%.

Tài liệu kỹ thuật: [GitHub Star webhook](https://docs.github.com/en/webhooks/webhook-events-and-payloads#star), [xác minh webhook](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries), [Starring REST API](https://docs.github.com/en/rest/activity/starring).
### Trạng thái P0 phía user sau nghiệm thu 10/08/2026

- [x] Pricing và checkout dùng catalog giá động, `planVersionId` và chặn bán phía server.
- [x] Entitlement/catalog dùng provider chung; tự refresh khi focus, tab visible, sau redeem và mỗi 30 giây khi tab đang hiển thị.
- [x] Account hiển thị nguồn gói, chu kỳ, hạn dùng, quyền lợi và nút refresh.
- [x] CinePass dùng quota **3 phim khác nhau/ngày và 5 tập khác nhau trong mỗi phim/ngày**; không dùng giới hạn theo giờ.
- [x] Movie Detail hiển thị quota/reset; Plus và Ultra hiển thị xem không giới hạn.
- [x] Affiliate cadence: CinePass mỗi phiên hợp lệ, Plus phiên 3/6/9…, Ultra không có; Watch Party không chạy affiliate.
- [x] Checkout mã 100% kích hoạt trực tiếp; mã giảm một phần tạo order snapshot và chờ IPN provider.
- [x] Watch Party resolve lại entitlement khi join, đổi tập, chat, reaction và voice; video hiện tại không bị cắt khi gói hết hạn.
- [~] Order snapshot, discount một phần, SePay/VNPAY IPN và receipt outbox đã có code; `CODE_IMPLEMENTED / LIVE_BLOCKED_BANK_LINK`, chưa xác nhận provider UAT hay production.

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
- [x] Giá đã tạo trong đơn hàng không bị thay đổi ngược bằng immutable order snapshot.
- [x] Người đã mua giữ entitlement đến hết chu kỳ hiện tại.

> Cấu hình nên lưu ở `monetization/plans`, không ghi cứng trong component. Mỗi đơn hàng phải lưu snapshot giá tại thời điểm tạo đơn.

## 7. Lộ trình đề xuất

### Giai đoạn P0 — Có thể bán và đo lường

- [x] Tách giá gói khỏi code, tạo `/admin/plans`.
- [x] Hoàn thiện Shopee Affiliate CRUD.
- [x] Hoàn thiện quảng cáo/CTA theo gói.
- [~] Có code SePay Payment Gateway `BANK_TRANSFER` và IPN; live tạm dừng do liên kết bank/provider.
- [x] Cho checkout mã giảm một phần tạo order thật, reserve lượt và kích hoạt idempotent.
- [x] Kiểm thử hết hạn/hủy gói và quay về CinePass ở thao tác kế tiếp mà không cắt video hiện tại.

### Giai đoạn P1 — Tạo lý do nâng Plus/Ultra

- [ ] Thiết kế chính sách chat giới hạn cho CinePass; quyền tham gia phòng ở chế độ chỉ xem đã có.
- [ ] Co-host, kick/ban và quản lý phòng.
- [ ] Danh sách phim chung và bình chọn.
- [ ] Hạn mức AI theo gói.
- [ ] Chất lượng video và số thiết bị theo gói.
- [ ] Guest Pass cho Ultra.
- [ ] Đo chuyển đổi: miễn phí → Plus → Ultra.
- [~] Grant ledger, revision, restriction, restore và projection đã có code; còn shadow verification 7 ngày và migration writer discount/payment trước khi bật.
- [~] Star Plus pilot đã có claim/evidence/webhook/reconciliation/manual queue/grace; còn deploy credential, scheduler, UAT và KPI gate trước auto-approval.

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

## 9. Workstream sản phẩm ngoài payment

### Admin Design System & UX refresh

- [~] Đã có admin shell, navigation theo nhóm và primitive dùng chung; còn thiếu persistent shell trong `app/admin/layout.tsx` vì từng page vẫn tự mount `AdminShell`.
- [x] Ở mức code không còn native select/`window.prompt`; User detail dùng Radix Dialog/Select. Còn thiếu nghiệm thu Axe, keyboard-only và screenshot regression toàn bộ admin.
- [x] Dashboard không còn KPI/phim demo; dùng analytics thật và trạng thái real/no-data/provider unavailable. Cần đổi nhãn bảng analytics từ “Phim nổi bật” thành “Được xem nhiều”.
- [x] User detail đã có tab Tổng quan, Hoạt động, Sở thích, Gói, Audit; có preview trước/sau và chỉ tải timeline nhạy cảm khi yêu cầu.

### Content Analytics & Personalization

- [x] Đã tách `watchProgressV2` chỉ dùng resume; analytics vận hành dùng playback session riêng và không backfill số liệu giả.
- [~] Đã có playback session, heartbeat 15 giây, server clock, qualified/completion và rollup ngày/phim/thể loại/account; còn thiếu signed playback grant, tích hợp Watch Party, crash-safe rollup và deploy đủ Firebase index.
- [~] Admin analytics đã có 7/30/90 ngày, qualified view, unique viewer, watch hours, completion, concurrent viewers, online, peak online, top phim/thể loại; còn thiếu previous-period growth, collection start chính xác và drill-down UI đầy đủ.
- [~] Editorial collection đã có provider search/snapshot, draft, schedule, immutable published version, archive, rollback, audit, public projection và homepage fallback; còn thiếu reorder/edit UX, metadata stale/refresh, provider state, xử lý projection tự hết hạn và lifecycle/outage tests.
- [~] Personalization content-based đã có eligibility, 180 ngày, genre affinity, reason code, exploration, opt-out/reset và impression/click; còn thiếu rating/favorite/watchlist/dismiss, qualified/completion event wiring, scoring version/experiment và explicit consent. Chưa dùng LLM.

### Entitlement Integrity & Admin Fraud Controls

- `[~] CODE_IMPLEMENTED / SHADOW_MODE`: đã có `entitlementGrantStates`, grant theo nguồn, append-only event, restriction, revision/idempotent transaction, revoke/restore đúng grant và projection tương thích.
- `[x] Code guard`: admin không thể tự restriction/revoke; paid grant không thể bị action thường xóa; restriction thu hồi Firebase refresh token và yêu cầu Watch Party disconnect.
- `[~] Admin UI`: hiển thị effective plan, từng grant/source, restriction, preview và destructive step-up. Grant mới có thể xếp sau toàn bộ Plus/Ultra hiện có; Star Plus không hạ Ultra.
- `[ ] Chưa production-ready`: cần batch backfill, shadow comparison đủ 7 ngày, explicit schedule downgrade/extend-grant UI và migration writer admin/discount/payment về cùng service. `ENTITLEMENT_GRANTS_V2_ENABLED` mặc định tắt; endpoint legacy chỉ bị khóa khi V2 bật.

### GitHub Star Plus Pilot

- `[~] CODE_IMPLEMENTED / KILL_SWITCHED / UAT_PENDING`: đã có claim UI, username→numeric GitHub ID, evidence WebP private, uniqueness UID/GitHub ID, quota reservation, account age 30 ngày và admin queue.
- `[x] Code path`: webhook HMAC + delivery dedupe, repo ID check, Star/Unstar state, grace 7 ngày, daily reconciliation, revoke/restore đúng grant gốc, notification và campaign controls 500 claim/90 ngày.
- `[x] Manual gate`: 50 claim đầu luôn manual; server không cho bật auto sớm và không cho bật grant khi Entitlement V2 còn shadow mode.
- `[ ] Chưa production-ready`: cần cài webhook/token repo thật, Storage bucket, scheduler, smoke UAT, theo dõi ổn định 7 ngày và gate tự động cho mismatch <1%, fraud/reject <5%. Screenshot không phải bằng chứng duy nhất; claim xung đột vẫn cần proof GitHub bio.
- Plus Star nối sau Plus/Ultra hiện có; không tạo payment order, doanh thu/refund và không downgrade Ultra.

### User Feedback Inbox

- `[~] CODE_IMPLEMENTED / DEPLOY_UAT_PENDING`: có icon cạnh avatar, item trong account/mobile menu, DOM viewport capture, preview/xóa/chụp lại, redaction và fallback text-only.
- `[x] Server path`: authenticated multipart API, 5 feedback/24 giờ, request ID idempotency, server re-encode WebP, Storage private, text-only fallback, user history/status và notification.
- `[x] Admin path`: `/admin/feedback` có filter status/category, priority, private preview, internal note, public reply, revision conflict và audit.
- `[x] Lifecycle code`: xóa ảnh 90 ngày sau đóng, metadata sau 13 tháng; account deletion xóa ảnh/PII và anonymize feedback đã triage.
- `[ ] Chưa production-ready`: cần cấu hình bucket, deploy Database/Storage rules, scheduler retention và UAT capture trên video/CORS/mobile Safari; assignee/date filter còn cần hoàn thiện.
- Chỉ member email verified; trang login/checkout/payment/admin/Account Security mặc định text-only.
### Community

- [x] Social foundation lõi đã chuyển review/reply/like/follow/report qua server API; profile, friend và activity đã có.
- [~] Đã có `/community` với feed trending/following và khám phá người cùng gu; còn thiếu not-interested, public Watch Party announcement và hoàn thiện thao tác like/reply/follow ngay trong feed.
- [~] Đã có moderation queue hide/restore/remove/dismiss và audit; chưa có `publicCommunity` projection thật, raw review/reply vẫn có thể public-read, block chưa áp dụng xuyên feed/reply/notification, report chưa snapshot evidence.
- [ ] Admin content/config cho community.

### Privacy, RBAC và vòng đời dữ liệu

- [~] Đã có permission `content.manage`, `analytics.read`, `analytics.read_sensitive`, `community.moderate`, `support.manage`, `super_admin`; sensitive timeline yêu cầu permission, step-up, reason và audit.
- [~] Account deletion đã dọn account session, playback session, user features và marker gắn UID; còn thiếu endpoint “xóa lịch sử xem” riêng, reset toàn bộ recommendation events và verification trên rules đã deploy.
- [ ] Chưa có UI gán role/permission đầy đủ; compatibility path `admin:true` vẫn nhận toàn bộ quyền.
- [ ] Cần chặn exact recent-title khỏi public profile, chốt explicit personalization consent và chỉ public-read community projection đã moderation.

### Deployment và data integrity — blocker trước beta/production

- [ ] Bổ sung/deploy Firebase index: analytics `startedAt`, payment order `createdAt`, `paymentOrdersByUid/$uid/.value`; fallback full-scan chỉ dùng tương thích tạm thời.
- [ ] Cấu hình scheduler và `CRON_SECRET` thật cho stale finalize, peak presence, retention và content schedule; repo hiện mới có cron route, chưa có bằng chứng scheduler production.
- [ ] Sửa analytics rollup thành recoverable/idempotent sau process crash; hiện marker hoàn tất có thể được ghi trước các increment rời rạc.
- [ ] Nối playback session với signed one-time watch-access grant; không tin movie/title/genre/source do client tự gửi.
- [ ] Sửa projection content tự loại collection hết `endsAt`, kể cả khi không có scheduled version mới.

## 10. Nhật ký quyết định

| Ngày | Quyết định | Lý do | Người cập nhật |
|---|---|---|---|
| 12/08/2026 | Khóa thiết kế pilot Star GitHub đổi Plus 1 năm | Owner chấp nhận rủi ro chính sách; bắt buộc kill switch, manual review 50 claim đầu, webhook/reconciliation và grace 7 ngày | Admin |
| 12/08/2026 | Chuyển entitlement sang grant theo nguồn trước Star pilot | Cho phép revoke đúng grant gian lận/cấp nhầm mà không phá payment/discount hợp lệ; Ultra không bị downgrade | Admin |
| 02/08/2026 | Giữ ID nội bộ `normal/premium/ultra` | Tránh hỏng dữ liệu entitlement cũ | Admin |
| 02/08/2026 | Chưa triển khai hoàn tiền | Ngoài phạm vi giai đoạn đầu | Admin |
| 02/08/2026 | Ưu tiên giá động, affiliate và thanh toán QR | Đây là nền tảng doanh thu đầu tiên | Admin |
| 12/08/2026 | Tạm dừng payment live, ưu tiên Admin UX | Liên kết bank/provider chưa hoàn tất; không trộn code UI với fulfillment | Admin |
| 12/08/2026 | Tách editorial featured khỏi analytics ranking | Nội dung biên tập và nội dung được xem nhiều phục vụ hai quyết định khác nhau | Admin |

## 11. Ghi chú thay đổi

Thêm các dòng mới ở đầu bảng này sau mỗi lần cập nhật:

| Ngày | Thay đổi | Trạng thái sau thay đổi | Ghi chú |
|---|---|---|---|
| 13/08/2026 | Implement Entitlement V2, Star Plus pilot và Feedback Inbox sau kill switch | Code + unit/type verification; chưa provider/deploy UAT | Không thay đổi SePay/VNPAY/order/IPN/Ultra |
| 12/08/2026 | Khóa Star Plus pilot, Entitlement Integrity và User Feedback Inbox | Thiết kế đã khóa, chưa triển khai | Payment tiếp tục LIVE_BLOCKED_BANK_LINK; không thay đổi provider/order/IPN/Ultra |
| 12/08/2026 | Audit độ sẵn sàng payment, admin UI, content, analytics và community | Roadmap truth được tách theo code/test/UAT/production | Payment live đang blocked bởi bank link; không mở rộng provider trong workstream UI |
| 11/08/2026 | Audit trước production và thêm huy hiệu thành viên | `[x]` Code và test tự động đạt | Tài khoản cũ không có entitlement mặc định là CinePass; badge CinePass/Plus/Ultra hiển thị theo entitlement server |
| 10/08/2026 | Hoàn thiện Monetization P0 phía user | `[x]` Code và test tự động đạt | Giá động, entitlement sync, quota UI/server, affiliate cadence/visibility, checkout mã 100%, Watch Party refresh quyền |

## 12. Bản ghi nghiệm thu ba gói — snapshot ngày 10/08/2026

> Đây là bằng chứng lịch sử tại snapshot/build ngày 10/08/2026, không phải xác nhận cho working tree hoặc production hiện tại. Mỗi lần nghiệm thu mới phải ghi commit/build, ngày và môi trường riêng.

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
- [~] Orders, snapshot, SePay/VNPAY IPN, thanh toán một phần, admin ledger và receipt outbox đã triển khai; refund automation/reconcile job còn thiếu; auto-renew ngoài phạm vi v1.
- [ ] Tại snapshot 10/08/2026, Admin nội dung/cộng đồng chưa triển khai. Đây chỉ là bằng chứng lịch sử; working tree ngày 12/08 đã có triển khai đáng kể nhưng chưa production-ready, xem Mục 9.
