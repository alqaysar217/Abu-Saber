
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Save, 
  Loader2, 
  Calendar as CalendarIcon, 
  Ship, 
  User, 
  Fish, 
  Scale, 
  Coins, 
  Wallet,
  ClipboardList,
  Plus, 
  Trash2,
  Table as TableIcon,
  AlertCircle,
  Edit3,
  Check,
  X,
  CreditCard,
  Hash
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useUser, useMemoFirebase } from "@/firebase"
import { collection, doc, setDoc, serverTimestamp, query, where } from "firebase/firestore"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { cn } from "@/lib/utils"
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

interface PurchaseItem {
  tempId: string
  fishType: string
  quantity: number
  pricePerKg: number
  lineTotal: number
  paymentType: string // نقد, دين, جزئي
  paidAmount: number
}

export default function NewPurchasePage() {
  const router = useRouter()
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  const [loading, setLoading] = useState(false)

  const [campaignId, setCampaignId] = useState("")
  const [supplierId, setSupplierId] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const [currentItem, setCurrentItem] = useState({ 
    fishType: "", 
    quantity: "", 
    pricePerKg: "", 
    paymentType: "نقد", 
    paidAmount: "" 
  })
  const [addedItems, setAddedItems] = useState<PurchaseItem[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

  const campaignsQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(
      collection(db, "users", user.uid, "campaigns"),
      where("status", "==", "open")
    )
  }, [db, user])

  const { data: openCampaigns } = useCollection(campaignsQuery)

  const suppliersQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "suppliers"))
  }, [db, user])

  const { data: suppliers } = useCollection(suppliersQuery)

  const formatInputNumber = (val: string) => {
    if (!val) return ""
    const parts = val.split('.')
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    return parts.join('.')
  }

  const handleInputNumberChange = (field: string, value: string) => {
    const rawValue = value.replace(/,/g, "")
    if (rawValue === "" || /^\d*\.?\d*$/.test(rawValue)) {
      setCurrentItem(prev => ({ ...prev, [field]: rawValue }))
    }
  }

  const handleAddItem = () => {
    const qty = parseFloat(currentItem.quantity)
    const price = parseFloat(currentItem.pricePerKg)
    const paid = parseFloat(currentItem.paidAmount) || 0
    const lineTotal = qty * price

    if (!currentItem.fishType || isNaN(qty) || isNaN(price) || qty <= 0 || price <= 0) {
      toast({
        variant: "destructive",
        title: "بيانات ناقصة",
        description: "يرجى إدخال نوع السمك والكمية والسعر بشكل صحيح",
      })
      return
    }

    const newItem: PurchaseItem = {
      tempId: editingId || Math.random().toString(36).substr(2, 9),
      fishType: currentItem.fishType,
      quantity: qty,
      pricePerKg: price,
      lineTotal: lineTotal,
      paymentType: currentItem.paymentType,
      paidAmount: currentItem.paymentType === "نقد" ? lineTotal : (currentItem.paymentType === "دين" ? 0 : paid)
    }

    if (editingId) {
      setAddedItems(addedItems.map(item => item.tempId === editingId ? newItem : item))
      setEditingId(null)
    } else {
      setAddedItems([newItem, ...addedItems])
    }

    setCurrentItem({ fishType: "", quantity: "", pricePerKg: "", paymentType: "نقد", paidAmount: "" })
    const fishInput = document.getElementById("fish-type-input")
    if (fishInput) fishInput.focus()
  }

  const handleEditItem = (item: PurchaseItem) => {
    setEditingId(item.tempId)
    setCurrentItem({
      fishType: item.fishType,
      quantity: item.quantity.toString(),
      pricePerKg: item.pricePerKg.toString(),
      paymentType: item.paymentType,
      paidAmount: item.paymentType === "جزئي" ? item.paidAmount.toString() : ""
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRemoveItem = (tempId: string) => {
    setAddedItems(addedItems.filter(item => item.tempId !== tempId))
  }

  const grandTotal = addedItems.reduce((acc, item) => acc + item.lineTotal, 0)
  const totalPaid = addedItems.reduce((acc, item) => acc + item.paidAmount, 0)
  const totalDue = grandTotal - totalPaid

  const handleFinalSave = async () => {
    if (!db || !user) return
    if (!campaignId || !supplierId || addedItems.length === 0) {
      toast({ variant: "destructive", title: "خطأ", description: "يرجى إكمال بيانات الحملة والمورد والأصناف" })
      return
    }

    setLoading(true)
    const purchaseRef = doc(collection(db, "users", user.uid, "purchases"))
    const purchaseData = {
      id: purchaseRef.id,
      campaignId,
      supplierId,
      totalAmount: grandTotal,
      paidAmount: totalPaid,
      status: totalDue === 0 ? "مدفوعة" : (totalPaid === 0 ? "دين" : "جزئي"),
      purchaseDate: new Date(date).toISOString(),
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    setDoc(purchaseRef, purchaseData)
      .then(() => {
        addedItems.forEach((item) => {
          const itemRef = doc(collection(purchaseRef, "items"))
          setDoc(itemRef, {
            id: itemRef.id,
            purchaseId: purchaseRef.id,
            userId: user.uid,
            fishType: item.fishType,
            quantity: item.quantity,
            unitPrice: item.pricePerKg,
            lineTotal: item.lineTotal,
            paymentType: item.paymentType,
            paidAmount: item.paidAmount
          })
        })
        toast({ title: "تم حفظ عملية الشراء بنجاح" })
        router.push("/campaigns/" + campaignId)
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: purchaseRef.path,
          operation: 'create',
          requestResourceData: purchaseData,
        })
        errorEmitter.emit('permission-error', permissionError)
      })
      .finally(() => setLoading(false))
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <header className="p-4 flex items-center justify-between border-b bg-white sticky top-0 z-20 shadow-sm">
        <button onClick={() => router.back()} className="p-2 -mr-2">
          <ChevronLeft className="w-6 h-6 rotate-180" />
        </button>
        <h1 className="text-lg font-bold">تسجيل شراء أسماك</h1>
        <div className="w-6" />
      </header>

      <main className="p-4 space-y-6">
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-orange-50/50 border-b border-orange-100 p-4">
            <CardTitle className="text-sm font-bold text-orange-800 flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              بيانات التوريد الأساسية
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-5">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-muted-foreground flex items-center gap-2">
                <Ship className="w-3.5 h-3.5 text-primary" />
                الحملة المرتبطة <span className="text-destructive">*</span>
              </Label>
              <Select onValueChange={setCampaignId} value={campaignId} dir="rtl">
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="اختر الحملة..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {openCampaigns?.map((camp) => (
                    <SelectItem key={camp.id} value={camp.id}>{camp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-muted-foreground flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-primary" />
                المورد / الصياد <span className="text-destructive">*</span>
              </Label>
              <Select onValueChange={setSupplierId} value={supplierId} dir="rtl">
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

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-muted-foreground flex items-center gap-2">
                <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                تاريخ الشراء
              </Label>
              <Input type="date" className="h-12 rounded-xl text-right tabular-nums" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className={cn("border-2 shadow-md rounded-2xl bg-white", editingId ? "border-accent" : "border-primary/10")}>
           <CardHeader className="p-4 pb-2">
              <CardTitle className={cn("text-sm font-bold flex items-center gap-2", editingId ? "text-accent" : "text-primary")}>
                {editingId ? <Edit3 className="w-4 h-4" /> : <Fish className="w-4 h-4" />}
                {editingId ? "تعديل الصنف الحالي" : "إضافة صنف سمك جديد"}
              </CardTitle>
           </CardHeader>
           <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fish-type-input" className="text-[11px] font-bold flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5 text-primary" />
                  نوع السمك
                </Label>
                <Input id="fish-type-input" placeholder="مثال: هامور..." className="h-12 rounded-xl" value={currentItem.fishType} onChange={(e) => setCurrentItem({...currentItem, fishType: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold flex items-center gap-2">
                    <Scale className="w-3.5 h-3.5 text-primary" />
                    الكمية (كجم)
                  </Label>
                  <Input type="text" inputMode="decimal" placeholder="0" className="h-12 rounded-xl tabular-nums" value={formatInputNumber(currentItem.quantity)} onChange={(e) => handleInputNumberChange('quantity', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold flex items-center gap-2">
                    <Coins className="w-3.5 h-3.5 text-primary" />
                    سعر الكيلو (ر.ي)
                  </Label>
                  <Input type="text" inputMode="decimal" placeholder="0" className="h-12 rounded-xl tabular-nums" value={formatInputNumber(currentItem.pricePerKg)} onChange={(e) => handleInputNumberChange('pricePerKg', e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5 text-primary" />
                  طريقة السداد لهذا الصنف
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {["نقد", "دين", "جزئي"].map((type) => (
                    <button key={type} type="button" onClick={() => setCurrentItem({...currentItem, paymentType: type})} className={cn("py-3 text-[11px] font-bold rounded-xl border transition-all", currentItem.paymentType === type ? 'bg-primary text-white border-primary' : 'bg-muted/30 text-muted-foreground')}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {currentItem.paymentType === "جزئي" && (
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-accent flex items-center gap-2">
                    <Wallet className="w-3.5 h-3.5 text-accent" />
                    المبلغ المسدد لهذا الصنف (ر.ي)
                  </Label>
                  <Input type="text" inputMode="decimal" placeholder="0" className="h-12 rounded-xl border-accent/30 text-accent font-black tabular-nums" value={formatInputNumber(currentItem.paidAmount)} onChange={(e) => handleInputNumberChange('paidAmount', e.target.value)} />
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleAddItem} className={cn("flex-1 h-12 rounded-xl font-bold gap-2 shadow-lg", editingId ? "bg-accent" : "lux-gradient")}>
                  {editingId ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  {editingId ? "حفظ التعديلات" : "إضافة للقائمة"}
                </Button>
                {editingId && (
                  <Button variant="outline" onClick={() => { setEditingId(null); setCurrentItem({ fishType: "", quantity: "", pricePerKg: "", paymentType: "نقد", paidAmount: "" }) }} className="h-12 w-12 rounded-xl">
                    <X className="w-5 h-5" />
                  </Button>
                )}
              </div>
           </CardContent>
        </Card>

        <div className="space-y-3">
          <h3 className="text-sm font-black flex items-center gap-2 px-2">
            <TableIcon className="w-4 h-4 text-primary" />
            الأصناف المشتراة ({addedItems.length})
          </h3>
          
          {addedItems.length > 0 ? (
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <Table dir="rtl">
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-right text-[10px]">النوع</TableHead>
                      <TableHead className="text-center text-[10px]">الكمية</TableHead>
                      <TableHead className="text-center text-[10px]">السعر</TableHead>
                      <TableHead className="text-center text-[10px]">الإجمالي</TableHead>
                      <TableHead className="text-center text-[10px]">الدفع</TableHead>
                      <TableHead className="text-left text-[10px]">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {addedItems.map((item) => (
                      <TableRow key={item.tempId}>
                        <TableCell className="text-right font-bold text-xs">{item.fishType}</TableCell>
                        <TableCell className="text-center text-xs tabular-nums">{item.quantity.toLocaleString('en-US')} kg</TableCell>
                        <TableCell className="text-center text-xs tabular-nums">{item.pricePerKg.toLocaleString('en-US')}</TableCell>
                        <TableCell className="text-center text-xs font-black text-orange-600 tabular-nums">{item.lineTotal.toLocaleString('en-US')}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn("text-[8px] px-1.5 py-0 border-none", item.paymentType === "نقد" ? "bg-green-100 text-green-700" : (item.paymentType === "دين" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"))}>
                            {item.paymentType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleEditItem(item)} className="text-accent"><Edit3 className="w-4 h-4" /></button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="text-destructive"><Trash2 className="w-4 h-4" /></button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-3xl max-w-[90%] mx-auto">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-right flex items-center justify-end gap-2">حذف الصنف <Trash2 className="w-5 h-5 text-destructive" /></AlertDialogTitle>
                                  <AlertDialogDescription className="text-right">هل أنت متأكد من رغبتك في حذف ({item.fishType})؟</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex-row gap-2 mt-4">
                                  <AlertDialogCancel className="flex-1 rounded-xl">إلغاء</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRemoveItem(item.tempId)} className="flex-1 rounded-xl bg-destructive text-white border-none">حذف</AlertDialogAction>
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
            <div className="text-center py-16 text-muted-foreground text-sm border-2 border-dashed rounded-[2rem]">لا توجد أصناف حالياً</div>
          )}
        </div>

        {addedItems.length > 0 && (
          <div className="space-y-4">
            <Card className="border-none shadow-lg rounded-[2rem] bg-primary text-white p-6">
              <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
                <span className="text-xs font-bold opacity-80">إجمالي الفاتورة:</span>
                <span className="text-xl font-black tabular-nums">{grandTotal.toLocaleString('en-US')} ر.ي</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold opacity-70 block">تم سداده</span>
                  <span className="text-md font-black tabular-nums">{totalPaid.toLocaleString('en-US')}</span>
                </div>
                <div className="space-y-1 border-r border-white/10">
                  <span className="text-[10px] font-bold opacity-70 block">متبقي (دين)</span>
                  <span className="text-md font-black text-orange-400 tabular-nums">{totalDue.toLocaleString('en-US')}</span>
                </div>
              </div>
            </Card>
            <Button className="w-full h-14 rounded-2xl text-lg font-black shadow-xl gap-2 bg-orange-600" onClick={handleFinalSave} disabled={loading}>
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
              حفظ وتأكيد عملية الشراء
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
