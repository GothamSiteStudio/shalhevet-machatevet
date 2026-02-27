import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "שלהבת מחטבת",
  description: "אפליקציית כושר ותזונה מקצועית",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0f0f10",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background font-heebo text-text-primary antialiased">
        {/* Mobile-constrained wrapper */}
        <div className="relative min-h-screen mx-auto max-w-mobile bg-background">
          {/* Page content – padded for bottom nav */}
          <main className="pb-20">{children}</main>

          {/* Fixed bottom navigation */}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
