
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Save, 
  Loader2, 
  User, 
  Phone, 
  Lock, 
  Camera, 
  CheckCircle2,
  ShieldCheck,
  Image as ImageIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { updatePassword } from "firebase/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  const [saving, setSaving] = useState(false)

  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "users", user.uid, "profile", "data")
  }, [db, user])

  const { data: profile, isLoading: loadingProfile } = useDoc(profileRef)

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [photoBase64, setPhotoBase64] = useState("")

  useEffect(() => {
    // تعبئة البيانات من الملف الشخصي في قاعدة البيانات
    if (profile) {
      setName(profile.name || "")
      setPhotoBase64(profile.photoBase64 || "")
      if (profile.phone) {
        setPhone(profile.phone)
      } else if (user?.email) {
        // إذا لم يوجد رقم هاتف في البروفايل، نستخرجه من الإيميل الافتراضي (الرقم@abosaber.com)
        const extracted = user.email.split('@')[0]
        if (/^\d+$/.test(extracted)) {
          setPhone(extracted)
        }
      }
    } else if (user) {
      // إذا كان البروفايل جديداً تماماً، نأخذ الرقم من الحساب المسجل فوراً
      if (user.email) {
        const extracted = user.email.split('@')[0]
        if (/^\d+$/.test(extracted)) {
          setPhone(extracted)
        }
      }
    }
  }, [profile, user])

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotoBase64(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!db || !user || !profileRef) return
    
    setSaving(true)
    
    try {
      // 1. Update Firestore profile
      await setDoc(profileRef, {
        name,
        phone,
        photoBase64,
        updatedAt: serverTimestamp()
      }, { merge: true })

      // 2. Update Auth Password if provided
      if (newPassword && newPassword.length >= 6) {
        try {
          await updatePassword(user, newPassword)
          toast({ title: "تم تحديث كلمة السر والبيانات" })
        } catch (e) {
          toast({ 
            variant: "destructive", 
            title: "فشل تحديث كلمة السر", 
            description: "يجب تسجيل الدخول مرة أخرى للقيام بهذا الإجراء لأسباب أمنية" 
          })
        }
      } else {
        toast({ title: "تم حفظ البيانات بنجاح" })
      }

      router.back()
    } catch (error) {
      toast({ variant: "destructive", title: "حدث خطأ أثناء الحفظ" })
    } finally {
      setSaving(false)
    }
  }

  if (loadingProfile) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-primary" /></div>
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-10">
      <header className="p-4 flex items-center justify-between border-b bg-white sticky top-0 z-10 shadow-sm">
        <button onClick={() => router.back()} className="p-2 -mr-2">
          <ChevronLeft className="w-6 h-6 rotate-180" />
        </button>
        <h1 className="text-lg font-bold">الملف الشخصي</h1>
        <div className="w-6" />
      </header>

      <main className="p-4 space-y-6">
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="relative">
            <Avatar className="w-32 h-32 border-4 border-white shadow-2xl">
              <AvatarImage src={photoBase64} />
              <AvatarFallback className="bg-primary/10 text-primary text-3xl font-black">
                {name?.substring(0, 1) || "أ"}
              </AvatarFallback>
            </Avatar>
            <label 
              htmlFor="photo-upload" 
              className="absolute bottom-0 right-0 p-3 bg-primary text-white rounded-2xl shadow-lg border-4 border-white cursor-pointer active:scale-90 transition-transform"
            >
              <Camera className="w-5 h-5" />
            </label>
            <input 
              id="photo-upload" 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handlePhotoUpload}
            />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black text-primary">{name || "صاحب الحساب"}</h2>
            <p className="text-xs text-muted-foreground font-bold">{user?.email || "مستخدم مسجل"}</p>
          </div>
        </div>

        <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-muted/30 p-5 border-b">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              بيانات الحساب الأساسية
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-black mr-1 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-primary" /> الاسم الكامل
              </Label>
              <Input 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="h-12 rounded-xl border-muted-foreground/20"
                placeholder="أدخل اسمك الجديد..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black mr-1 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-primary" /> رقم الهاتف المسجل
              </Label>
              <Input 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                className="h-12 rounded-xl border-muted-foreground/20 text-left font-mono"
                placeholder="777XXXXXX"
                dir="ltr"
              />
              <p className="text-[9px] text-muted-foreground font-bold px-1 italic">هذا هو الرقم الذي تستخدمه لتسجيل الدخول.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black mr-1 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-primary" /> تغيير كلمة السر
              </Label>
              <Input 
                type="password"
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                className="h-12 rounded-xl border-muted-foreground/20 text-left"
                placeholder="أدخل كلمة سر جديدة إذا أردت التغيير"
              />
              <p className="text-[9px] text-muted-foreground font-bold px-1 italic">يجب أن تكون 6 خانات على الأقل. اتركها فارغة للحفاظ على الحالية.</p>
            </div>
          </CardContent>
        </Card>

        <Button 
          className="w-full h-14 rounded-2xl text-lg font-black lux-gradient shadow-xl gap-2" 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
          حفظ التعديلات
        </Button>
      </main>
    </div>
  )
}
