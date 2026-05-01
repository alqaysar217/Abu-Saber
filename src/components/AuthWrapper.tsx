
"use client"

import { useEffect, useState } from "react"
import { useAuth, useUser } from "@/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { SplashScreen } from "./auth/SplashScreen"
import { LoginPage } from "./auth/LoginPage"

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const { user, isUserLoading } = useUser()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || isUserLoading) {
    return <SplashScreen />
  }

  if (!user) {
    return <LoginPage />
  }

  return <>{children}</>
}
