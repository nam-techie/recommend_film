import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Jost, Overpass_Mono } from "next/font/google";
import "./globals.css";

// Thân bài: Be Vietnam Pro được thiết kế cho tiếng Việt — dấu không chồng nhau
// ở cỡ 12–14px. Jost (geometric display) trước đây dùng cho toàn bộ body text
// khiến chữ có dấu khó đọc, và tệ hơn: Tailwind trỏ tới tên font 'Jost' chứ không
// phải biến của next/font nên 3 file woff2 tải về không hề được dùng.
const bodyFont = Be_Vietnam_Pro({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

// Chỉ dùng cho h1/h2/h3 và .font-display.
const displayFont = Jost({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
});

const monoFont = Overpass_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-mono",
  display: "swap",
});
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { AppChrome } from '@/components/AppChrome'
import { getNavigationData } from '@/lib/navigation-data'

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
    title: "CineMind - Cinema meets Mind",
    description: "Khám phá bộ phim hoàn hảo dựa trên tâm trạng của bạn. Nơi Cinema meets Mind.",
    keywords: "phim, movie, cinema, entertainment, AI recommendation, mood-based",
    authors: [{ name: "CineMind Team" }],
    icons: {
        icon: '/favicon.ico',
    },
    openGraph: {
        title: "CineMind - Cinema meets Mind",
        description: "Khám phá bộ phim hoàn hảo dựa trên tâm trạng của bạn",
        type: "website",
        locale: "vi_VN",
    },
    twitter: {
        card: "summary_large_image",
        title: "CineMind - Cinema meets Mind",
        description: "Khám phá bộ phim hoàn hảo dựa trên tâm trạng của bạn",
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const navigation = await getNavigationData()
    return (
        <html lang="vi" suppressHydrationWarning className="dark">
            <body
                className={`antialiased ${bodyFont.variable} ${displayFont.variable} ${monoFont.variable} font-sans min-h-screen bg-bg flex flex-col`}
            >
                <AuthProvider><ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem={false}
                    disableTransitionOnChange
                    forcedTheme="dark"
                >
                    <AppChrome genres={navigation.genres} countries={navigation.countries}>{children}</AppChrome>
                </ThemeProvider></AuthProvider>
            </body>
        </html>
    );
}
