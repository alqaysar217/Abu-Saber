
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Save, Loader2, Fuel, Users, Snowflake, Waves, Package, Utensils, MoreHorizontal, Calendar as CalendarIcon, LayoutList, Wallet, Car, User, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useUser, useMemoFirebase } from "@/firebase"
import { collection, addDoc, serverTimestamp, query, where } from "firebase/firestore"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import Link from "next/link"

const expenseTypes = [
  { label: "ديزل", icon: Fuel, value: "ديزل" },
  { label: "عمال", icon: Users, value: "عمال" },
  { label: "ثلج", icon: Snowflake, value: "ثلج" },
  { label: "ملح", icon: Waves, value: "ملح" },
  { label: "صيانة", icon: Car, value: "صيانة" },
  { label: "أكياس", icon: Package, value: "أكياس" },
  { label: "أكل", icon: Utensils, value: "أكل" },
  { label: "أخرى", icon: MoreHorizontal, value: "أخرى" },
]

export default function NewExpensePage() {
  const router = useRouter()
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  const [loading, setLoading] = useState(false)

  const campaignsQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(
      collection(db, "users", user.uid, "campaigns"),
      where("status", "==", "open")
    )
  }, [db, user])

  const { data: openCampaigns, isLoading: loadingCampaigns } = useCollection(campaignsQuery)

  const suppliersQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "suppliers"))
  }, [db, user])

  const { data: suppliers } = useCollection(suppliersQuery)

  const [campaignId, setCampaignId] = useState("")
  const [type, setType] = useState("")
  const [amount, setAmount] = useState("")
  const [paymentType, setPaymentType] = useState("نقد")
  const [paidAmount, setPaidAmount] = useState("")
  const [payeeId, setPayeeId] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState("")

  const formatInputNumber = (val: string) => {
    if (!val) return ""
    const parts = val.split('.')
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    return parts.join('.')
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, "")
    if (rawValue === "" || /^\d*\.?\d*$/.test(rawValue)) {
      setAmount(rawValue)
    }
  }

  const handlePaidAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, "")
    if (rawValue === "" || /^\d*\.?\d*$/.test(rawValue)) {
      setPaidAmount(rawValue)
    }
  }

  const numAmount = parseFloat(amount) || 0
  const numPaidAmount = paymentType === "نقد" ? numAmount : (paymentType === "دين" ? 0 : (parseFloat(paidAmount) || 0))
  const remainingAmount = numAmount - numPaidAmount

  const handleSave = async () => {
    if (!db || !user) return
    if (!campaignId || !type || numAmount <= 0) {
      toast({
        variant: "destructive",
        title: "خطأ في الإدخال",
        description: "يرجى اختيار الحملة ونوع المصروف وإدخال مبلغ صحيح",
      })
      return
    }

    if ((paymentType === "دين" || paymentType === "جزئي") && !payeeId) {
      toast({
        variant: "destructive",
        title: "بيانات ناقصة",
        description: "يرجى اختيار اسم المورد لتسجيل الدين له",
      })
      return
    }

    setLoading(true)
    const expenseData = {
      campaignId,
      type,
      amount: numAmount,
      paidAmount: numPaidAmount,
      remainingAmount: remainingAmount,
      paymentType,
      payeeId: (paymentType !== "نقد") ? payeeId : null,
      date: new Date(date).toISOString(),
      notes,
      userId: user.uid,
      createdAt: serverTimestamp(),
    }

    addDoc(collection(db, "users", user.uid, "campaigns", campaignId, "expenses"), expenseData)
      .then(() => {
        toast({
          title: "تم بنجاح",
          description: "تم حفظ المصروف بنجاح",
        })
        router.push("/")
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: `users/${user.uid}/campaigns/${campaignId}/expenses`,
          operation: 'create',
          requestResourceData: expenseData,
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
        <h1 className="text-lg font-bold">إضافة مصروف جديد</h1>
        <div className="w-6" />
      </header>

      <main className="p-4 space-y-6">
        <Card className="border-none shadow-xl rounded-[1.5rem] overflow-hidden">
          <CardHeader className="bg-accent/5 border-b border-accent/10">
            <CardTitle className="text-md font-bold text-accent">تفاصيل المصروف والتشغيل</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-bold flex items-center gap-2">
                <LayoutList className="w-4 h-4 text-primary" />
                اختيار الحملة <span className="text-destructive">*</span>
              </Label>
              <Select onValueChange={setCampaignId} dir="rtl">
                <SelectTrigger className="h-12 rounded-xl border-muted-foreground/20">
                  <SelectValue placeholder={loadingCampaigns ? "جاري التحميل..." : "اختر الحملة"} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {openCampaigns?.map((camp) => (
                    <SelectItem key={camp.id} value={camp.id}>{camp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold flex items-center gap-2">
                <MoreHorizontal className="w-4 h-4 text-primary" />
                نوع المصروف <span className="text-destructive">*</span>
              </Label>
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
              <Label htmlFor="amount" className="text-sm font-bold flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                إجمالي المبلغ (ر.ي) <span className="text-destructive">*</span>
              </Label>
              <Input 
                id="amount"
                type="text"
                inputMode="decimal"
                placeholder="0" 
                className="h-12 rounded-xl border-muted-foreground/20 focus:ring-accent text-lg font-black tabular-nums"
                value={formatInputNumber(amount)}
                onChange={handleAmountChange}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                طريقة الدفع
              </Label>
              <Select onValueChange={setPaymentType} defaultValue={paymentType} dir="rtl">
                <SelectTrigger className="h-12 rounded-xl border-muted-foreground/20">
                  <SelectValue placeholder="اختر الطريقة" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="نقد">نقد (سداد كامل)</SelectItem>
                  <SelectItem value="دين">دين (على الحساب)</SelectItem>
                  <SelectItem value="جزئي">سداد جزئي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(paymentType === "دين" || paymentType === "جزئي") && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                <div className="flex justify-between items-center px-1">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    المورد المستحق للدين <span className="text-destructive">*</span>
                  </Label>
                  <Link href="/suppliers/new">
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-primary gap-1 font-bold">
                      <Plus className="w-3 h-3" />
                      مورد جديد
                    </Button>
                  </Link>
                </div>
                <Select onValueChange={setPayeeId} dir="rtl">
                  <SelectTrigger className="h-12 rounded-xl border-muted-foreground/20">
                    <SelectValue placeholder="اختر المورد" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {suppliers?.map((sup) => (
                      <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {paymentType === "جزئي" && (
              <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="paidAmount" className="text-sm font-bold text-accent">المبلغ المدفوع</Label>
                  <Input 
                    id="paidAmount"
                    type="text"
                    inputMode="decimal"
                    className="h-12 rounded-xl border-accent/20 font-bold text-accent tabular-nums"
                    value={formatInputNumber(paidAmount)}
                    onChange={handlePaidAmountChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-destructive">المبلغ المتبقي</Label>
                  <div className="h-12 flex items-center px-4 bg-destructive/5 border border-destructive/10 rounded-xl font-black text-destructive tabular-nums">
                    {remainingAmount.toLocaleString('en-US')}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="expense-date" className="text-sm font-bold flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" />
                تاريخ المصروف
              </Label>
              <div className="relative">
                <Input 
                  id="expense-date"
                  type="date"
                  className="h-12 rounded-xl border-muted-foreground/20 focus:ring-accent text-right pr-10 tabular-nums"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-bold flex items-center gap-2">
                <MoreHorizontal className="w-4 h-4 text-primary" />
                ملاحظات إضافية
              </Label>
              <Textarea 
                id="notes"
                placeholder="مثال: ديزل للسيارة رقم 1..." 
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
            disabled={loading || loadingCampaigns}
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Save className="w-6 h-6" />
            )}
            حفظ وتأكيد المصروف
          </Button>
          <Button 
            variant="ghost" 
            className="w-full h-12 rounded-xl text-muted-foreground font-bold"
            onClick={() => router.back()}
            disabled={loading}
          >
            تراجع
          </Button>
        </div>
      </main>
    </div>
  )
}

