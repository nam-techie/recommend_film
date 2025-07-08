import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from '@/components/theme-provider'
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
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
    viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="vi" suppressHydrationWarning className="dark">
            <body
                className={`antialiased font-inter min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col`}
            >
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem={false}
                    disableTransitionOnChange
                    forcedTheme="dark"
                >
                    <Navbar />
                    <main className="container mx-auto px-4 py-6 sm:py-8 flex-1 overflow-visible">
                        {children}
                    </main>
                    <Footer />
                </ThemeProvider>
            </body>
        </html>
    );
}