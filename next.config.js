// next.config.js
/** @type {import('next').NextConfig} */

// Chiến lược ảnh — xem app/api/img/route.ts để biết lý do đầy đủ.
//
// Tóm tắt: poster gốc phimimg.com là JPEG 2000×3000 (~1MB) cho ô 186px.
// Phục vụ thẳng thì trang chủ tải ~110MB; đi qua Vercel Image Optimization thì
// hết quota và trả 402 (toàn site mất poster — đúng lỗi đang có trên production).
// Vì vậy dùng loader riêng trỏ về /api/img: resize một lần, CDN cache vĩnh viễn,
// không tiêu quota, chạy được cả trên Vercel lẫn Docker tự host.
const nextConfig = {
  output: 'standalone',
  images: {
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
    // Danh sách width mà loader được phép yêu cầu (khớp ALLOWED_WIDTHS trong route).
    // Bỏ 2048/3840: không có lý do gì để xin ảnh 3840px cho một card 190px —
    // đó chính là thứ đã đốt hết quota trước đây.
    deviceSizes: [640, 828, 1080, 1280, 1600, 1920],
    imageSizes: [128, 192, 256, 384],
    remotePatterns: [
      { protocol: 'https', hostname: 'phimimg.com' },
      { protocol: 'https', hostname: 'img.ophim.live' },
      { protocol: 'https', hostname: 'media.themoviedb.org' }
    ]
  }
};
module.exports = nextConfig;
