
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

  // منع أي رندر على السيرفر لتجنب Hydration errors
  if (!mounted) {
    return <div className="min-h-screen bg-background" />
  }

  if (isUserLoading) {
    return <SplashScreen />
  }

  if (!user) {
    return <LoginPage />
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      {children}
    </div>
  )
}
