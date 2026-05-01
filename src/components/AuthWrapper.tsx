
"use client"

import { useEffect, useState } from "react"
import { useUser } from "@/firebase"
import { SplashScreen } from "./auth/SplashScreen"
import { LoginPage } from "./auth/LoginPage"

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser()
  const [mounted, setMounted] = useState(false)

  // نستخدم mounted لضمان عدم حدوث تعارض Hydration بين الخادم والمتصفح
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="min-h-screen bg-background" />
  }

  // إذا كان النظام لا يزال يتحقق من حالة المستخدم، نعرض شاشة الترحيب
  if (isUserLoading) {
    return <SplashScreen />
  }

  // إذا لم يكن هناك مستخدم مسجل، نعرض صفحة تسجيل الدخول
  if (!user) {
    return <LoginPage />
  }

  // إذا كان المستخدم مسجلاً، نعرض محتوى التطبيق
  return (
    <div className="relative flex min-h-screen flex-col">
      {children}
    </div>
  )
}
