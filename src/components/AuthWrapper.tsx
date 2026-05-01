
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

  // المرحلة الأولى: الانتظار حتى يجهز المتصفح تماماً
  if (!mounted) {
    return <div className="min-h-screen bg-background" />
  }

  // المرحلة الثانية: عرض شاشة التحميل أثناء جلب حالة المستخدم
  if (isUserLoading) {
    return <SplashScreen />
  }

  // المرحلة الثالثة: طلب تسجيل الدخول إذا لم يكن المستخدم موجوداً
  if (!user) {
    return <LoginPage />
  }

  // المرحلة الأخيرة: عرض محتوى التطبيق
  return (
    <div className="relative flex min-h-screen flex-col">
      {children}
    </div>
  )
}
