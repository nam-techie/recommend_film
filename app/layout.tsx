import type { Metadata, Viewport } from "next";
import { Jost, Overpass_Mono } from "next/font/google";
import "./globals.css";

const jost = Jost({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jost",
  display: "swap",
});

const overpassMono = Overpass_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-overpass-mono",
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
                className={`antialiased ${jost.variable} ${overpassMono.variable} font-sans min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col`}
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
