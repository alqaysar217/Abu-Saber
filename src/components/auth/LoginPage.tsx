
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

    if (phone.length < 9) {
      setError("رقم الهاتف يجب أن يكون 9 أرقام على الأقل")
      return
    }

    setLoading(true)
    setError("")

    const email = `${phone.trim()}@abosaber.com`

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password)
        toast({ title: "تم إنشاء الحساب بنجاح", description: `أهلاً بك في نظام أبو صابر` })
      } else {
        await signInWithEmailAndPassword(auth, email, password)
        toast({ title: "مرحباً بك مجدداً", description: "تم تسجيل الدخول بنجاح" })
      }
      
      localStorage.setItem("last_phone", phone.trim())
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError("بيانات الدخول غير صحيحة. تأكد من الرقم وكلمة السر.")
      } else if (err.code === 'auth/user-not-found') {
        setError("هذا الرقم غير مسجل. يمكنك اختيار 'إنشاء حساب جديد'.")
      } else if (err.code === 'auth/email-already-in-use') {
        setError("هذا الرقم مسجل مسبقاً، جرب تسجيل الدخول.")
      } else if (err.code === 'auth/weak-password') {
        setError("كلمة السر ضعيفة جداً، يرجى اختيار 6 خانات على الأقل.")
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
        <CardHeader className="lux-gradient text-white text-center pb-12 pt-12 relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
          <CardTitle className="text-3xl font-black relative z-10">
            {isRegistering ? "إنشاء حساب جديد" : "دخول النظام"}
          </CardTitle>
          <div className="flex items-center justify-center gap-1.5 mt-2 opacity-80 relative z-10">
            <ShieldCheck className="w-4 h-4" />
            <p className="text-[11px] font-bold uppercase tracking-widest">إدارة مبيعات الأسماك المتكاملة</p>
          </div>
        </CardHeader>
        <CardContent className="p-8 -mt-8 bg-white rounded-t-[3rem] space-y-6 relative z-20">
          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-black text-primary mr-1">رقم الهاتف</Label>
              <div className="relative group">
                <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  type="tel"
                  placeholder="77XXXXXXXX"
                  className="h-14 rounded-2xl pr-12 text-left font-mono text-lg focus:ring-2 focus:ring-primary border-muted-foreground/10 bg-muted/20 shadow-inner"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading || guestLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black text-primary mr-1">كلمة السر</Label>
              <div className="relative group">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  type="password"
                  placeholder="••••••••"
                  className="h-14 rounded-2xl pr-12 text-left text-lg focus:ring-2 focus:ring-primary border-muted-foreground/10 bg-muted/20 shadow-inner"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || guestLoading}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-16 rounded-[1.5rem] text-xl font-black shadow-xl lux-gradient hover:opacity-95 transition-all active:scale-95 gap-3"
              disabled={loading || guestLoading}
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  {isRegistering ? <UserPlus className="w-6 h-6" /> : <LogIn className="w-6 h-6" />}
                  {isRegistering ? "إنشاء حسابي الآن" : "دخول للنظام"}
                </>
              )}
            </Button>

            <button 
              type="button"
              onClick={() => { setIsRegistering(!isRegistering); setError(""); }}
              className="w-full text-center text-sm font-black text-primary py-2 hover:bg-primary/5 rounded-xl transition-colors"
            >
              {isRegistering ? "لديك حساب؟ سجل دخولك" : "ليس لديك حساب؟ سجل رقمك الآن"}
            </button>
          </form>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-muted"></span></div>
            <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-white px-4 text-muted-foreground font-black tracking-widest">أو</span></div>
          </div>

          <Button 
            variant="outline" 
            className="w-full h-14 rounded-2xl font-black border-primary/20 text-primary hover:bg-primary/5 gap-3 transition-all shadow-sm"
            onClick={handleGuestLogin}
            disabled={loading || guestLoading}
          >
            {guestLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserRoundCheck className="w-5 h-5" />}
            تجربة النظام كـ "ضيف"
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
