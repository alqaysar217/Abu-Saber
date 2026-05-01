
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Calendar as CalendarIcon, Save, Loader2, Fuel, Users, Snowflake, Grain, Package, Utensils, MoreHorizontal } from "lucide-react"
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
import { collection, addDoc, serverTimestamp, getDocs, query, where, getFirestore } from "firebase/firestore"

const expenseTypes = [
  { label: "ديزل", icon: Fuel, value: "ديزل" },
  { label: "عمال", icon: Users, value: "عمال" },
  { label: "ثلج", icon: Snowflake, value: "ثلج" },
  { label: "ملح", icon: Grain, value: "ملح" },
  { label: "أكياس", icon: Package, value: "أكياس" },
  { label: "أكل", icon: Utensils, value: "أكل" },
  { label: "أخرى", icon: MoreHorizontal, value: "أخرى" },
]

export default function NewExpensePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [campaigns, setCampaigns] = useState<{id: string, name: string}[]>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(true)

  const [campaignId, setCampaignId] = useState("")
  const [type, setType] = useState("")
  const [amount, setAmount] = useState("")
  const [paymentType, setPaymentType] = useState("نقد")
  const [date, setDate] = useState<Date>(new Date())
  const [notes, setNotes] = useState("")

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const db = getFirestore()
        const q = query(collection(db, "campaigns"), where("status", "==", "open"))
        const querySnapshot = await getDocs(q)
        const fetchedCampaigns = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        }))
        setCampaigns(fetchedCampaigns)
      } catch (error) {
        console.error("Error fetching campaigns:", error)
      } finally {
        setLoadingCampaigns(false)
      }
    }
    fetchCampaigns()
  }, [])

  const handleSave = async () => {
    if (!campaignId || !type || !amount || parseFloat(amount) <= 0) {
      toast({
        variant: "destructive",
        title: "خطأ في الإدخال",
        description: "يرجى اختيار الحملة ونوع المصروف وإدخال مبلغ صحيح",
      })
      return
    }

    setLoading(true)
    try {
      const db = getFirestore()
      await addDoc(collection(db, "expenses"), {
        campaignId,
        type,
        amount: parseFloat(amount),
        paymentType,
        date: date.toISOString(),
        notes,
        createdAt: serverTimestamp(),
      })

      // Logic for debt/cash balance would go here in a full app
      // For now, we just notify the user

      toast({
        title: "تم بنجاح",
        description: "تم حفظ المصروف بنجاح",
      })
      
      router.push("/")
    } catch (error) {
      console.error("Error saving expense:", error)
      toast({
        variant: "destructive",
        title: "حدث خطأ",
        description: "لم نتمكن من حفظ المصروف، حاول مرة أخرى",
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
        <h1 className="text-lg font-bold">إضافة مصروف</h1>
        <div className="w-6" />
      </header>

      <main className="p-4 space-y-6">
        <Card className="border-none shadow-xl rounded-[1.5rem] overflow-hidden">
          <CardHeader className="bg-accent/5 border-b border-accent/10">
            <CardTitle className="text-md font-bold text-accent">تفاصيل المصروف</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-bold">اختيار الحملة <span className="text-destructive">*</span></Label>
              <Select onValueChange={setCampaignId} disabled={loadingCampaigns}>
                <SelectTrigger className="h-12 rounded-xl border-muted-foreground/20">
                  <SelectValue placeholder={loadingCampaigns ? "جاري التحميل..." : "اختر الحملة"} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {campaigns.map((camp) => (
                    <SelectItem key={camp.id} value={camp.id}>{camp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold">نوع المصروف <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-4 gap-2">
                {expenseTypes.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setType(item.value)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all gap-1.5",
                      type === item.value 
                        ? "bg-accent text-white border-accent shadow-md scale-95" 
                        : "bg-white text-muted-foreground border-muted-foreground/10 hover:bg-accent/5"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-[10px] font-bold">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-bold">المبلغ (ر.ي) <span className="text-destructive">*</span></Label>
              <Input 
                id="amount"
                type="number"
                placeholder="0.00" 
                className="h-12 rounded-xl border-muted-foreground/20 focus:ring-accent text-lg font-black tabular-nums"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-bold">طريقة الدفع</Label>
                <Select onValueChange={setPaymentType} defaultValue={paymentType}>
                  <SelectTrigger className="h-12 rounded-xl border-muted-foreground/20">
                    <SelectValue placeholder="اختر الطريقة" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="نقد">نقد</SelectItem>
                    <SelectItem value="دين">دين</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 flex flex-col">
                <Label className="text-sm font-bold">التاريخ</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "h-12 justify-start text-right font-normal rounded-xl border-muted-foreground/20",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {date ? format(date, "PPP", { locale: ar }) : <span>اختر التاريخ</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-xl shadow-2xl" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => d && setDate(d)}
                      initialFocus
                      locale={ar}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-bold">ملاحظات (اختياري)</Label>
              <Textarea 
                id="notes"
                placeholder="تفاصيل إضافية..." 
                className="min-h-[100px] rounded-xl border-muted-foreground/20 resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <Button 
            className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg gap-2 bg-accent hover:bg-accent/90" 
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Save className="w-6 h-6" />
            )}
            حفظ المصروف
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
