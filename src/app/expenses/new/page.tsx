"use client"

import { useState } from "react"
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
  LayoutList, 
  Wallet, 
  Car, 
  User, 
  Plus, 
  Trash2, 
  Edit3, 
  Table as TableIcon,
  AlertCircle,
  X,
  Check,
  ClipboardList
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useUser, useMemoFirebase } from "@/firebase"
import { collection, doc, serverTimestamp, query, where, writeBatch } from "firebase/firestore"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

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

interface TempExpense {
  tempId: string;
  type: string;
  amount: number;
  paymentType: string;
  paidAmount: number;
  remainingAmount: number;
  payeeId: string | null;
  payeeName: string | null;
  date: string;
  notes: string;
}

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

  // Global State
  const [campaignId, setCampaignId] = useState("")
  
  // Form State for Single Expense
  const [type, setType] = useState("")
  const [amount, setAmount] = useState("")
  const [paymentType, setPaymentType] = useState("نقد")
  const [paidAmount, setPaidAmount] = useState("")
  const [payeeId, setPayeeId] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)

  // List State
  const [addedExpenses, setAddedExpenses] = useState<TempExpense[]>([])

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

  const handleAddToList = () => {
    if (!type || numAmount <= 0) {
      toast({
        variant: "destructive",
        title: "خطأ في الإدخال",
        description: "يرجى اختيار نوع المصروف وإدخال مبلغ صحيح",
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

    const selectedSupplier = suppliers?.find(s => s.id === payeeId)

    const newExpense: TempExpense = {
      tempId: editingId || Math.random().toString(36).substr(2, 9),
      type,
      amount: numAmount,
      paymentType,
      paidAmount: numPaidAmount,
      remainingAmount,
      payeeId: (paymentType !== "نقد") ? (payeeId || null) : null,
      payeeName: (paymentType !== "نقد") ? (selectedSupplier?.name || null) : null,
      date,
      notes: notes || ""
    }

    if (editingId) {
      setAddedExpenses(addedExpenses.map(e => e.tempId === editingId ? newExpense : e))
      setEditingId(null)
      toast({ title: "تم تحديث المصروف في القائمة" })
    } else {
      setAddedExpenses([newExpense, ...addedExpenses])
      toast({ title: "تمت إضافة المصروف للقائمة" })
    }

    // Reset Form
    setType("")
    setAmount("")
    setPaidAmount("")
    setPaymentType("نقد")
    setNotes("")
  }

  const handleEdit = (expense: TempExpense) => {
    setEditingId(expense.tempId)
    setType(expense.type)
    setAmount(expense.amount.toString())
    setPaymentType(expense.paymentType)
    setPaidAmount(expense.paymentType === "جزئي" ? expense.paidAmount.toString() : "")
    setPayeeId(expense.payeeId || "")
    setDate(expense.date)
    setNotes(expense.notes)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRemove = (tempId: string) => {
    setAddedExpenses(addedExpenses.filter(e => e.tempId !== tempId))
  }

  const handleFinalSave = async () => {
    if (!db || !user || !campaignId) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى التأكد من اختيار الحملة وإضافة مصروفات",
      })
      return
    }

    setLoading(true)
    const batch = writeBatch(db)
    
    addedExpenses.forEach((exp) => {
      const expenseCollectionRef = collection(db, "users", user.uid, "campaigns", campaignId, "expenses")
      const expenseRef = doc(expenseCollectionRef)
      
      batch.set(expenseRef, {
        id: expenseRef.id,
        type: exp.type,
        amount: exp.amount,
        paymentType: exp.paymentType,
        paidAmount: exp.paidAmount,
        remainingAmount: exp.remainingAmount,
        payeeId: exp.payeeId,
        payeeName: exp.payeeName,
        notes: exp.notes,
        campaignId: campaignId,
        userId: user.uid,
        createdAt: serverTimestamp(),
        expenseDate: new Date(exp.date).toISOString()
      })
    })

    // Perform non-blocking commit
    batch.commit()
      .then(() => {
        toast({
          title: "تم الحفظ بنجاح",
          description: `تم تسجيل ${addedExpenses.length} مصاريف بنجاح`,
        })
        router.push(`/campaigns/${campaignId}`)
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: `users/${user.uid}/campaigns/${campaignId}/expenses/${addedExpenses[0]?.tempId || 'bulk'}`,
          operation: 'write',
        })
        errorEmitter.emit('permission-error', permissionError)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  const totalBatchAmount = addedExpenses.reduce((acc, curr) => acc + curr.amount, 0)

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <header className="p-4 flex items-center justify-between border-b bg-white sticky top-0 z-20 shadow-sm">
        <button onClick={() => router.back()} className="p-2 -mr-2">
          <ChevronLeft className="w-6 h-6 rotate-180" />
        </button>
        <h1 className="text-lg font-bold">تسجيل مصاريف التشغيل</h1>
        <div className="w-6" />
      </header>

      <main className="p-4 space-y-6">
        {/* Campaign Selection */}
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-primary/5 border-b p-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              اختيار الحملة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              <Select onValueChange={setCampaignId} value={campaignId} dir="rtl">
                <SelectTrigger className="h-12 rounded-xl border-muted-foreground/20">
                  <SelectValue placeholder={loadingCampaigns ? "جاري التحميل..." : "اختر الحملة المستهدفة"} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {openCampaigns?.map((camp) => (
                    <SelectItem key={camp.id} value={camp.id}>{camp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Entry Form */}
        <Card className={cn(
          "border-2 shadow-md rounded-[1.5rem] overflow-hidden transition-all duration-300",
          editingId ? "border-accent ring-2 ring-accent/10" : "border-primary/10"
        )}>
          <CardHeader className={cn("p-4 border-b", editingId ? "bg-accent/5" : "bg-muted/30")}>
            <CardTitle className={cn("text-sm font-bold flex items-center gap-2", editingId ? "text-accent" : "text-primary")}>
              {editingId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editingId ? "تعديل بيانات المصروف الحالي" : "إضافة مصروف جديد للقائمة"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-5">
            <div className="space-y-3">
              <Label className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                <MoreHorizontal className="w-3.5 h-3.5 text-primary" />
                نوع المصروف <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {expenseTypes.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setType(item.value)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all gap-1",
                      type === item.value 
                        ? "bg-accent text-white border-accent shadow-md scale-95" 
                        : "bg-white text-muted-foreground border-muted-foreground/10 hover:bg-accent/5"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-[9px] font-bold">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5 text-primary" />
                  المبلغ (ر.ي) <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0" 
                  className="h-12 rounded-xl border-muted-foreground/20 font-black text-lg tabular-nums"
                  value={formatInputNumber(amount)}
                  onChange={handleAmountChange}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5 text-primary" />
                  طريقة السداد
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {["نقد", "دين", "جزئي"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPaymentType(t)}
                      className={cn(
                        "py-3 text-[11px] font-bold rounded-xl border transition-all",
                        paymentType === t 
                          ? "bg-primary text-white border-primary shadow-sm" 
                          : "bg-muted/30 text-muted-foreground border-transparent"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {(paymentType === "دين" || paymentType === "جزئي") && (
              <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <Label className="text-[11px] font-bold text-muted-foreground flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-primary" />
                      المورد المستحق
                    </Label>
                    <Link href="/suppliers/new">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-primary gap-1 font-bold text-[10px]">
                        <Plus className="w-3 h-3" />
                        مورد جديد
                      </Button>
                    </Link>
                  </div>
                  <Select onValueChange={setPayeeId} value={payeeId} dir="rtl">
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="اختر المورد..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {suppliers?.map((sup) => (
                        <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {paymentType === "جزئي" && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-accent/5 rounded-2xl border border-accent/10">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-accent">المدفوع</Label>
                      <Input 
                        type="text"
                        inputMode="decimal"
                        className="h-10 rounded-xl border-accent/20 font-bold text-accent tabular-nums"
                        value={formatInputNumber(paidAmount)}
                        onChange={handlePaidAmountChange}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-destructive">المتبقي (دين)</Label>
                      <div className="h-10 flex items-center px-3 bg-destructive/5 border border-destructive/10 rounded-xl font-black text-destructive tabular-nums text-sm">
                        {remainingAmount.toLocaleString('en-US')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                  <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                  تاريخ المصروف
                </Label>
                <Input 
                  id="date"
                  type="date"
                  className="h-12 rounded-xl border-muted-foreground/20 text-right tabular-nums"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                  <MoreHorizontal className="w-3.5 h-3.5 text-primary" />
                  ملاحظات
                </Label>
                <Input 
                  id="notes"
                  placeholder="ملاحظات اختيارية..." 
                  className="h-12 rounded-xl border-muted-foreground/20"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleAddToList} 
                className={cn("flex-1 h-12 rounded-xl font-bold gap-2 shadow-lg", editingId ? "bg-accent" : "lux-gradient")}
              >
                {editingId ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {editingId ? "تحديث في القائمة" : "إضافة لقائمة المصاريف"}
              </Button>
              {editingId && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingId(null)
                    setType("")
                    setAmount("")
                    setPaidAmount("")
                    setPaymentType("نقد")
                    setNotes("")
                  }} 
                  className="h-12 w-12 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* List Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-black flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-primary" />
              المصاريف المضافة ({addedExpenses.length})
            </h3>
            {addedExpenses.length > 0 && (
              <span className="text-xs font-bold text-primary tabular-nums">الإجمالي: {totalBatchAmount.toLocaleString('en-US')} ر.ي</span>
            )}
          </div>

          {addedExpenses.length > 0 ? (
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <Table dir="rtl">
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-right text-[10px] font-bold">نوع المصروف</TableHead>
                      <TableHead className="text-center text-[10px] font-bold">المبلغ</TableHead>
                      <TableHead className="text-center text-[10px] font-bold">الدفع</TableHead>
                      <TableHead className="text-center text-[10px] font-bold">التاريخ</TableHead>
                      <TableHead className="text-right text-[10px] font-bold">الملاحظات/المورد</TableHead>
                      <TableHead className="text-left text-[10px] font-bold">إجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {addedExpenses.map((exp) => (
                      <TableRow key={exp.tempId} className="animate-in slide-in-from-right-2">
                        <TableCell className="text-right text-xs font-bold">{exp.type}</TableCell>
                        <TableCell className="text-center text-xs font-black text-accent tabular-nums">{exp.amount.toLocaleString('en-US')}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn(
                            "text-[8px] px-1.5 py-0 border-none",
                            exp.paymentType === "نقد" ? "bg-green-50 text-green-600" : (exp.paymentType === "دين" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600")
                          )}>
                            {exp.paymentType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-[10px] tabular-nums">
                          {format(new Date(exp.date), "dd/MM", { locale: ar })}
                        </TableCell>
                        <TableCell className="text-right text-[10px] max-w-[150px] truncate">
                          <div className="flex flex-col gap-0.5">
                            {exp.payeeName && <span className="font-bold text-primary">{exp.payeeName}</span>}
                            <span className="text-muted-foreground italic">{exp.notes || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleEdit(exp)} className="p-1 text-accent">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="p-1 text-destructive">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-3xl max-w-[90%] mx-auto">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-right flex items-center justify-end gap-2 font-bold">
                                    حذف المصروف <Trash2 className="w-5 h-5 text-destructive" />
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-right font-medium">
                                    هل أنت متأكد من حذف هذا المصروف من القائمة؟
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex-row gap-2 mt-4">
                                  <AlertDialogCancel className="flex-1 rounded-xl font-bold">إلغاء</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRemove(exp.tempId)} className="flex-1 rounded-xl bg-destructive text-white border-none font-bold">حذف</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          ) : (
            <div className="text-center py-16 text-muted-foreground text-sm border-2 border-dashed rounded-[2rem] bg-white/50">
              لا توجد مصاريف مضافة للقائمة حالياً
            </div>
          )}
        </div>

        {/* Final Save */}
        {addedExpenses.length > 0 && (
          <div className="pt-4 sticky bottom-4 z-30">
            <Button 
              className="w-full h-14 rounded-2xl text-lg font-black shadow-xl gap-2 lux-gradient" 
              onClick={handleFinalSave}
              disabled={loading || !campaignId}
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Save className="w-6 h-6" />
              )}
              تأكيد وحفظ الكل ({totalBatchAmount.toLocaleString('en-US')} ر.ي)
            </Button>
            {!campaignId && (
              <p className="text-[10px] text-destructive font-bold text-center mt-2 flex items-center justify-center gap-1">
                <AlertCircle className="w-3 h-3" />
                يرجى اختيار الحملة قبل الحفظ النهائي
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
