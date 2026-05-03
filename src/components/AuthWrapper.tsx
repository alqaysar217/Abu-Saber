"use client"

import { useEffect, useState } from "react"
import { useUser } from "@/firebase"
import { SplashScreen } from "./auth/SplashScreen"
import { LoginPage } from "./auth/LoginPage"

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="min-h-screen bg-slate-50" />
  }

  // أولاً: شاشة التحميل أثناء التحقق من المستخدم
  if (isUserLoading) {
    return <SplashScreen />
  }

  // ثانياً: إذا لم يكن مسجلاً، يظهر تسجيل الدخول حصراً
  if (!user) {
    return <LoginPage />
  }

  // ثالثاً: الدخول للتطبيق
  return (
    <div className="relative flex min-h-screen flex-col">
      {children}
    </div>
  )
}