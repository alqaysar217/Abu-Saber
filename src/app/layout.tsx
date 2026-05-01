import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from "@/firebase/client-provider"
import { AuthWrapper } from "@/components/AuthWrapper"
import './globals.css'
import { Metadata, Viewport } from "next"

export const metadata: Metadata = {
  title: "أبو صابر - لتجارة الأسماك",
  description: "نظام إدارة تجارة الأسماك",
};

export const viewport: Viewport = {
  themeColor: "#123524",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-body antialiased bg-background min-h-screen" suppressHydrationWarning>
        <FirebaseClientProvider>
          <AuthWrapper>
            <div className="min-h-screen">
              {children}
            </div>
            <Toaster />
          </AuthWrapper>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
