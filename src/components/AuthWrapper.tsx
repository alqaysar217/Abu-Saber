"use client"

import { useEffect } from "react"
import { useAuth } from "@/firebase"
import { signInAnonymously } from "firebase/auth"

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const auth = useAuth()

  useEffect(() => {
    if (auth && !auth.currentUser) {
      signInAnonymously(auth).catch(console.error)
    }
  }, [auth])

  return <>{children}</>
}
