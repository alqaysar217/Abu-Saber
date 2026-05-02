
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Save, Loader2, User, Phone, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser } from "@/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'

export default function NewCustomerPage() {
  const router = useRouter()
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")

  const handleSave = async () => {
    if (!db || !user) return
    if (!name) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى إدخال اسم العميل",
      })
      return
    }

    setLoading(true)
    const customerData = {
      name,
      phone,
      userId: user.uid,
      createdAt: serverTimestamp(),
    }

    addDoc(collection(db, "users", user.uid, "customers"), customerData)
      .then(() => {
        toast({
          title: "تم بنجاح",
          description: "تمت إضافة العميل بنجاح",
        })
        router.back()
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: `users/${user.uid}/customers`,
          operation: 'create',
          requestResourceData: customerData,
        })
        errorEmitter.emit('permission-error', permissionError)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-10">
      <header className="p-4 flex items-center justify-between border-b bg-white sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 -mr-2">
          <ChevronLeft className="w-6 h-6 rotate-180" />
        </button>
        <h1 className="text-lg font-bold">إضافة عميل جديد</h1>
        <div className="w-6" />
      </header>

      <main className="p-4 space-y-6">
        <Card className="border-none shadow-xl rounded-[1.5rem] overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-md font-bold text-primary flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              بيانات العميل (المشتري)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="customer-name" className="text-sm font-bold flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                اسم العميل <span className="text-destructive">*</span>
              </Label>
              <Input 
                id="customer-name"
                placeholder="مثال: مطعم النور" 
                className="h-12 rounded-xl focus:ring-primary border-muted-foreground/20"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-phone" className="text-sm font-bold flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                رقم الهاتف
              </Label>
              <Input 
                id="customer-phone"
                type="tel"
                placeholder="777 000 000" 
                className="h-12 rounded-xl text-left font-mono focus:ring-primary border-muted-foreground/20"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <Button 
            className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg gap-2 lux-gradient" 
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
            حفظ العميل
          </Button>
          <Button 
            variant="ghost" 
            className="w-full h-12 rounded-xl text-muted-foreground font-bold"
            onClick={() => router.back()}
            disabled={loading}
          >
            إلغاء
          </Button>
        </div>
      </main>
    </div>
  )
}
