
"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/firebase"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone, Lock, LogIn, Loader2, AlertCircle, UserRoundCheck, ShieldCheck, UserPlus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function LoginPage() {
  const auth = useAuth()
  const { toast } = useToast()
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [error, setError] = useState("")
  const [isRegistering, setIsRegistering] = useState(false)

  // تعبئة رقم الهاتف تلقائياً إذا كان مخزناً سابقاً
  useEffect(() => {
    const savedPhone = localStorage.getItem("last_phone")
    if (savedPhone) setPhone(savedPhone)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth) return
    if (!phone || !password) {
      setError("يرجى إدخال رقم الهاتف وكلمة السر")
      return
    }

    setLoading(true)
    setError("")

    // تحويل رقم الهاتف إلى بريد إلكتروني افتراضي للنظام
    const email = `${phone.trim()}@abosaber.com`

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password)
        toast({ title: "تم إنشاء الحساب", description: "أهلاً بك في نظام أبو صابر" })
      } else {
        await signInWithEmailAndPassword(auth, email, password)
        toast({ title: "مرحباً بك مجدداً", description: "تم تسجيل الدخول بنجاح" })
      }
      
      // حفظ الرقم للعبئة التلقائية مستقبلاً
      localStorage.setItem("last_phone", phone.trim())
    } catch (err: any) {
      // تجنب console.error لمنع ظهور نافذة الخطأ البرمجية في NextJS
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError("بيانات الدخول غير صحيحة. تأكد من الرقم وكلمة السر.")
      } else if (err.code === 'auth/user-not-found') {
        setError("هذا الرقم غير مسجل. يمكنك اختيار 'إنشاء حساب جديد'.")
      } else if (err.code === 'auth/email-already-in-use') {
        setError("هذا الرقم مسجل مسبقاً، جرب تسجيل الدخول.")
      } else {
        setError("حدث خطأ في عملية المصادقة. يرجى المحاولة لاحقاً.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGuestLogin = async () => {
    if (!auth) return
    setGuestLoading(true)
    try {
      await signInAnonymously(auth)
      toast({ title: "وضع التجربة", description: "أنت الآن تستخدم جلسة مؤقتة (Guest)" })
    } catch (err) {
      setError("فشل الدخول السريع كضيف")
    } finally {
      setGuestLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="lux-gradient text-white text-center pb-10 pt-10 relative">
          <CardTitle className="text-2xl font-black">
            {isRegistering ? "إنشاء حساب جديد" : "تسجيل الدخول"}
          </CardTitle>
          <div className="flex items-center justify-center gap-1.5 mt-1 opacity-70">
            <ShieldCheck className="w-3 h-3" />
            <p className="text-[10px] font-bold uppercase tracking-wider">نظام إدارة مبيعات الأسماك</p>
          </div>
        </CardHeader>
        <CardContent className="p-8 -mt-6 bg-white rounded-t-[2.5rem] space-y-6">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
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
                  disabled={loading || guestLoading}
                  autoComplete="username"
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
                  disabled={loading || guestLoading}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg bg-primary hover:bg-primary/90 transition-all active:scale-95 gap-2"
              disabled={loading || guestLoading}
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  {isRegistering ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                  {isRegistering ? "تسجيل الحساب" : "دخول للنظام"}
                </>
              )}
            </Button>

            <button 
              type="button"
              onClick={() => { setIsRegistering(!isRegistering); setError(""); }}
              className="w-full text-center text-xs font-bold text-primary hover:underline"
            >
              {isRegistering ? "لديك حساب بالفعل؟ سجل دخولك" : "ليس لديك حساب؟ أنشئ حساباً جديداً"}
            </button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-muted"></span></div>
            <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-white px-2 text-muted-foreground font-bold">أو استمر بدون حساب</span></div>
          </div>

          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full h-12 rounded-xl font-bold border-primary/20 text-primary hover:bg-primary/5 gap-2 transition-all"
              onClick={handleGuestLogin}
              disabled={loading || guestLoading}
            >
              {guestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserRoundCheck className="w-4 h-4" />}
              دخول سريع كـ "ضيف"
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
