
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Save, Loader2, Calendar as CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useFirestore } from "@/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'

export default function NewCampaignPage() {
  const router = useRouter()
  const { toast } = useToast()
  const db = useFirestore()
  const [loading, setLoading] = useState(false)
  
  const [name, setName] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [status, setStatus] = useState("open")
  const [notes, setNotes] = useState("")

  const handleSave = async () => {
    if (!db) return
    if (!name || !startDate) {
      toast({
        variant: "destructive",
        title: "خطأ في الإدخال",
        description: "يرجى ملء الحقول الإجبارية (اسم الحملة وتاريخ البداية)",
      })
      return
    }

    setLoading(true)
    const campaignData = {
      name,
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : null,
      status,
      notes,
      createdAt: serverTimestamp(),
    }

    addDoc(collection(db, "campaigns"), campaignData)
      .then(() => {
        toast({
          title: "تم بنجاح",
          description: "تم إنشاء الحملة بنجاح",
        })
        router.push("/campaigns")
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: 'campaigns',
          operation: 'create',
          requestResourceData: campaignData,
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
        <h1 className="text-lg font-bold">إضافة حملة جديدة</h1>
        <div className="w-6" />
      </header>

      <main className="p-4 space-y-6">
        <Card className="border-none shadow-xl rounded-[1.5rem] overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-md font-bold text-primary">تفاصيل الحملة</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="campaign-name" className="text-sm font-bold">اسم الحملة <span className="text-destructive">*</span></Label>
              <Input 
                id="campaign-name"
                placeholder="مثال: حملة المكلا - عدن" 
                className="h-12 rounded-xl border-muted-foreground/20 focus:ring-primary"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="start-date" className="text-sm font-bold">تاريخ البداية <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input 
                    id="start-date"
                    type="date"
                    className="h-12 rounded-xl border-muted-foreground/20 focus:ring-primary text-right pr-10"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date" className="text-sm font-bold">تاريخ النهاية (اختياري)</Label>
                <div className="relative">
                  <Input 
                    id="end-date"
                    type="date"
                    className="h-12 rounded-xl border-muted-foreground/20 focus:ring-primary text-right pr-10"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                  <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold">حالة الحملة</Label>
              <Select onValueChange={setStatus} defaultValue={status}>
                <SelectTrigger className="h-12 rounded-xl border-muted-foreground/20">
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="open">مفتوحة</SelectItem>
                  <SelectItem value="closed">مغلقة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-bold">وصف الحملة (اختياري)</Label>
              <Textarea 
                id="notes"
                placeholder="ملاحظات إضافية عن الرحلة أو الأهداف..." 
                className="min-h-[120px] rounded-xl border-muted-foreground/20 resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Save className="w-6 h-6" />
            )}
            حفظ الحملة
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
