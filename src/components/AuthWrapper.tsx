
"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/firebase"
import { signInAnonymously, onAuthStateChanged } from "firebase/auth"
import { Loader2 } from "lucide-react"

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    if (!auth) return

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch((err) => {
          console.error("Anonymous sign-in failed:", err)
          setIsInitializing(false)
        })
      } else {
        setIsInitializing(false)
      }
    })

    return () => unsubscribe()
  }, [auth])

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm font-bold text-muted-foreground">جاري تجهيز النظام...</p>
      </div>
    )
  }

  return <>{children}</>
}
