import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Harf Yılanı — Türkçe Kelime Yılan Oyunu",
  description: "Klasik yılan oyununun Türkçe kelime öğrenme sürümü. Yılanı harflere ulaştır, hedef kelimeyi doğru sırayla tamamla. Godot 4 + Next.js.",
  keywords: ["Harf Yılanı", "kelime oyunu", "yılan", "snake", "Türkçe", "Godot 4", "eğitim"],
  authors: [{ name: "Harf Yılanı" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Harf Yılanı",
    description: "Türkçe kelime öğrenme temelli yılan oyunu",
    siteName: "Harf Yılanı",
    type: "website",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
