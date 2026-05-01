
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from "@/firebase/client-provider"
import { AuthWrapper } from "@/components/AuthWrapper"
import './globals.css'
import { Metadata, Viewport } from "next"
import { Cairo } from 'next/font/google'

const cairo = Cairo({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-cairo',
})

export const metadata: Metadata = {
  title: "أبو صابر - لتجارة الأسماك",
  description: "نظام إدارة تجارة الأسماك المتكامل",
};

export const viewport: Viewport = {
  themeColor: "#123524",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${cairo.variable} font-body antialiased bg-background min-h-screen overscroll-none`}>
        <FirebaseClientProvider>
          <AuthWrapper>
            {children}
            <Toaster />
          </AuthWrapper>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
