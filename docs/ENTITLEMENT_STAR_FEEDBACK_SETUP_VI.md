# Thiết lập Entitlement V2, GitHub Star Plus và Feedback Inbox

Tài liệu này chỉ dành cho ba tính năng non-payment. Không thay đổi SePay, VNPAY, order, IPN hoặc fulfillment hiện có.

## 1. Entitlement Grants V2

Mặc định V2 chạy ở `shadow mode`: đọc entitlement hiện tại, tạo legacy grant và so sánh projection nhưng không ghi đè `monetization/entitlements`.

- Để bật writer V2: `ENTITLEMENT_GRANTS_V2_ENABLED=true`.
- Chỉ bật sau tối thiểu 7 ngày shadow comparison và sau khi admin, discount, payment fulfillment đều ghi qua cùng entitlement service.
- Khi V2 bật, endpoint admin entitlement legacy trả `410`; admin phải dùng grant ledger.
- Restriction gian lận thu hồi Firebase refresh token và gọi internal Watch Party disconnect. Cần giữ `WATCH_PARTY_INTERNAL_URL` và `WATCH_PARTY_ADMIN_SECRET` đúng như môi trường hiện tại.

## 2. GitHub Star Plus pilot

Biến môi trường server-only:

- `GITHUB_STAR_REPO_OWNER=nam-techie`
- `GITHUB_STAR_REPO_NAME=recommend_film`
- `GITHUB_STAR_REPOSITORY_ID=<numeric repo id>`
- `GITHUB_STAR_WEBHOOK_SECRET=<random secret>`
- `GITHUB_STARGAZERS_TOKEN=<fine-grained token của repo admin/collaborator>`
- `CRON_SECRET=<shared scheduler secret>`

GitHub webhook gửi sự kiện `star` tới `/api/webhooks/github/star`. Scheduler gọi `/api/cron/github-star-maintenance` mỗi ngày với `Authorization: Bearer <CRON_SECRET>`.

Campaign mặc định tắt. Trình tự bật an toàn:

1. Bật Entitlement V2 sau shadow verification.
2. Mở nhận claim, vẫn giữ kill switch cấp grant tắt khi smoke test webhook.
3. Bật cấp grant và duyệt thủ công 50 claim đầu.
4. Chỉ bật tự động sau ít nhất 7 ngày reconciliation ổn định và đạt KPI đã khóa.

## 3. Feedback Inbox

Firebase Admin cần bucket private:

- `FIREBASE_STORAGE_BUCKET=<project-id>.appspot.com` hoặc bucket tương ứng.
- Deploy cả `firebase-database.rules.json` và `firebase-storage.rules`.
- Client bị deny toàn bộ Storage; ảnh chỉ đọc qua API có Firebase bearer token và permission phù hợp.

Scheduler gọi `/api/cron/feedback-maintenance` mỗi ngày để xóa ảnh 90 ngày sau khi đóng và metadata sau 13 tháng. Nếu Storage chưa cấu hình, feedback text vẫn được nhận nhưng không có ảnh.

## 4. Smoke test bắt buộc

- Claim trùng UID/GitHub ID, webhook signature sai/replay, Unstar/Re-star và grace 7 ngày.
- Admin không thể tự restriction/revoke; payment grant không thể bị revoke bởi action thường.
- Feedback text-only khi capture/Storage lỗi, ảnh private, revision conflict, rate limit 5/24 giờ.
- Kiểm tra cron bằng môi trường staging trước production; route tồn tại không đồng nghĩa scheduler đã được cấu hình.
