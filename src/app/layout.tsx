import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sistem Pengelolaan Data Catering Karyawan | PT Terminal Petikemas Surabaya",
  description: "Sistem Pengelolaan Data Catering Karyawan General Affairs PT Terminal Petikemas Surabaya",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" translate="no" className={inter.className}>
      <body className="min-h-dvh bg-bg text-text antialiased">
        {children}
      </body>
    </html>
  );
}
