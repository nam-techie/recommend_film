# Cấu hình Cloudinary cho hồ sơ CineMind

Tính năng upload avatar/cover chỉ được bật khi môi trường server có đủ ba biến sau:

```bash
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

- Không đặt các biến này dưới tiền tố `NEXT_PUBLIC_`.
- Local, staging và production dùng credential/asset folder tách riêng nếu có thể.
- Avatar được public delivery; cover dùng authenticated delivery và được proxy qua API cùng domain.
- Khi thiếu credential, người dùng vẫn dùng ảnh Google/initials; API upload trả trạng thái unavailable rõ ràng.
- Sau khi cấu hình, kiểm tra upload, replace, reset và xóa account để chắc chắn Cloudinary asset cũ được dọn.
