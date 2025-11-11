import { Toaster } from "sonner";

import "./globals.css";
import { SessionProvider } from "next-auth/react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Toaster position="top-center" />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
