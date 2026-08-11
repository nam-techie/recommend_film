# Thiết lập Admin và dịch vụ bên thứ ba

Tài liệu này chia rõ phần **cần ngay để mở dashboard** và phần **chỉ dùng ở giai đoạn thanh toán/Affiliate sau này**. Không đưa khóa bí mật hoặc mật khẩu thật vào Git.

## 1. Cần ngay: mở Admin Dashboard local

### Bước 1 — Tạo tài khoản Firebase

1. Vào Firebase Console → Authentication → Sign-in method và bật Email/Password.
2. Tạo hoặc đăng ký một tài khoản quản trị.
3. Vào Authentication → Users, sao chép `User UID` của tài khoản đó.

Dashboard không dùng username/mật khẩu hardcode. Form `/admin` đăng nhập bằng email Firebase, sau đó API server xác minh ID token và kiểm tra UID hoặc custom claim.

### Bước 2 — Cấu hình `.env`

Giữ các biến `NEXT_PUBLIC_FIREBASE_*` hiện có và bổ sung:

```dotenv
# Một UID hoặc nhiều UID cách nhau bằng dấu phẩy. Với yêu cầu hiện tại chỉ nhập 1 UID.
ADMIN_FIREBASE_UIDS=FIREBASE_UID_CUA_ADMIN

# Firebase Admin SDK — lấy từ Firebase Console → Project settings
# → Service accounts → Generate new private key.
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app

# Nếu socket server chạy local:
WATCH_PARTY_INTERNAL_URL=http://localhost:4001
WATCH_PARTY_INTERNAL_ADMIN_SECRET=thay-bang-chuoi-ngau-nhien-dai
```

Có thể dùng một biến JSON thay cho ba biến service account:

```dotenv
FIREBASE_SERVICE_ACCOUNT_JSON={"project_id":"...","client_email":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n..."}
```

Chỉ chọn **một** trong hai cách. Không đặt `FIREBASE_PRIVATE_KEY` hay JSON service account trong biến bắt đầu bằng `NEXT_PUBLIC_`.

### Bước 3 — Chạy và kiểm tra

```powershell
npm.cmd run dev
```

Mở [http://localhost:3000/admin](http://localhost:3000/admin), đăng nhập bằng email/mật khẩu Firebase đã tạo.

- Sai UID và không có claim `admin: true`: API trả `403`.
- Thiếu hoặc token hết hạn: API trả `401`.
- Có quyền Admin nhưng service account chưa đọc được Realtime Database: vẫn vào được dashboard, phần Firebase Database mang trạng thái “Cần kiểm tra”.

### Tùy chọn — dùng custom claim thay UID allowlist

Firebase khuyến nghị đặt quyền bằng Admin SDK và vẫn xác minh ID token ở backend. Chạy thao tác cấp claim trong một môi trường server tin cậy, không tạo endpoint công khai để tự cấp quyền:

```js
await getAuth().setCustomUserClaims('FIREBASE_UID_CUA_ADMIN', { admin: true })
```

Sau khi đặt claim, đăng xuất/đăng nhập lại hoặc force-refresh ID token. Tham khảo [Firebase Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims) và [Verify ID Tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens).

## 2. Bật Google Authenticator (TOTP) cho Admin

CineMind dùng TOTP MFA gốc của Firebase Authentication. Mã có 6 số, đổi theo chu kỳ khoảng 30 giây và dùng được với Google Authenticator, Microsoft Authenticator, 1Password cùng các ứng dụng tương thích TOTP.

### Bước 1 — Bật Identity Platform và TOTP

1. Trong Firebase Console, mở **Authentication** và nâng cấp project sang **Firebase Authentication with Identity Platform** nếu project chưa nâng cấp. Kiểm tra lại chính sách billing/quota của project trước khi xác nhận.
2. Mở phần **Multi-factor authentication** và bật **TOTP**.
3. Giữ số khoảng thời gian lân cận được chấp nhận (`adjacentIntervals`) ở mức `1`, trừ khi có lý do vận hành cụ thể. Mức này cho phép lệch đồng hồ nhỏ mà không mở cửa sổ mã quá rộng.
4. Trong **Authentication → Users**, bảo đảm email admin có trạng thái đã xác minh. Firebase không cho đăng ký TOTP cho email chưa xác minh.

Trong CineMind đã có script thực hiện cấu hình này. Chạy từ thư mục project:

```powershell
npm.cmd run auth:enable-totp
```

Script đọc Firebase service account từ `.env`, chỉ bật TOTP với `adjacentIntervals: 1` và không in secret ra terminal. Sau khi terminal báo thành công, mở `/admin/security` để quét QR.

Nếu cần cấu hình thủ công bằng Admin SDK trong môi trường server tin cậy, logic script tương đương mẫu sau:

```ts
await getAuth().projectConfigManager().updateProjectConfig({
  multiFactorConfig: {
    state: 'ENABLED',
    providerConfigs: [{
      state: 'ENABLED',
      totpProviderConfig: { adjacentIntervals: 1 },
    }],
  },
})
```

Không đặt đoạn cấu hình này vào endpoint công khai và không chạy tự động mỗi khi deploy.

### Bước 2 — Quét QR

1. Đăng nhập tài khoản admin tại `/admin`.
2. Mở `/admin/security` hoặc chọn **Bảo mật** trong sidebar.
3. Xác thực lại bằng mật khẩu/Google.
4. Mở Google Authenticator → dấu **+** → **Quét mã QR**.
5. Quét QR CineMind, nhập mã 6 số đầu tiên và nhấn **Hoàn tất thiết lập**.
6. Đăng xuất rồi đăng nhập lại để kiểm tra màn nhập mã thứ hai.

Sau khi bật, các thao tác khóa user, thu hồi phiên, đổi entitlement, phát hành/hủy giá và thay đổi Affiliate dùng luồng step-up:

- Admin đăng nhập lại trên một Firebase Auth phụ chỉ lưu trong bộ nhớ.
- Firebase yêu cầu mã TOTP và phát ID token có claim second factor.
- Server chỉ chấp nhận MFA vừa diễn ra tối đa 120 giây, sau đó phát vé ngẫu nhiên hết hạn sau 60 giây.
- Vé được băm trước khi lưu, gắn với UID admin + loại thao tác + target + hash payload, và chỉ tiêu thụ một lần.

Không có email OTP trong V1. Email phù hợp cho cảnh báo/audit, nhưng không thay thế mã TOTP vì hộp thư thường dùng cùng phiên trình duyệt. Nên chuẩn bị một admin **break-glass** riêng, bảo vệ bằng TOTP khác và chỉ dùng khi mất thiết bị chính. V1 không có nút gỡ TOTP trong giao diện để tránh tự khóa tài khoản.

## 3. Kiểm thử mã giảm giá và nâng gói

1. Mở `http://localhost:3000/admin/discounts` bằng tài khoản admin.
2. Tạo mã, chọn CinePass Plus hoặc CinePass Ultra, thời hạn 1 tháng/1 năm, mức giảm `100%` và tổng lượt dùng.
3. Nếu chỉ tặng một người, dán Firebase UID của họ vào ô chỉ định; để trống nếu ai có mã cũng được dùng.
4. Đăng nhập tài khoản user, mở `http://localhost:3000/pricing`, chọn đúng gói và chu kỳ đã cấu hình.
5. Tại `/checkout`, nhập mã, nhấn **Áp dụng**, rồi **Kích hoạt miễn phí**.
6. Mở `/account` để xem gói hiện tại và ngày hết hạn. Một user không thể dùng lại cùng mã.

Mã giảm dưới 100% chỉ tính và hiển thị số tiền còn lại; hệ thống không nâng gói cho đến khi có cổng thanh toán xác nhận phía server.

Ma trận quyền hiện tại:

- **CinePass:** 3 phim khác nhau/ngày, 5 tập trong mỗi phim/ngày; được tham gia phòng ở chế độ xem, không tạo phòng, chat, reaction hoặc voice.
- **CinePass Plus:** xem không giới hạn; tạo phòng bằng link tối đa 8 người; chat và reaction; không có voice.
- **CinePass Ultra:** toàn bộ quyền Plus; phòng công khai/link/mật khẩu tối đa 50 người; voice chat.

Sau khi sửa quyền socket server, cần khởi động lại cả Next.js và `socket-server`. Nếu UI đã đổi nhưng tài khoản CinePass vẫn tạo được phòng thì socket server đang chạy bản cũ.

## 4. Shopee Affiliate — triển khai sau khi duyệt dashboard

1. Đăng ký và xác nhận website/app là Affiliate Media trong chương trình Shopee Affiliate.
2. Chỉ nhập URL Affiliate được tạo từ tài khoản của chủ website.
3. Mỗi link cần tên chiến dịch, trọng số, ngày bắt đầu, ngày hết hạn và trạng thái.
4. Link hết hạn được chuyển sang lưu trữ, không xóa để giữ thống kê.
5. Chỉ mở Shopee sau khi người dùng nhấn nút rõ ràng như “Xem ưu đãi trên Shopee”. Không tự chuyển trang, tự mở tab, giả nút phát phim hoặc tạo click không chủ ý.
6. Hiển thị ghi chú “Liên kết tiếp thị — CineMind có thể nhận hoa hồng”.

Đối chiếu điều khoản hiện hành trước khi bật production tại [Shopee Affiliate Program](https://shopee.vn/affiliate/chuong-trinh-ppp/).

## 5. QR ngân hàng + SePay — ưu tiên cho MVP thanh toán

Phương án đề xuất là tài khoản TPBank nhận tiền, QR có số tiền và nội dung chuyển khoản duy nhất theo đơn hàng, SePay gửi webhook khi có giao dịch vào.

Luồng dự kiến:

1. Server tạo `orderId`, số tiền sau discount và mã nội dung duy nhất.
2. Checkout hiển thị VietQR/QR động.
3. User chuyển khoản đúng nội dung.
4. SePay gọi `POST /api/payments/sepay/webhook`.
5. Server xác minh chữ ký HMAC, chống xử lý trùng theo transaction ID, khớp đúng số tiền/nội dung rồi mới kích hoạt entitlement.
6. Client polling trạng thái đơn hoặc nhận cập nhật realtime.

Thiết lập SePay:

- Tạo tài khoản và liên kết tài khoản ngân hàng được hỗ trợ.
- Tạo webhook chỉ nhận giao dịch vào (`In_only`).
- Dùng `HMAC_SHA256`; lưu secret ở server, ví dụ `SEPAY_WEBHOOK_SECRET`.
- Webhook production phải là HTTPS công khai. Local có thể dùng tunnel chỉ để test.
- Luôn trả `2xx` sau khi giao dịch đã được ghi idempotent.

SePay có thông báo giao dịch thời gian thực và cơ chế retry; xem [SePay Webhooks](https://developer.sepay.vn/vi/sepay-webhooks) và [Webhooks API](https://developer.sepay.vn/en/sepay-oauth2/api-webhook).

Nếu chỉ tải một ảnh QR tĩnh lên web, hệ thống **không thể tự biết đã nhận tiền** nếu không có webhook/API ngân hàng. Khi đó cần màn admin duyệt thủ công và user gửi mã giao dịch.

TPBank Biz Connex có nhóm dịch vụ Biz QR và thông báo biến động số dư, nhưng cần đăng ký/duyệt với ngân hàng. Có thể xem [tổng hợp sản phẩm Biz Connex của TPBank](https://tpb.vn/wps/wcm/connect/b36cf8fc-3c5b-4e80-8ca5-6ccbc3a6e515/T%E1%BB%95ng%2Bh%E1%BB%A3p%2Bs%E1%BA%A3n%2Bph%E1%BA%A9m%2Bc%E1%BB%A7a%2BBiz%2BConnex_052025.pdf?CVID=pAT5XfT&MOD=AJPERES) và hỏi TPBank về điều kiện merchant hiện tại.

## 6. VNPAY — phương án cổng thanh toán sau MVP

Biến môi trường dự kiến:

```dotenv
VNPAY_TMN_CODE=placeholder
VNPAY_HASH_SECRET=placeholder
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://your-domain.example/checkout/result
VNPAY_IPN_URL=https://your-domain.example/api/payments/vnpay/ipn
```

- `Return URL` chỉ phục vụ hiển thị kết quả cho user.
- `IPN URL` là nguồn sự thật để server cập nhật đơn và phải có HTTPS.
- Xác minh `vnp_SecureHash`, mã đơn, số tiền và trạng thái trước khi nâng gói.
- Xử lý IPN idempotent; tuyệt đối không tin query từ trình duyệt.

Tham khảo [VNPAY Payment](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html) và [FAQ về Return URL/IPN](https://sandbox.vnpayment.vn/apis/docs/faqs/).

## 7. MoMo Subscription — tự động gia hạn ở giai đoạn sau

MoMo Subscription hỗ trợ pre-authorization và charge định kỳ, nhưng cần hồ sơ merchant và được MoMo chấp thuận cho sản phẩm này. Không mô phỏng “tự gia hạn” chỉ bằng lịch trong database nếu chưa có token thanh toán hợp lệ.

Biến môi trường dự kiến:

```dotenv
MOMO_PARTNER_CODE=placeholder
MOMO_ACCESS_KEY=placeholder
MOMO_SECRET_KEY=placeholder
MOMO_IPN_URL=https://your-domain.example/api/payments/momo/ipn
MOMO_REDIRECT_URL=https://your-domain.example/checkout/result
```

- Lần đầu user phải đồng ý subscription.
- Mỗi `requestId`/`orderId` phải duy nhất để chống xử lý lặp.
- Chỉ lưu token theo yêu cầu bảo mật của MoMo; không log secret hoặc payload nhạy cảm.
- Nếu charge gia hạn thất bại, giữ trạng thái grace period theo nghiệp vụ rồi hạ về CinePass khi entitlement hết hạn.

Xem [MoMo Subscription](https://developers.momo.vn/v3/docs/payment/api/wallet/subscription/).

## 8. Checklist trước production

- [ ] `/admin` trả `403` cho tài khoản Firebase thường.
- [ ] Chỉ một UID/claim admin được cấp quyền.
- [ ] Identity Platform + TOTP đã bật; email admin đã xác minh.
- [ ] `/admin/security` đăng ký QR thành công và đăng nhập lại bắt buộc mã 6 số.
- [ ] Mutation nhạy cảm từ chối request thiếu `X-Admin-Approval`, vé hết hạn, vé đã dùng hoặc payload khác.
- [ ] Có tài khoản break-glass với authenticator độc lập và quy trình khôi phục được lưu offline.
- [ ] Service account không nằm trong Git, log hoặc response API.
- [ ] Firebase Database Rules không cho client đọc vùng monetization/admin.
- [ ] Webhook có chữ ký, HTTPS, rate limit và idempotency key.
- [ ] Số tiền và mã đơn được kiểm tra ở server trước khi nâng gói.
- [ ] Không nâng gói từ Return URL hoặc trạng thái do client gửi lên.
- [ ] Có log audit cho thay đổi gói, discount và thanh toán.
- [ ] Link Affiliate chỉ mở sau click chủ động và có nhãn tiếp thị liên kết.
- [ ] Tách sandbox/production keys và chạy giao dịch nhỏ để nghiệm thu.
