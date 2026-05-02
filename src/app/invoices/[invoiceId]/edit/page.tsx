
"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Save, 
  Loader2, 
  Table as TableIcon, 
  AlertCircle,
  Ship,
  User,
  Fish,
  Scale,
  Coins,
  Edit3,
  Check,
  Wallet,
  Trash2,
  Plus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useUser, useMemoFirebase, useDoc } from "@/firebase"
import { doc, updateDoc, serverTimestamp, query, collection, where } from "firebase/firestore"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface InvoiceItem {
  tempId: string
  fishType: string
  quantity: number
  pricePerKg: number
  total: number
}

export default function EditInvoicePage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const router = useRouter()
  const { invoiceId } = use(params)
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  const [saving, setSaving] = useState(false)

  const invoiceRef = useMemoFirebase(() => {
    if (!db || !user || !invoiceId) return null
    return doc(db, "users", user.uid, "invoices", invoiceId)
  }, [db, user, invoiceId])

  const { data: invoice, isLoading: loadingInvoice } = useDoc(invoiceRef)

  const campaignsQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "campaigns"), where("status", "==", "open"))
  }, [db, user])

  const { data: openCampaigns } = useCollection(campaignsQuery)
  
  const customersQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "customers"))
  }, [db, user])

  const { data: customers } = useCollection(customersQuery)

  const [campaignId, setCampaignId] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [date, setDate] = useState("")
  const [addedItems, setAddedItems] = useState<InvoiceItem[]>([])
  const [paymentType, setPaymentType] = useState("نقد")
  const [paidAmount, setPaidAmount] = useState("")
  const [currentItem, setCurrentItem] = useState({ fishType: "", quantity: "", pricePerKg: "" })
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  useEffect(() => {
    if (invoice) {
      setCampaignId(invoice.campaignId || "")
      setCustomerId(invoice.customerId || "")
      setPaymentType(invoice.paymentType || "نقد")
      setPaidAmount(invoice.paidAmount?.toString() || "")
      
      // Prepopulate date correctly
      const savedDate = invoice.invoiceDate || invoice.date;
      if (savedDate) {
        try {
          const d = new Date(savedDate)
          if (!isNaN(d.getTime())) {
            setDate(d.toISOString().split('T')[0])
          }
        } catch (e) {
          console.error("Invalid date", e)
        }
      }

      if (invoice.items) {
        setAddedItems(invoice.items.map((item: any) => ({
          ...item,
          tempId: Math.random().toString(36).substr(2, 9),
          total: (item.quantity || 0) * (item.pricePerKg || 0)
        })))
      }
    }
  }, [invoice])

  const formatInputNumber = (val: string) => {
    if (!val) return ""
    const parts = val.split('.')
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    return parts.join('.')
  }

  const handleAddItem = () => {
    const qty = parseFloat(currentItem.quantity)
    const price = parseFloat(currentItem.pricePerKg)

    if (!currentItem.fishType || isNaN(qty) || isNaN(price)) return

    const newItem: InvoiceItem = {
      tempId: editingItemId || Math.random().toString(36).substr(2, 9),
      fishType: currentItem.fishType,
      quantity: qty,
      pricePerKg: price,
      total: qty * price
    }

    if (editingItemId) {
      setAddedItems(addedItems.map(item => item.tempId === editingItemId ? newItem : item))
      setEditingItemId(null)
    } else {
      setAddedItems([...addedItems, newItem])
    }
    setCurrentItem({ fishType: "", quantity: "", pricePerKg: "" })
  }

  const grandTotal = addedItems.reduce((acc, item) => acc + item.total, 0)
  const numPaidAmount = paymentType === "نقد" ? grandTotal : (paymentType === "دين" ? 0 : (parseFloat(paidAmount) || 0))
  const remainingAmount = grandTotal - numPaidAmount

  const handleUpdate = async () => {
    if (!invoiceRef || !user || !date) {
      toast({ variant: "destructive", title: "يرجى إكمال البيانات المطلوبة" })
      return
    }

    const parsedDate = new Date(date)
    if (isNaN(parsedDate.getTime())) {
      toast({ variant: "destructive", title: "تاريخ غير صالح" })
      return
    }

    setSaving(true)

    const updateData = {
      campaignId,
      customerId,
      invoiceDate: parsedDate.toISOString(),
      items: addedItems.map(({ tempId, total, ...rest }) => rest),
      totalAmount: grandTotal,
      paidAmount: numPaidAmount,
      remainingAmount: remainingAmount,
      paymentType,
      status: remainingAmount <= 0 ? "مدفوعة" : (numPaidAmount <= 0 ? "دين" : "جزئي"),
      updatedAt: serverTimestamp(),
    }

    updateDoc(invoiceRef, updateData)
      .then(() => {
        toast({ title: "تم التحديث بنجاح" })
        router.back()
      })
      .catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: invoiceRef.path,
          operation: 'update',
          requestResourceData: updateData
        }))
      })
      .finally(() => setSaving(false))
  }

  if (loadingInvoice) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-primary" /></div>

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <header className="p-4 flex items-center justify-between border-b bg-white sticky top-0 z-20 shadow-sm">
        <button onClick={() => router.back()} className="p-2 -mr-2"><ChevronLeft className="rotate-180" /></button>
        <h1 className="text-lg font-bold">تعديل فاتورة مبيعات</h1>
        <div className="w-6" />
      </header>

      <main className="p-4 space-y-6">
        <Card className="border-none shadow-sm rounded-2xl bg-white">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground">الحملة</Label>
              <Select onValueChange={setCampaignId} value={campaignId} dir="rtl">
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="اختر الحملة" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {openCampaigns?.map((camp) => <SelectItem key={camp.id} value={camp.id}>{camp.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground">العميل</Label>
              <Select onValueChange={setCustomerId} value={customerId} dir="rtl">
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {customers?.map((cust) => <SelectItem key={cust.id} value={cust.id}>{cust.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground">التاريخ</Label>
              <Input type="date" className="h-11 rounded-xl text-right" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className={cn("border-2 shadow-md rounded-2xl bg-white", editingItemId ? "border-accent" : "border-primary/10")}>
          <CardHeader className="p-4 border-b bg-muted/30">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              {editingItemId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editingItemId ? "تعديل الصنف" : "إضافة صنف"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold">نوع السمك</Label>
              <Input value={currentItem.fishType} onChange={e => setCurrentItem({...currentItem, fishType: e.target.value})} className="h-11 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold">الكمية (كجم)</Label>
                <Input type="text" inputMode="decimal" value={formatInputNumber(currentItem.quantity)} onChange={e => setCurrentItem({...currentItem, quantity: e.target.value.replace(/,/g, "")})} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold">سعر الكيلو</Label>
                <Input type="text" inputMode="decimal" value={formatInputNumber(currentItem.pricePerKg)} onChange={e => setCurrentItem({...currentItem, pricePerKg: e.target.value.replace(/,/g, "")})} className="h-11 rounded-xl" />
              </div>
            </div>
            <Button onClick={handleAddItem} className={cn("w-full h-11 rounded-xl font-bold gap-2", editingItemId ? "bg-accent" : "lux-gradient")}>
              {editingItemId ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {editingItemId ? "تحديث" : "إضافة"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h3 className="text-sm font-black flex items-center gap-2 px-2"><TableIcon className="w-4 h-4 text-primary" />الأصناف ({addedItems.length})</h3>
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
            <Table dir="rtl">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-right text-[10px] font-bold">النوع</TableHead>
                  <TableHead className="text-center text-[10px] font-bold">الكمية</TableHead>
                  <TableHead className="text-center text-[10px] font-bold">السعر</TableHead>
                  <TableHead className="text-center text-[10px] font-bold">الإجمالي</TableHead>
                  <TableHead className="text-left text-[10px] font-bold">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {addedItems.map((item) => (
                  <TableRow key={item.tempId}>
                    <TableCell className="text-right text-xs font-bold">{item.fishType}</TableCell>
                    <TableCell className="text-center text-[10px] tabular-nums">{item.quantity} kg</TableCell>
                    <TableCell className="text-center text-[10px] tabular-nums">{item.pricePerKg}</TableCell>
                    <TableCell className="text-center text-xs font-black text-primary tabular-nums">{item.total.toLocaleString()}</TableCell>
                    <TableCell className="text-left p-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditingItemId(item.tempId); setCurrentItem({ fishType: item.fishType, quantity: item.quantity.toString(), pricePerKg: item.pricePerKg.toString() }) }} className="text-accent"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setAddedItems(addedItems.filter(i => i.tempId !== item.tempId))} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>

        <Card className="border-none shadow-md rounded-[2rem] bg-white overflow-hidden">
          <CardHeader className="p-4 bg-secondary/20 border-b"><CardTitle className="text-sm font-bold flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" />طريقة التحصيل المالي</CardTitle></CardHeader>
          <CardContent className="p-5 space-y-5">
            <div className="grid grid-cols-3 gap-2">
              {["نقد", "دين", "جزئي"].map((t) => (
                <button key={t} onClick={() => setPaymentType(t)} className={cn("py-3 text-[11px] font-bold rounded-xl border transition-all", paymentType === t ? "bg-primary text-white border-primary shadow-md" : "bg-muted/30 text-muted-foreground")}>{t}</button>
              ))}
            </div>
            {paymentType === "جزئي" && (
              <div className="space-y-4 p-4 bg-muted/20 rounded-2xl border border-dashed animate-in slide-in-from-top-2">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-accent">المبلغ المستلم الآن</Label>
                  <Input type="text" inputMode="decimal" value={formatInputNumber(paidAmount)} onChange={e => setPaidAmount(e.target.value.replace(/,/g, ""))} className="h-12 rounded-xl text-accent font-black text-lg tabular-nums" />
                </div>
                <div className="flex justify-between items-center p-3 bg-white rounded-xl border shadow-sm">
                  <span className="text-xs font-bold text-muted-foreground">المتبقي (دين على العميل):</span>
                  <span className="text-lg font-black text-destructive tabular-nums">{remainingAmount.toLocaleString()} ر.ي</span>
                </div>
              </div>
            )}
            <div className="p-5 bg-primary rounded-2xl text-white shadow-inner space-y-3">
              <div className="flex justify-between items-center opacity-80"><span className="text-xs font-bold">إجمالي الفاتورة</span><span className="text-sm font-bold tabular-nums">{grandTotal.toLocaleString()} ر.ي</span></div>
              <div className="flex justify-between items-center border-t border-white/10 pt-3"><span className="text-sm font-black">المستلم الآن</span><span className="text-xl font-black tabular-nums">{numPaidAmount.toLocaleString()} ر.ي</span></div>
            </div>
          </CardContent>
        </Card>

        <Button className="w-full h-14 rounded-2xl text-lg font-black shadow-xl gap-2 lux-gradient" onClick={handleUpdate} disabled={saving}>
          {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
          تحديث الفاتورة النهائية
        </Button>
      </main>
    </div>
  )
}
