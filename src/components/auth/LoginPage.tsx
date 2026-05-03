"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/firebase"
import { signInWithEmailAndPassword } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone, Lock, LogIn, Loader2, AlertCircle, ShieldCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function LoginPage() {
  const auth = useAuth()
  const { toast } = useToast()
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

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

    // تنظيف رقم الهاتف من أي مسافات أو رموز
    const cleanPhone = phone.trim().replace(/\s/g, "")
    // تحويل الرقم إلى تنسيق الإيميل المستخدم في النظام
    const email = `${cleanPhone}@abosaber.com`

    try {
      await signInWithEmailAndPassword(auth, email, password)
      toast({ title: "مرحباً بك مجدداً", description: "تم تسجيل الدخول بنجاح" })
      localStorage.setItem("last_phone", cleanPhone)
    } catch (err: any) {
      console.error("Login Error Details:", err.code, err.message)
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
        setError("بيانات الدخول غير صحيحة. تأكد من الرقم وكلمة السر، أو تواصل مع الإدارة لتفعيل حسابك.")
      } else if (err.code === 'auth/too-many-requests') {
        setError("تم حظر الدخول مؤقتاً بسبب محاولات كثيرة خاطئة. حاول مرة أخرى لاحقاً.")
      } else {
        setError("حدث خطأ غير متوقع أثناء الدخول. يرجى مراجعة الاتصال بالإنترنت.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="lux-gradient text-white text-center pb-12 pt-12 relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
          <CardTitle className="text-3xl font-black relative z-10">
            دخول النظام
          </CardTitle>
          <div className="flex items-center justify-center gap-1.5 mt-2 opacity-80 relative z-10">
            <ShieldCheck className="w-4 h-4" />
            <p className="text-[11px] font-bold uppercase tracking-widest">حصري للمشتركين المعتمدين</p>
          </div>
        </CardHeader>
        <CardContent className="p-8 -mt-8 bg-white rounded-t-[3rem] space-y-6 relative z-20">
          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-top-2 border border-destructive/20 shadow-inner">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="leading-relaxed text-right flex-1" dir="rtl">{error}</p>
            </div>
          )}

          <div className="text-center space-y-1 mb-2">
            <p className="text-sm font-black text-primary">نظام أبو صابر لإدارة الأسماك</p>
            <p className="text-[10px] text-muted-foreground font-bold">أدخل بيانات الاعتماد الخاصة باشتراكك للبدء</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-black text-primary mr-1 block text-right">رقم الهاتف المسجل</Label>
              <div className="relative group">
                <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  type="tel"
                  placeholder="77XXXXXXXX"
                  className="h-14 rounded-2xl pr-12 text-left font-mono text-lg focus:ring-2 focus:ring-primary border-muted-foreground/10 bg-muted/20 shadow-inner"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black text-primary mr-1 block text-right">كلمة السر</Label>
              <div className="relative group">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  type="password"
                  placeholder="••••••••"
                  className="h-14 rounded-2xl pr-12 text-left text-lg focus:ring-2 focus:ring-primary border-muted-foreground/10 bg-muted/20 shadow-inner"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-16 rounded-[1.5rem] text-xl font-black shadow-xl lux-gradient hover:opacity-95 transition-all active:scale-95 gap-3"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-6 h-6" />
                  دخول للنظام
                </>
              )}
            </Button>
          </form>

          <div className="pt-4 border-t border-dashed text-center">
            <p className="text-[10px] text-muted-foreground font-bold leading-relaxed">
              إذا لم يكن لديك حساب أو واجهت مشكلة في الدخول، <br />
              يرجى التواصل مع المطور لتفعيل اشتراكك.
            </p>
            <p className="text-[10px] text-primary font-black mt-2 tabular-nums">واتساب: +967 775258830</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}