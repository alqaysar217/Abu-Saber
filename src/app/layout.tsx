
"use client"

import { useEffect, useState } from "react"
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from "@/firebase/client-provider"
import { useAuth } from "@/firebase"
import { initiateAnonymousSignIn } from "@/firebase/non-blocking-login"
import './globals.css'

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (auth) {
      if (!auth.currentUser) {
        initiateAnonymousSignIn(auth)
      }
      setIsReady(true)
    }
  }, [auth])

  // ننتظر قليلاً للتأكد من جاهزية خدمات فيربيز قبل عرض المحتوى
  if (!isReady) return null

  return <>{children}</>
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#123524" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <title>أبو صابر - لتجارة الأسماك</title>
      </head>
      <body className="font-body antialiased bg-background min-h-screen flex flex-col">
        <FirebaseClientProvider>
          <AuthInitializer>
            <main className="flex-1 pb-20">
              {children}
            </main>
            <Toaster />
          </AuthInitializer>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
