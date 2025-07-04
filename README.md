# CineMind - Cinema + Mind

## 📖 Mô tả dự án

**CineMind** là một ứng dụng web được xây dựng bằng Next.js giúp người dùng tìm kiếm và gợi ý phim dựa trên tâm trạng hiện tại hoặc thể loại phim yêu thích. Tên "CineMind" được tạo thành từ **Cinema** (Rạp chiếu phim) + **Mind** (Tâm trí), thể hiện ý tưởng kết nối giữa trạng thái tâm lý của người xem với việc lựa chọn phim phù hợp.

Ứng dụng sử dụng API của The Movie Database (TMDB) để lấy dữ liệu phim và cung cấp giao diện người dùng thân thiện với thiết kế hiện đại.

## 🎯 Chức năng chính

### 1. Gợi Ý phim theo tâm trạng
- **😊 Happy** → Phim Hài (Comedy)
- **😢 Sad** → Phim Tâm lý (Drama)  
- **🤩 Excited** → Phim Hành động (Action)
- **😌 Relaxed** → Phim Tình cảm (Romance)
- **😨 Scared** → Phim Kinh dị (Horror)

### 2. Tìm kiếm theo thể loại
- Adventure (Phiêu lưu)
- Action (Hành động)
- Comedy (Hài)
- Drama (Tâm lý)
- Horror (Kinh dị)
- Romance (Tình cảm)
- Science Fiction (Khoa học viễn tưởng)

### 3. Tính năng hiển thị phim
- Hiển thị poster phim với chất lượng cao
- Thông tin chi tiết: tên phim, năm phát hành, đánh giá
- Modal xem thông tin chi tiết phim
- Phân trang với 12 phim mỗi trang
- Responsive design cho mobile và desktop

### 4. Giao diện người dùng
- Dark/Light theme với next-themes
- UI components từ Radix UI
- Styling với Tailwind CSS
- Icons từ Lucide React
- Giao diện responsive với hiệu ứng mượt mà

## 🛠️ Công nghệ sử dụng

### Frontend
- **Next.js 14** - React framework với App Router
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling framework
- **Radix UI** - Accessible UI components
- **Lucide React** - Icon library

### Authentication & Theming
- **Clerk** - Authentication service
- **next-themes** - Theme management

### API
- **The Movie Database (TMDB) API** - Dữ liệu phim

## 📁 Cấu trúc dự án

```
cinemind/
├── app/                    # Next.js App Router
│   ├── [id]/              # Dynamic route cho chi tiết phim
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout với providers
│   └── page.tsx           # Trang chủ
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── movie-mood-recommender.tsx  # Component chính
│   ├── Navbar.tsx        # Navigation bar
│   ├── Footer.tsx        # Footer với thông tin liên hệ
│   └── theme-provider.tsx # Theme provider
├── lib/                  # Utility functions
├── public/               # Static assets
└── middleware.ts         # Next.js middleware
```

## 🚀 Cách chạy dự án

### Yêu cầu hệ thống
- Node.js 18+ hoặc Bun
- API key từ The Movie Database (TMDB)

### Bước 1: Clone dự án
```bash
git clone <repository-url>
cd cinemind
```

### Bước 2: Cài đặt dependencies
```bash
# Sử dụng npm
npm install

# Hoặc sử dụng yarn
yarn install

# Hoặc sử dụng pnpm
pnpm install

# Hoặc sử dụng bun
bun install
```

**⚠️ Nếu gặp lỗi dependency conflict, thử các cách sau:**

```bash
# Cách 1: Xóa hoàn toàn và cài lại (Khuyến nghị)
rm -rf node_modules package-lock.json
npm install

# Cách 2: Sử dụng --legacy-peer-deps
npm install --legacy-peer-deps

# Cách 3: Sử dụng --force
npm install --force

# Cách 4: Sử dụng yarn thay vì npm
yarn install
```

### Bước 3: Cấu hình environment variables
Tạo file `.env.local` trong thư mục gốc:
```env
NEXT_PUBLIC_MOVIE_API_KEY=your_tmdb_api_key_here
```

**Lấy API key TMDB:**
1. Đăng ký tài khoản tại [themoviedb.org](https://www.themoviedb.org)
2. Vào Settings → API
3. Tạo API key mới
4. Copy API key vào file `.env.local`

### Bước 4: Chạy dự án
```bash
# Development mode với Turbopack
npm run dev

# Hoặc
yarn dev
pnpm dev
bun dev
```

### Bước 5: Mở trình duyệt
Truy cập [http://localhost:3000](http://localhost:3000) để xem ứng dụng

**📝 Lưu ý về Port:**
- Mặc định Next.js chạy trên **port 3000**
- Nếu port 3000 đã được sử dụng, Next.js sẽ tự động chuyển sang port tiếp theo (3001, 3002, ...)
- Bạn có thể thay đổi port bằng cách:
  ```bash
  # Cách 1: Sử dụng environment variable
  PORT=5000 npm run dev
  
  # Cách 2: Sử dụng flag
  npm run dev -- -p 5000
  
  # Cách 3: Chỉnh sửa package.json
  "dev": "next dev --turbopack -p 5000"
  ```

## 📝 Scripts có sẵn

```bash
npm run dev      # Chạy development server với Turbopack
npm run build    # Build dự án cho production
npm run start    # Chạy production server
npm run lint     # Kiểm tra code với ESLint
```

## 🔧 Cấu hình bổ sung

### Authentication (Clerk)
Dự án đã tích hợp Clerk cho authentication. Để sử dụng:
1. Tạo tài khoản tại [clerk.com](https://clerk.com)
2. Tạo ứng dụng mới
3. Thêm environment variables:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
CLERK_SECRET_KEY=your_secret_key
```

### Customization
- Thay đổi thể loại phim: Chỉnh sửa `GENRES` array trong `movie-mood-recommender.tsx`
- Thay đổi mapping tâm trạng: Chỉnh sửa `MOOD_TO_GENRE` object
- Thay đổi số phim mỗi trang: Chỉnh sửa `MOVIES_PER_PAGE` constant

## 🎨 UI Components

Dự án sử dụng các UI components từ thư viện Radix UI:
- **Button** - Nút tương tác
- **Card** - Hiển thị thông tin phim
- **Dialog** - Modal xem chi tiết
- **Select** - Dropdown chọn tâm trạng/thể loại
- **Label** - Nhãn form
- **Pagination** - Phân trang

## 📱 Responsive Design

Ứng dụng được thiết kế responsive:
- **Mobile**: 1 cột phim
- **Tablet**: 2 cột phim  
- **Desktop**: 3-4 cột phim

## 🔒 Bảo mật

- API key được lưu trong environment variables
- Không expose sensitive data ra client-side
- Sử dụng HTTPS cho production

## 🚀 Deployment

### Vercel (Khuyến nghị)
1. Push code lên GitHub
2. Kết nối repository với Vercel
3. Thêm environment variables trong Vercel dashboard
4. Deploy tự động

### Các platform khác
- Netlify
- Railway
- Heroku
- AWS Amplify

## 💡 Ý tưởng đằng sau tên "CineMind"

**CineMind** = **Cinema** + **Mind**

- **Cinema** (Rạp chiếu phim): Đại diện cho thế giới điện ảnh, nơi lưu giữ hàng ngàn bộ phim với đa dạng thể loại và cảm xúc
- **Mind** (Tâm trí): Đại diện cho trạng thái tâm lý, cảm xúc và tâm trạng của người xem

Sự kết hợp này thể hiện triết lý của ứng dụng: **"Kết nối tâm trạng với điện ảnh"** - giúp người dùng tìm ra những bộ phim phù hợp nhất với trạng thái cảm xúc hiện tại của họ, tạo ra trải nghiệm xem phim tối ưu và ý nghĩa.

## 🤝 Đóng góp

1. Fork dự án
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## 📄 License

Dự án này được phát hành dưới MIT License.

## 📞 Liên hệ

Nếu có câu hỏi hoặc góp ý, vui lòng liên hệ qua:

<div align="center">
  <a href="mailto:nam.dpwork04@gmail.com">
    <img src="https://img.shields.io/badge/GMAIL-EA4335?style=for-the-badge&logo=gmail&logoColor=white" alt="Gmail"/>
  </a>
  <a href="https://www.linkedin.com/in/nam-phương-4a3503309">
    <img src="https://img.shields.io/badge/LINKEDIN-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/>
  </a>
  <a href="https://github.com/nam-techie">
    <img src="https://img.shields.io/badge/GITHUB-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/>
  </a>
  <a href="https://discordapp.com/users/995694235946844261">
    <img src="https://img.shields.io/badge/DISCORD-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord"/>
  </a>
  <a href="https://www.instagram.com/pwanm.ie">
    <img src="https://img.shields.io/badge/INSTAGRAM-E4405F?style=for-the-badge&logo=instagram&logoColor=white" alt="Instagram"/>
  </a>
</div>

---

**CineMind** - *Where your mood meets the perfect movie* 🎬✨