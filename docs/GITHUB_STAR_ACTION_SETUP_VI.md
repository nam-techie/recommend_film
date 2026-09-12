# Nút GitHub và thẻ chia sẻ — kiểm tra local

## Star trực tiếp (không liên quan Plus hoặc payment)

Menu mới bỏ iframe bên thứ ba và mở thao tác trong tab riêng để không ngắt phim.
Nếu chưa cấu hình, nút Star mở repository; người dùng đăng nhập GitHub rồi bấm Star ở đó.
Không được hiển thị “đã Star” chỉ từ một lượt click trên CineMind.

Muốn GitHub tự ghi Star sau khi người dùng đồng ý:

1. Tạo GitHub App riêng cho thao tác này, quyền tài khoản **Starring: Read and write**, repository **Metadata: Read-only**. Cài App trên repo `nam-techie/recommend_film`.
2. Đăng ký callback URL của môi trường, ví dụ `http://localhost:3000/api/github/star/callback` hoặc `https://cine-mind.namtechie.id.vn/api/github/star/callback`.
3. Cấu hình server-only `GITHUB_STAR_CLIENT_ID`, `GITHUB_STAR_CLIENT_SECRET`, `GITHUB_STAR_CALLBACK_URL`. Không dùng `NEXT_PUBLIC_*`; không đưa secret vào Git.
4. Khởi động lại app. Bấm Star → đăng nhập/chấp thuận quyền GitHub → callback gửi PUT cho repo cố định → chỉ HTTP 204 mới hiện thành công.

Luồng dùng signed state, PKCE, cookie HttpOnly 10 phút, kiểm tra Origin khi bắt đầu; token chỉ ở server trong request và không lưu vào Firebase, localStorage hay log. Không tự thay đổi membership/claim Plus. Bấm lại không tạo thêm Star (PUT idempotent).

UAT cần kiểm tra: tài khoản chưa đăng nhập, đã đăng nhập, từ chối quyền, state hết hạn/sai, thiếu permission, đã Star trước đó và GitHub lỗi. Không dùng unit test để tuyên bố đã UAT GitHub thật.

Tham khảo chính thức: [GitHub App user authorization](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app), [Starring REST API](https://docs.github.com/en/rest/activity/starring).

## Thẻ chia sẻ

- Preview và PNG dùng chung SVG; ảnh xuất 1080×1350 hoặc 1080×1920.
- Avatar góc/bên phải/ngẫu nhiên có seed chung; đổi lựa chọn không làm ảnh tải về nhảy sang bố cục khác.
- Ba poster lấy từ danh sách Yêu thích; folder hỗ trợ hover, chạm và Enter/Space.
- Số phim/tập là tích lũy từ hồ sơ; giờ xem ưu tiên analytics trong kỳ, fallback tiến độ nếu chưa có analytics. Nguồn được giải thích trong bảng tùy chỉnh, không đặt ghi chú kỹ thuật lên ảnh.
- Không có URL nằm trên poster; badge gói giữ màu/icon theo entitlement.
- Không tạo PR và không thay đổi provider/payment trong lần chỉnh này.
