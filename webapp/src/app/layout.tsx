import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/session-provider";

export const metadata: Metadata = {
  title: "起業サーチDM営業サービス",
  description:
    "新設法人を毎日自動検索し、商圏データレポート付きのDMを全自動で発送。士業・専門サービスのための新規開拓ツール。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700&family=Noto+Serif+JP:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
