
"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Save, 
  Loader2, 
  Fuel, 
  Users, 
  Snowflake, 
  Waves, 
  Package, 
  Utensils, 
  MoreHorizontal, 
  Calendar as CalendarIcon, 
  Wallet, 
  Car, 
  User,
  AlertCircle,
  Edit3
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from "@/firebase"
import { doc, updateDoc, serverTimestamp, collection, query } from "firebase/firestore"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { cn } from "@/lib/utils"
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

export default function EditExpensePage({ params }: { params: Promise<{ campaignId: string, expenseId: string }> }) {
  const router = useRouter()
  const { campaignId, expenseId } = use(params)
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  const [saving, setSaving] = useState(false)

  const expenseRef = useMemoFirebase(() => {
    if (!db || !user || !campaignId || !expenseId) return null
    return doc(db, "users", user.uid, "campaigns", campaignId, "expenses", expenseId)
  }, [db, user, campaignId, expenseId])

  const { data: expense, isLoading: loadingExpense } = useDoc(expenseRef)

  const suppliersQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "suppliers"))
  }, [db, user])

  const { data: suppliers } = useCollection(suppliersQuery)

  const [type, setType] = useState("")
  const [amount, setAmount] = useState("")
  const [paymentType, setPaymentType] = useState("نقد")
  const [paidAmount, setPaidAmount] = useState("")
  const [payeeId, setPayeeId] = useState("")
  const [date, setDate] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (expense) {
      setType(expense.type || "")
      setAmount(expense.amount?.toString() || "")
      setPaymentType(expense.paymentType || "نقد")
      setPaidAmount(expense.paidAmount?.toString() || "")
      setPayeeId(expense.payeeId || "")
      if (expense.expenseDate) {
        try {
          const d = new Date(expense.expenseDate)
          if (!isNaN(d.getTime())) {
            setDate(d.toISOString().split('T')[0])
          }
        } catch (e) {
          console.error("Invalid date from database", e)
        }
      }
      setNotes(expense.notes || "")
    }
  }, [expense])

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

  const handleSave = async () => {
    if (!db || !user || !expenseRef) return
    const numAmount = parseFloat(amount) || 0
    
    if (!type || numAmount <= 0 || !date) {
      toast({ variant: "destructive", title: "يرجى إكمال البيانات المطلوبة" })
      return
    }

    const parsedDate = new Date(date)
    if (isNaN(parsedDate.getTime())) {
      toast({ variant: "destructive", title: "تاريخ غير صالح" })
      return
    }

    setSaving(true)
    const numPaid = paymentType === "نقد" ? numAmount : (paymentType === "دين" ? 0 : (parseFloat(paidAmount) || 0))
    const selectedSupplier = suppliers?.find(s => s.id === payeeId)

    const updateData = {
      type,
      amount: numAmount,
      paymentType,
      paidAmount: numPaid,
      remainingAmount: numAmount - numPaid,
      payeeId: paymentType !== "نقد" ? payeeId : null,
      payeeName: paymentType !== "نقد" ? (selectedSupplier?.name || null) : null,
      expenseDate: parsedDate.toISOString(),
      notes: notes || null,
      updatedAt: serverTimestamp()
    }

    updateDoc(expenseRef, updateData)
      .then(() => {
        toast({ title: "تم التحديث بنجاح" })
        router.back()
      })
      .catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: expenseRef.path,
          operation: 'update',
          requestResourceData: updateData
        }))
      })
      .finally(() => setSaving(false))
  }

  if (loadingExpense) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-primary" /></div>
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-10">
      <header className="p-4 flex items-center justify-between border-b bg-white sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 -mr-2">
          <ChevronLeft className="w-6 h-6 rotate-180" />
        </button>
        <h1 className="text-lg font-bold">تعديل مصروف</h1>
        <div className="w-6" />
      </header>

      <main className="p-4 space-y-6">
        <Card className="border-2 border-primary/10 shadow-md rounded-2xl overflow-hidden">
          <CardHeader className="bg-muted/30 p-4 border-b">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-primary" />
              تعديل تفاصيل المصروف
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-5">
            <div className="space-y-3">
              <Label className="text-xs font-bold text-muted-foreground">نوع المصروف</Label>
              <div className="grid grid-cols-4 gap-2">
                {expenseTypes.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setType(item.value)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all gap-1",
                      type === item.value 
                        ? "bg-accent text-white border-accent shadow-md scale-95" 
                        : "bg-white text-muted-foreground border-muted-foreground/10"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-[9px] font-bold">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">المبلغ (ر.ي)</Label>
              <Input 
                type="text"
                inputMode="decimal"
                className="h-12 rounded-xl font-black text-lg"
                value={formatInputNumber(amount)}
                onChange={handleAmountChange}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">طريقة السداد</Label>
              <div className="grid grid-cols-3 gap-2">
                {["نقد", "دين", "جزئي"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setPaymentType(t)}
                    className={cn(
                      "py-3 text-[11px] font-bold rounded-xl border transition-all",
                      paymentType === t ? "bg-primary text-white border-primary" : "bg-muted/30 text-muted-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {paymentType !== "نقد" && (
              <div className="space-y-4 animate-in slide-in-from-top-2">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">المورد</Label>
                  <Select onValueChange={setPayeeId} value={payeeId} dir="rtl">
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="اختر المورد..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {suppliers?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {paymentType === "جزئي" && (
                  <div className="space-y-4 p-4 bg-muted/20 rounded-2xl border border-dashed animate-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-accent">المبلغ المسدد الآن</Label>
                      <Input 
                        type="text" 
                        inputMode="decimal"
                        className="h-12 rounded-xl border-accent/30 text-accent font-black text-lg tabular-nums"
                        value={formatInputNumber(paidAmount)}
                        onChange={handlePaidAmountChange}
                      />
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-xl border shadow-sm">
                      <span className="text-xs font-bold text-muted-foreground">المتبقي (دين للمورد):</span>
                      <span className="text-lg font-black text-destructive tabular-nums">{( (parseFloat(amount) || 0) - (parseFloat(paidAmount) || 0) ).toLocaleString('en-US')} ر.ي</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-bold">التاريخ</Label>
              <Input 
                type="date"
                className="h-12 rounded-xl text-right"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">ملاحظات</Label>
              <Input 
                placeholder="إضافة ملاحظات..."
                className="h-12 rounded-xl"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Button 
          className="w-full h-14 rounded-2xl text-lg font-black lux-gradient shadow-xl gap-2" 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
          تحديث بيانات المصروف
        </Button>
      </main>
    </div>
  )
}
