
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Save, Loader2, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useFirestore } from "@/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'

export default function NewSupplierPage() {
  const router = useRouter()
  const { toast } = useToast()
  const db = useFirestore()
  const [loading, setLoading] = useState(false)
  
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")

  const handleSave = async () => {
    if (!db) return
    if (!name) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى إدخال اسم المورد",
      })
      return
    }

    setLoading(true)
    const supplierData = {
      name,
      phone,
      balance: 0,
      createdAt: serverTimestamp(),
    }

    addDoc(collection(db, "suppliers"), supplierData)
      .then(() => {
        toast({
          title: "تم بنجاح",
          description: "تمت إضافة المورد بنجاح",
        })
        router.back()
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: 'suppliers',
          operation: 'create',
          requestResourceData: supplierData,
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
        <h1 className="text-lg font-bold">إضافة مورد جديد</h1>
        <div className="w-6" />
      </header>

      <main className="p-4 space-y-6">
        <Card className="border-none shadow-xl rounded-[1.5rem] overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-md font-bold text-primary flex items-center gap-2">
              <User className="w-5 h-5" />
              بيانات المورد
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="supplier-name" className="text-sm font-bold">اسم المورد <span className="text-destructive">*</span></Label>
              <Input 
                id="supplier-name"
                placeholder="مثال: شركة الأسماك الطازجة" 
                className="h-12 rounded-xl"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier-phone" className="text-sm font-bold">رقم الهاتف</Label>
              <Input 
                id="supplier-phone"
                type="tel"
                placeholder="777 000 000" 
                className="h-12 rounded-xl text-left"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <Button 
            className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg gap-2" 
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
            حفظ المورد
          </Button>
          <Button 
            variant="ghost" 
            className="w-full h-12 rounded-xl text-muted-foreground font-bold"
            onClick={() => router.back()}
          >
            إلغاء
          </Button>
        </div>
      </main>
    </div>
  )
}
