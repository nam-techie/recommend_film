import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from '@/components/theme-provider'
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
    title: "CineMind",
    description: "Cinema + Mind - Choose movies based on your mood",
    icons: {
        icon: '/favicon.ico',
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={`antialiased font-poppins min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col`}
            >
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <Navbar />
                    <main className="container mx-auto px-4 py-8 flex-1">
                        {children}
                    </main>
                    <Footer />
                </ThemeProvider>
            </body>
        </html>
    );
}