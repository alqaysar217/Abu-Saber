
"use client"

import { useState } from "react"
import { useAuth } from "@/firebase"
import { signInWithEmailAndPassword } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone, Lock, LogIn, Loader2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function LoginPage() {
  const auth = useAuth()
  const { toast } = useToast()
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth) return
    if (!phone || !password) {
      setError("يرجى إدخال رقم الهاتف وكلمة السر")
      return
    }

    setLoading(true)
    setError("")

    // Firebase password auth expects email format for simplicity in this demo
    const email = `${phone.trim()}@abosaber.com`

    try {
      await signInWithEmailAndPassword(auth, email, password)
      toast({ title: "مرحباً بك مجدداً", description: "تم تسجيل الدخول بنجاح" })
    } catch (err: any) {
      console.error(err)
      setError("رقم الهاتف أو كلمة السر غير صحيحة")
      toast({ 
        variant: "destructive", 
        title: "خطأ في الدخول", 
        description: "فشل التحقق من البيانات" 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="lux-gradient text-white text-center pb-10 pt-10">
          <CardTitle className="text-2xl font-black">تسجيل الدخول</CardTitle>
          <p className="text-white/60 text-xs mt-1">نظام أبو صابر لإدارة تجارة الأسماك</p>
        </CardHeader>
        <CardContent className="p-8 -mt-6 bg-white rounded-t-[2.5rem] space-y-6">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground mr-1">رقم الهاتف</Label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  type="tel"
                  placeholder="777XXXXXX"
                  className="h-12 rounded-xl pr-10 text-left font-mono focus:ring-primary"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground mr-1">كلمة السر</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  type="password"
                  placeholder="••••••••"
                  className="h-12 rounded-xl pr-10 text-left focus:ring-primary"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg bg-primary hover:bg-primary/90 transition-all active:scale-95 gap-2"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  دخول للنظام
                </>
              )}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">
              بمجرد تسجيل الدخول، فإنك توافق على سياسات الخصوصية الخاصة بالمؤسسة.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
