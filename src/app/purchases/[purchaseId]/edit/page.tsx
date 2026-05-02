"use client"

import { useState, useEffect, use } from "react"
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
import { useFirestore, useCollection, useUser, useMemoFirebase, useDoc } from "@/firebase"
import { collection, doc, setDoc, serverTimestamp, query, where, updateDoc, deleteDoc, getDocs, writeBatch } from "firebase/firestore"
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
  id?: string
  fishType: string
  quantity: number
  pricePerKg: number
  lineTotal: number
  paymentType: string
  paidAmount: number
}

export default function EditPurchasePage({ params }: { params: Promise<{ purchaseId: string }> }) {
  const router = useRouter()
  const { purchaseId } = use(params)
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(true)

  const purchaseRef = useMemoFirebase(() => {
    if (!db || !user || !purchaseId) return null
    return doc(db, "users", user.uid, "purchases", purchaseId)
  }, [db, user, purchaseId])

  const { data: purchaseData } = useDoc(purchaseRef)

  const itemsQuery = useMemoFirebase(() => {
    if (!db || !user || !purchaseId) return null
    return query(collection(db, "users", user.uid, "purchases", purchaseId, "items"))
  }, [db, user, purchaseId])

  const { data: existingItems } = useCollection(itemsQuery)

  const [campaignId, setCampaignId] = useState("")
  const [supplierId, setSupplierId] = useState("")
  const [date, setDate] = useState("")

  const [currentItem, setCurrentItem] = useState({ fishType: "", quantity: "", pricePerKg: "", paymentType: "نقد", paidAmount: "" })
  const [addedItems, setAddedItems] = useState<PurchaseItem[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (purchaseData) {
      setCampaignId(purchaseData.campaignId || "")
      setSupplierId(purchaseData.supplierId || "")
      if (purchaseData.purchaseDate) {
        setDate(new Date(purchaseData.purchaseDate).toISOString().split('T')[0])
      }
    }
  }, [purchaseData])

  useEffect(() => {
    if (existingItems) {
      setAddedItems(existingItems.map(item => ({
        tempId: item.id,
        id: item.id,
        fishType: item.fishType,
        quantity: item.quantity,
        pricePerKg: item.unitPrice,
        lineTotal: item.lineTotal,
        paymentType: item.paymentType || "نقد",
        paidAmount: item.paidAmount || 0
      })))
      setFetchingData(false)
    }
  }, [existingItems])

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
      toast({ variant: "destructive", title: "بيانات ناقصة" })
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
  }

  const handleRemoveItem = (tempId: string) => {
    setAddedItems(addedItems.filter(item => item.tempId !== tempId))
  }

  const grandTotal = addedItems.reduce((acc, item) => acc + item.lineTotal, 0)
  const totalPaid = addedItems.reduce((acc, item) => acc + item.paidAmount, 0)
  const totalDue = grandTotal - totalPaid

  const handleUpdate = async () => {
    if (!db || !user || !purchaseRef) return
    setLoading(true)

    // First update the main document
    updateDoc(purchaseRef, {
      campaignId,
      supplierId,
      totalAmount: grandTotal,
      paidAmount: totalPaid,
      status: totalDue === 0 ? "مدفوعة" : (totalPaid === 0 ? "دين" : "جزئي"),
      purchaseDate: new Date(date).toISOString(),
      updatedAt: serverTimestamp(),
    }).catch(e => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: purchaseRef.path, operation: 'update' }))
    });

    // Handle items update using batch
    const batch = writeBatch(db)
    getDocs(collection(purchaseRef, "items")).then(oldItems => {
      oldItems.docs.forEach(d => batch.delete(d.ref))
      addedItems.forEach(item => {
        const iRef = doc(collection(purchaseRef, "items"))
        batch.set(iRef, {
          id: iRef.id, purchaseId, userId: user.uid, fishType: item.fishType, quantity: item.quantity,
          unitPrice: item.pricePerKg, lineTotal: item.lineTotal, paymentType: item.paymentType, paidAmount: item.paidAmount
        })
      })
      // Non-blocking commit
      batch.commit().then(() => {
        toast({ title: "تم التحديث بنجاح" })
        router.back()
      }).catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: purchaseRef.path + "/items", operation: 'write' }))
      }).finally(() => setLoading(false))
    })
  }

  if (fetchingData) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <header className="p-4 flex items-center justify-between border-b bg-white sticky top-0 z-20">
        <button onClick={() => router.back()} className="p-2 -mr-2"><ChevronLeft className="rotate-180" /></button>
        <h1 className="text-lg font-bold">تعديل فاتورة شراء</h1>
        <div className="w-6" />
      </header>

      <main className="p-4 space-y-6">
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-orange-50/50 border-b p-4"><CardTitle className="text-sm font-bold flex items-center gap-2"><ClipboardList className="w-4 h-4" />بيانات التوريد</CardTitle></CardHeader>
          <CardContent className="p-4 space-y-5">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold">الحملة</Label>
              <Select onValueChange={setCampaignId} value={campaignId} dir="rtl">
                <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="اختر الحملة" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {openCampaigns?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold">المورد</Label>
              <Select onValueChange={setSupplierId} value={supplierId} dir="rtl">
                <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="اختر المورد" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {suppliers?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold">التاريخ</Label>
              <Input type="date" className="h-12 rounded-xl text-right" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className={cn("border-2 shadow-md rounded-2xl bg-white", editingId ? "border-accent" : "border-primary/10")}>
           <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2"><Fish className="w-4 h-4" />{editingId ? "تعديل الصنف" : "إضافة صنف جديد"}</CardTitle></CardHeader>
           <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold">نوع السمك</Label>
                <Input placeholder="مثال: هامور" className="h-12 rounded-xl" value={currentItem.fishType} onChange={e => setCurrentItem({...currentItem, fishType: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold">الكمية (كجم)</Label>
                  <Input type="text" inputMode="decimal" className="h-12 rounded-xl" value={formatInputNumber(currentItem.quantity)} onChange={e => handleInputNumberChange('quantity', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold">السعر</Label>
                  <Input type="text" inputMode="decimal" className="h-12 rounded-xl" value={formatInputNumber(currentItem.pricePerKg)} onChange={e => handleInputNumberChange('pricePerKg', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold">طريقة السداد</Label>
                <div className="grid grid-cols-3 gap-2">
                  {["نقد", "دين", "جزئي"].map(t => <button key={t} type="button" onClick={() => setCurrentItem({...currentItem, paymentType: t})} className={cn("py-3 text-[11px] font-bold rounded-xl border", currentItem.paymentType === t ? 'bg-primary text-white' : 'bg-muted/30')}>{t}</button>)}
                </div>
              </div>
              {currentItem.paymentType === "جزئي" && (
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold">المبلغ المدفوع</Label>
                  <Input type="text" inputMode="decimal" className="h-12 rounded-xl" value={formatInputNumber(currentItem.paidAmount)} onChange={e => handleInputNumberChange('paidAmount', e.target.value)} />
                </div>
              )}
              <Button onClick={handleAddItem} className="w-full h-12 rounded-xl font-bold lux-gradient">{editingId ? "تحديث الصنف" : "إضافة للقائمة"}</Button>
           </CardContent>
        </Card>

        <div className="space-y-3">
          <h3 className="text-sm font-black flex items-center gap-2 px-2"><TableIcon className="w-4 h-4 text-primary" />الأصناف الحالية ({addedItems.length})</h3>
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
            <Table dir="rtl">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-right text-[10px]">النوع</TableHead>
                  <TableHead className="text-center text-[10px]">الكمية</TableHead>
                  <TableHead className="text-center text-[10px]">الإجمالي</TableHead>
                  <TableHead className="text-left text-[10px]">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {addedItems.map(item => (
                  <TableRow key={item.tempId}>
                    <TableCell className="text-right text-xs font-bold">{item.fishType}</TableCell>
                    <TableCell className="text-center text-xs">{item.quantity.toLocaleString('en-US')} kg</TableCell>
                    <TableCell className="text-center text-xs font-bold text-orange-600">{item.lineTotal.toLocaleString('en-US')}</TableCell>
                    <TableCell className="text-left">
                      <div className="flex gap-2">
                        <button onClick={() => handleEditItem(item)} className="text-accent"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => handleRemoveItem(item.tempId)} className="text-destructive"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-none shadow-lg rounded-[2rem] bg-primary text-white p-6">
            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
              <span className="text-xs font-bold opacity-80">الإجمالي النهائي</span>
              <span className="text-xl font-black">{grandTotal.toLocaleString('en-US')} ر.ي</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div><span className="text-[10px] block opacity-70">المدفوع</span><span className="font-bold">{totalPaid.toLocaleString('en-US')}</span></div>
              <div className="border-r border-white/10"><span className="text-[10px] block opacity-70">المتبقي</span><span className="font-bold text-orange-400">{totalDue.toLocaleString('en-US')}</span></div>
            </div>
          </Card>
          <Button className="w-full h-14 rounded-2xl text-lg font-black bg-orange-600" onClick={handleUpdate} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <Save className="w-6 h-6" />}تحديث الفاتورة</Button>
        </div>
      </main>
    </div>
  )
}