import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "吃喝玩乐日记 🎉",
  description: "记录每一顿美食和每一次游玩",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={nunito.variable}>
      <body className={`${nunito.className} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
