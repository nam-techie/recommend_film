# CineMind

Web xem phim tiếng Việt: duyệt phim theo thể loại/quốc gia, xem HLS trực tiếp trong trang,
lưu tiến độ xem, và **xem chung theo phòng** (đồng bộ playback + chat + voice).

> Dữ liệu phim lấy từ [PhimAPI](https://phimapi.com). CineMind không lưu trữ video.

---

## Tính năng thực tế

| Nhóm | Chi tiết |
|---|---|
| Duyệt phim | Trang chủ nhiều rail, phim lẻ / phim bộ / TV shows, theo thể loại, theo quốc gia, mới cập nhật, thịnh hành, đánh giá cao |
| Tìm kiếm | Trang `/search` có bộ lọc + autocomplete trong header |
| Xem phim | Player HLS (hls.js), chọn máy chủ, chọn tập, tự chuyển tập, tắt đèn, chế độ chiếu rạp, toàn màn hình |
| Tiến độ xem | Tự lưu mỗi 10s, khu vực "Xem tiếp" trên trang chủ, trang `/history` |
| Tài khoản | Đăng ký/đăng nhập (email + Google), hồ sơ công khai `/u/[username]`, watchlist, đánh giá, bạn bè, thông báo |
| Xem chung | Phòng `/watch-party/[roomId]`: đồng bộ play/pause/seek qua socket, chat, reaction, voice (LiveKit) |
| Gợi ý theo tâm trạng | `/ai-recommender` — **đang là bản cũ, xem "Việc còn lại" bên dưới** |

## Công nghệ

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** với token layer riêng (xem `app/globals.css` + `tailwind.config.ts`)
- **Firebase** (auth, realtime database), **Supabase** (một phần dữ liệu social)
- **socket.io** — server đồng bộ phòng xem chung nằm ở `socket-server/`
- **LiveKit** — voice trong phòng
- **hls.js** — phát video
- **sharp** — resize ảnh qua route `/api/img`

## Chạy dự án

```bash
npm install
```

Tạo `.env.local`:

```env
# PhimAPI không cần key. Các biến dưới đây là bắt buộc cho auth + xem chung.
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_DATABASE_URL=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000

# Tuỳ chọn
NEXT_PUBLIC_IMAGE_PROXY=self   # 'self' (mặc định) | 'none' (debug, ảnh gốc ~1MB)
```

```bash
npm run dev        # chạy web (3000) + socket-server song song
npm run dev:web    # chỉ chạy web
npm run build
```

Chi tiết cấu hình xem chung: [`WATCH_PARTY_SETUP.md`](./WATCH_PARTY_SETUP.md).

## Cấu trúc

```
app/                 route (App Router) + loading/error/not-found + /api/img
components/
  pages/             component cấp trang (CatalogPage, MovieDetailPage, WatchPartyPage…)
  sections/          khối trang chủ (HeroSection, MovieSection, ContinueWatching)
  ui/                primitive dùng lại (MovieCard, MovieImage, MovieGrid, button…)
  account/ auth/     tài khoản, social, đăng nhập
hooks/               useWatchParty, useWatchProgress, useAccount…
lib/                 api.ts (PhimAPI), firebase, catalog, watch-sync, image-loader
socket-server/       server đồng bộ phòng xem chung
docs/                ghi chú kỹ thuật
```

---

## Quy ước UI (bắt buộc tuân thủ)

Toàn bộ token nằm ở `app/globals.css` (`:root`) và được ánh xạ trong `tailwind.config.ts`.

| Việc cần làm | Dùng | Không dùng |
|---|---|---|
| Màu nhấn | `accent`, `accent-strong`, `accent-soft` | `fuchsia-*`, `purple-*` trực tiếp |
| Chữ | `text-fg`, `text-fg-secondary`, `text-fg-muted` | `text-slate-500/600/700` (fail contrast) |
| Nền | `bg-bg`, `bg-surface-1/2/3` | hex hardcode |
| Trạng thái | `rating` (điểm), `ok`, `warn`, `bad`, `info` | màu tuỳ hứng |
| Bán kính | `rounded-sm/md/lg/xl/full` | `rounded-[1.7rem]` kiểu tuỳ ý |
| Cỡ chữ nhỏ nhất | `text-xs` (12px) | `text-[9px]`, `text-[10px]`, `text-[11px]` |
| Tiêu đề lớn | `.text-display`, `.text-title-1`, `.text-title-2` | chuỗi `text-3xl sm:text-5xl lg:text-6xl` |
| Ảnh phim | `<MovieImage>` | `<Image>` trần (không có fallback khi CDN lỗi) |
| Chiều rộng nội dung | `max-w-shell` | `max-w-[1800px]`, `max-w-[1540px]`… |

**Ảnh:** mọi ảnh remote đi qua `/api/img` (resize + webp + cache vĩnh viễn).
Không bật lại Vercel Image Optimization cho poster — poster gốc là JPEG 2000×3000
và số lượng phim lớn sẽ làm hết quota, khiến toàn site trả 402 và mất sạch poster.

## Việc còn lại (roadmap)

- **Phase 2 — Trang chủ:** giữ rail cuộn ngang ở desktop, Top 10 có số rank lớn, collection theo chủ đề, "Vì bạn đã xem".
- **Phase 3 — Trang chi tiết:** hạ hero xuống ~60svh, đưa danh sách tập lên trên fold, thêm "Phim liên quan" (hiện đang là ngõ cụt), cast có ảnh, breadcrumb.
- **Phase 4 — Xem chung & mobile:** landing giới thiệu tính năng cho khách (hiện đang chặn thẳng bằng form đăng nhập), bottom navigation trên mobile, `Ctrl+K` cho tìm kiếm.
- **Phase 5 — `/ai-recommender`:** trang này còn 100% tiếng Anh, dùng emoji thay icon, và tên "AI" trong khi bên trong chỉ là mapping mood→genre. Cần Việt hoá và đổi tên, hoặc làm AI thật.
- `/watch-party` đang nặng 503 kB first-load JS (LiveKit) — nên tách lazy.

## Liên hệ

<div align="center">
  <a href="mailto:nam.dpwork04@gmail.com"><img src="https://img.shields.io/badge/GMAIL-EA4335?style=for-the-badge&logo=gmail&logoColor=white" alt="Gmail"/></a>
  <a href="https://www.linkedin.com/in/nam-phương-4a3503309"><img src="https://img.shields.io/badge/LINKEDIN-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/></a>
  <a href="https://github.com/nam-techie"><img src="https://img.shields.io/badge/GITHUB-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/></a>
</div>
