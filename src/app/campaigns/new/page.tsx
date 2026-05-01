
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Calendar as CalendarIcon, Save, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
// Note: Assuming firebase initialization is handled in the project structure
// In a real scenario, we'd import db from our firebase config
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { getFirestore } from "firebase/firestore"
import { initializeApp } from "firebase/app"

export default function NewCampaignPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  
  const [name, setName] = useState("")
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [status, setStatus] = useState("open")
  const [notes, setNotes] = useState("")

  const handleSave = async () => {
    if (!name || !startDate) {
      toast({
        variant: "destructive",
        title: "خطأ في الإدخال",
        description: "يرجى ملء الحقول الإجبارية (اسم الحملة وتاريخ البداية)",
      })
      return
    }

    setLoading(true)
    try {
      // Basic firestore logic - in a real app this would use the project's initialized db
      const db = getFirestore()
      await addDoc(collection(db, "campaigns"), {
        name,
        startDate: startDate.toISOString(),
        endDate: endDate ? endDate.toISOString() : null,
        status,
        notes,
        createdAt: serverTimestamp(),
      })

      toast({
        title: "تم بنجاح",
        description: "تم إنشاء الحملة بنجاح",
      })
      
      router.push("/campaigns")
    } catch (error) {
      console.error("Error saving campaign:", error)
      toast({
        variant: "destructive",
        title: "حدث خطأ",
        description: "لم نتمكن من حفظ الحملة، حاول مرة أخرى",
      })
    } finally {
      setLoading(false)
    }
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
              <div className="space-y-2 flex flex-col">
                <Label className="text-sm font-bold">تاريخ البداية <span className="text-destructive">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "h-12 justify-start text-right font-normal rounded-xl border-muted-foreground/20",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP", { locale: ar }) : <span>اختر التاريخ</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-xl shadow-2xl" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      locale={ar}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2 flex flex-col">
                <Label className="text-sm font-bold">تاريخ النهاية (اختياري)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "h-12 justify-start text-right font-normal rounded-xl border-muted-foreground/20",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP", { locale: ar }) : <span>اختر التاريخ</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-xl shadow-2xl" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      locale={ar}
                    />
                  </PopoverContent>
                </Popover>
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
