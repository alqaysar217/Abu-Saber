
"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  Hash,
  ArrowDownToLine
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

interface PurchaseItem {
  tempId: string
  fishType: string
  quantity: number
  pricePerKg: number
  lineTotal: number
  paymentType: string
  paidAmount: number
}

function NewPurchaseContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
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

  useEffect(() => {
    const cId = searchParams.get('campaignId')
    if (cId) setCampaignId(cId)
  }, [searchParams])

  const campaignsQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "campaigns"), where("status", "==", "open"))
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
      toast({ variant: "destructive", title: "بيانات ناقصة", description: "يرجى إكمال بيانات الصنف" })
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
    window.scrollTo({ top: 100, behavior: 'smooth' })
  }

  const handleRemoveItem = (tempId: string) => {
    setAddedItems(addedItems.filter(item => item.tempId !== tempId))
  }

  const currentLineTotal = (parseFloat(currentItem.quantity) || 0) * (parseFloat(currentItem.pricePerKg) || 0)
  const currentPaid = currentItem.paymentType === "نقد" ? currentLineTotal : (currentItem.paymentType === "دين" ? 0 : (parseFloat(currentItem.paidAmount) || 0))
  const currentRemaining = currentLineTotal - currentPaid

  const grandTotal = addedItems.reduce((acc, item) => acc + item.lineTotal, 0)
  const totalPaid = addedItems.reduce((acc, item) => acc + item.paidAmount, 0)
  const totalDue = grandTotal - totalPaid

  const handleFinalSave = async () => {
    if (!db || !user || !campaignId || !supplierId || addedItems.length === 0) {
      toast({ variant: "destructive", title: "بيانات ناقصة" })
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
      remainingAmount: totalDue,
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
          setDoc(itemRef, { ...item, purchaseId: purchaseRef.id, userId: user.uid, unitPrice: item.pricePerKg })
        })
        toast({ title: "تم الحفظ بنجاح" })
        router.push("/campaigns/" + campaignId)
      })
      .catch((error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: purchaseRef.path, operation: 'create' }))
      })
      .finally(() => setLoading(false))
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <header className="p-4 flex items-center justify-between border-b bg-white sticky top-0 z-20 shadow-sm">
        <button onClick={() => router.back()} className="p-2 -mr-2"><ChevronLeft className="w-6 h-6 rotate-180" /></button>
        <h1 className="text-lg font-bold">تسجيل شراء أسماك</h1>
        <div className="w-6" />
      </header>

      <main className="p-4 space-y-6">
        <Card className="border-none shadow-md rounded-[1.5rem] bg-white overflow-hidden">
          <CardHeader className="bg-orange-50 border-b border-orange-100 p-4">
            <CardTitle className="text-sm font-bold text-orange-800 flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              بيانات التوريد
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-5">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold flex items-center gap-2 text-muted-foreground">
                <Ship className="w-3.5 h-3.5 text-orange-600" />
                الحملة المرتبطة *
              </Label>
              <Select onValueChange={setCampaignId} value={campaignId} dir="rtl">
                <SelectTrigger className="h-12 rounded-xl border-muted-foreground/20">
                  <SelectValue placeholder="اختر الحملة..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {openCampaigns?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold flex items-center gap-2 text-muted-foreground">
                <User className="w-3.5 h-3.5 text-orange-600" />
                المورد (البائع) *
              </Label>
              <Select onValueChange={setSupplierId} value={supplierId} dir="rtl">
                <SelectTrigger className="h-12 rounded-xl border-muted-foreground/20">
                  <SelectValue placeholder="اختر المورد..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {suppliers?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold flex items-center gap-2 text-muted-foreground">
                <CalendarIcon className="w-3.5 h-3.5 text-orange-600" />
                تاريخ الشراء
              </Label>
              <Input 
                type="date" 
                className="h-12 rounded-xl text-right border-muted-foreground/20" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
              />
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-2 shadow-lg rounded-[1.5rem] bg-white transition-all duration-300", 
          editingId ? "border-accent ring-4 ring-accent/10" : "border-primary/10"
        )}>
           <CardHeader className={cn("p-4 border-b", editingId ? "bg-accent/5" : "bg-muted/30")}>
             <CardTitle className={cn("text-sm font-bold flex items-center gap-2", editingId ? "text-accent" : "text-primary")}>
               {editingId ? <Edit3 className="w-4 h-4" /> : <Fish className="w-4 h-4" />}
               {editingId ? "تعديل بيانات الصنف" : "إضافة صنف سمك جديد"}
             </CardTitle>
           </CardHeader>
           <CardContent className="p-5 space-y-5">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold flex items-center gap-2">
                  <Fish className="w-3.5 h-3.5 text-muted-foreground" />
                  نوع السمك
                </Label>
                <Input 
                  placeholder="مثال: هامور، تونة..." 
                  className="h-12 rounded-xl" 
                  value={currentItem.fishType} 
                  onChange={e => setCurrentItem({...currentItem, fishType: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold flex items-center gap-2">
                    <Scale className="w-3.5 h-3.5 text-muted-foreground" />
                    الكمية (كجم)
                  </Label>
                  <Input 
                    type="text" 
                    inputMode="decimal" 
                    className="h-12 rounded-xl tabular-nums" 
                    value={formatInputNumber(currentItem.quantity)} 
                    onChange={e => handleInputNumberChange('quantity', e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold flex items-center gap-2">
                    <Coins className="w-3.5 h-3.5 text-muted-foreground" />
                    سعر الكيلو
                  </Label>
                  <Input 
                    type="text" 
                    inputMode="decimal" 
                    className="h-12 rounded-xl tabular-nums" 
                    value={formatInputNumber(currentItem.pricePerKg)} 
                    onChange={e => handleInputNumberChange('pricePerKg', e.target.value)} 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[11px] font-bold flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                  طريقة السداد لهذا الصنف
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {["نقد", "دين", "جزئي"].map(t => (
                    <button 
                      key={t} 
                      type="button" 
                      onClick={() => setCurrentItem({...currentItem, paymentType: t})} 
                      className={cn(
                        "py-3 text-[11px] font-black rounded-xl border transition-all", 
                        currentItem.paymentType === t ? 'bg-primary text-white border-primary shadow-md' : 'bg-muted/30 text-muted-foreground'
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {currentItem.paymentType === "جزئي" && (
                <div className="p-4 bg-accent/5 rounded-2xl border border-dashed border-accent/30 space-y-4 animate-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-accent flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5" />
                      المبلغ المسدد الآن
                    </Label>
                    <Input 
                      type="text" 
                      inputMode="decimal" 
                      placeholder="0" 
                      className="h-12 rounded-xl border-accent/30 text-accent font-black text-lg tabular-nums" 
                      value={formatInputNumber(currentItem.paidAmount)} 
                      onChange={e => handleInputNumberChange('paidAmount', e.target.value)} 
                    />
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-xl border shadow-sm">
                    <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                      <ArrowDownToLine className="w-3 h-3" />
                      المتبقي (دين للمورد):
                    </span>
                    <span className="text-md font-black text-destructive tabular-nums">{currentRemaining.toLocaleString('en-US')} ر.ي</span>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleAddItem} 
                className={cn(
                  "w-full h-14 rounded-2xl font-black text-lg shadow-lg gap-2", 
                  editingId ? "bg-accent hover:bg-accent/90" : "lux-gradient"
                )}
              >
                {editingId ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {editingId ? "تحديث الصنف" : "إضافة صنف للقائمة"}
              </Button>
           </CardContent>
        </Card>

        <div className="space-y-3">
          <h3 className="text-sm font-black flex items-center gap-2 px-2">
            <TableIcon className="w-4 h-4 text-orange-600" />
            الأصناف المشتراة ({addedItems.length})
          </h3>
          {addedItems.length > 0 ? (
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
              <Table dir="rtl">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-right font-black text-xs">الصنف</TableHead>
                    <TableHead className="text-center font-black text-xs">الكمية</TableHead>
                    <TableHead className="text-center font-black text-xs">سعر الكيلو</TableHead>
                    <TableHead className="text-center font-black text-xs">الإجمالي</TableHead>
                    <TableHead className="text-left font-black text-xs">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {addedItems.map(item => (
                    <TableRow key={item.tempId} className="animate-in fade-in slide-in-from-right-1">
                      <TableCell className="text-right font-bold text-xs">{item.fishType}</TableCell>
                      <TableCell className="text-center text-xs tabular-nums font-medium">{item.quantity.toLocaleString('en-US')} كجم</TableCell>
                      <TableCell className="text-center text-xs tabular-nums font-medium">{item.pricePerKg.toLocaleString('en-US')}</TableCell>
                      <TableCell className="text-center text-xs font-black text-orange-600 tabular-nums">{item.lineTotal.toLocaleString('en-US')}</TableCell>
                      <TableCell className="text-left py-2">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => handleEditItem(item)} className="p-1 text-accent hover:bg-accent/10 rounded-full transition-colors">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleRemoveItem(item.tempId)} className="p-1 text-destructive hover:bg-destructive/10 rounded-full transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-xs border-2 border-dashed rounded-[2rem] bg-white/50">
              لم يتم إضافة أصناف بعد
            </div>
          )}
        </div>

        {addedItems.length > 0 && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4">
            <Card className="border-none shadow-xl rounded-[2rem] bg-primary text-white p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <div className="flex justify-between items-center mb-5 border-b border-white/10 pb-4 relative z-10">
                <span className="text-xs font-bold opacity-80 flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5" />
                  إجمالي قيمة الفاتورة
                </span>
                <span className="text-2xl font-black tabular-nums">{grandTotal.toLocaleString('en-US')} ر.ي</span>
              </div>
              <div className="grid grid-cols-2 gap-6 text-center relative z-10">
                <div className="space-y-1">
                  <span className="text-[10px] block opacity-70 font-bold uppercase tracking-wider">المدفوع نقداً</span>
                  <span className="text-lg font-black tabular-nums text-green-400">{totalPaid.toLocaleString('en-US')}</span>
                </div>
                <div className="border-r border-white/10 space-y-1">
                  <span className="text-[10px] block opacity-70 font-bold uppercase tracking-wider">المتبقي (دين)</span>
                  <span className="text-lg font-black tabular-nums text-orange-400">{totalDue.toLocaleString('en-US')}</span>
                </div>
              </div>
            </Card>

            <Button 
              className="w-full h-16 rounded-[1.5rem] text-xl font-black shadow-xl bg-orange-600 hover:bg-orange-700 gap-3" 
              onClick={handleFinalSave} 
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : <Save className="w-6 h-6" />}
              حفظ وتأكيد المشتريات
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}

export default function NewPurchasePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-primary" /></div>}>
      <NewPurchaseContent />
    </Suspense>
  )
}
