import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next"

import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { FeedbackWidget } from "@/components/feedback-widget";

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
