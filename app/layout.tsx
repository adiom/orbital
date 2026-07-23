import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next"

import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { FeedbackWidget } from "@/components/feedback-widget";

export const metadata: Metadata = {
  title: "Orbital",
  description: "Orbital is where conversations become knowledge.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="antialiased">
        <Toaster position="top-center" />
        <SessionProvider>
          {children}
          <FeedbackWidget />
        </SessionProvider>
        <Analytics/>
      </body>
    </html>
  );
}
