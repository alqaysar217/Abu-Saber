
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Plus, 
  Trash2, 
  ChevronLeft, 
  Save, 
  Loader2, 
  Table as TableIcon, 
  AlertCircle,
  Ship,
  User,
  Keyboard,
  Sparkles,
  Fish,
  Scale,
  Coins,
  UserPlus,
  Edit3,
  Check,
  Wallet,
  ArrowDownToLine
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AIInvoiceParser } from "@/components/invoice/AIInvoiceParser"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useUser, useMemoFirebase } from "@/firebase"
import { collection, addDoc, serverTimestamp, query, where } from "firebase/firestore"
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
import Link from "next/link"

interface InvoiceItem {
  tempId: string
  fishType: string
  quantity: number
  pricePerKg: number
  total: number
}

export default function NewInvoicePage() {
  const router = useRouter()
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  
  const [useAI, setUseAI] = useState(false)
  const [loading, setLoading] = useState(false)
  const [campaignId, setCampaignId] = useState("")
  const [customerId, setCustomerId] = useState("")
  
  // Item Form State
  const [currentItem, setCurrentItem] = useState({ fishType: "", quantity: "", pricePerKg: "" })
  const [addedItems, setAddedItems] = useState<InvoiceItem[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

  // Payment Form State
  const [paymentType, setPaymentType] = useState("نقد")
  const [paidAmount, setPaidAmount] = useState("")

  const campaignsQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(
      collection(db, "users", user.uid, "campaigns"),
      where("status", "==", "open")
    )
  }, [db, user])

  const { data: openCampaigns } = useCollection(campaignsQuery)
  
  const customersQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "customers"))
  }, [db, user])

  const { data: customers } = useCollection(customersQuery)

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

  const handlePaidAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, "")
    if (rawValue === "" || /^\d*\.?\d*$/.test(rawValue)) {
      setPaidAmount(rawValue)
    }
  }

  const handleAddItem = () => {
    const qty = parseFloat(currentItem.quantity)
    const price = parseFloat(currentItem.pricePerKg)

    if (!currentItem.fishType || isNaN(qty) || isNaN(price) || qty <= 0 || price <= 0) {
      toast({
        variant: "destructive",
        title: "بيانات ناقصة",
        description: "يرجى إدخال نوع السمك والكمية والسعر بشكل صحيح",
      })
      return
    }

    const newItem: InvoiceItem = {
      tempId: editingId || Math.random().toString(36).substr(2, 9),
      fishType: currentItem.fishType,
      quantity: qty,
      pricePerKg: price,
      total: qty * price
    }

    if (editingId) {
      setAddedItems(addedItems.map(item => item.tempId === editingId ? newItem : item))
      setEditingId(null)
    } else {
      setAddedItems([newItem, ...addedItems])
    }

    setCurrentItem({ fishType: "", quantity: "", pricePerKg: "" })
    
    const fishTypeInput = document.getElementById("fish-type-input")
    if (fishTypeInput) fishTypeInput.focus()
  }

  const startEditItem = (item: InvoiceItem) => {
    setEditingId(item.tempId)
    setCurrentItem({
      fishType: item.fishType,
      quantity: item.quantity.toString(),
      pricePerKg: item.pricePerKg.toString()
    })
    window.scrollTo({ top: 150, behavior: 'smooth' })
  }

  const removeItem = (tempId: string) => {
    setAddedItems(addedItems.filter(item => item.tempId !== tempId))
  }

  const grandTotal = addedItems.reduce((acc, item) => acc + item.total, 0)
  const numPaidAmount = paymentType === "نقد" ? grandTotal : (paymentType === "دين" ? 0 : (parseFloat(paidAmount) || 0))
  const remainingAmount = grandTotal - numPaidAmount

  const handleFinalSave = async () => {
    if (!db || !user) return
    if (!campaignId || !customerId || addedItems.length === 0) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى تحديد الحملة والعميل وإضافة صنف واحد على الأقل",
      })
      return
    }

    setLoading(true)
    const invoiceData = {
      campaignId,
      customerId,
      items: addedItems.map(({ tempId, ...rest }) => rest), // Remove tempId before saving
      totalAmount: grandTotal,
      paidAmount: numPaidAmount,
      remainingAmount: remainingAmount,
      paymentType,
      status: remainingAmount <= 0 ? "مدفوعة" : (numPaidAmount <= 0 ? "دين" : "جزئي"),
      invoiceDate: new Date().toISOString(),
      userId: user.uid,
      createdAt: serverTimestamp(),
    }

    addDoc(collection(db, "users", user.uid, "invoices"), invoiceData)
      .then(() => {
        toast({ title: "تم حفظ الفاتورة بنجاح" })
        router.push("/")
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: `users/${user.uid}/invoices`,
          operation: 'create',
          requestResourceData: invoiceData,
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
        <h1 className="text-lg font-bold">إصدار فاتورة مبيعات</h1>
        <div className="w-6" />
      </header>

      <main className="p-4 space-y-6">
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                <Ship className="w-3 h-3 text-primary" />
                الحملة المرتبطة
              </Label>
              <Select onValueChange={setCampaignId} value={campaignId} dir="rtl">
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="اختر الحملة" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {openCampaigns?.map((camp) => (
                    <SelectItem key={camp.id} value={camp.id}>{camp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <Label className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                  <User className="w-3 h-3 text-primary" />
                  العميل (المشتري)
                </Label>
                <Link href="/customers/new">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-primary gap-1 font-bold text-[10px]">
                    <UserPlus className="w-3 h-3" />
                    عميل جديد
                  </Button>
                </Link>
              </div>
              <Select onValueChange={setCustomerId} value={customerId} dir="rtl">
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="اختر العميل" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {customers?.map((cust) => (
                    <SelectItem key={cust.id} value={cust.id}>{cust.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2 p-1.5 bg-secondary/30 rounded-2xl border border-primary/5">
          <button
            onClick={() => setUseAI(false)}
            className={cn(
              "flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2",
              !useAI ? 'lux-gradient text-white shadow-lg' : 'text-muted-foreground hover:bg-white/50'
            )}
          >
            <Keyboard className={cn("w-4 h-4", !useAI ? "text-white" : "text-primary")} />
            إدخال يدوي
          </button>
          <button
            onClick={() => setUseAI(true)}
            className={cn(
              "flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2",
              useAI ? 'lux-gradient text-white shadow-lg' : 'text-muted-foreground hover:bg-white/50'
            )}
          >
            <Sparkles className={cn("w-4 h-4", useAI ? "text-white" : "text-primary")} />
            الذكاء الاصطناعي
          </button>
        </div>

        {!campaignId || !customerId ? (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-2 opacity-50">
            <AlertCircle className="w-10 h-10 text-primary" />
            <p className="text-sm font-medium">يرجى اختيار الحملة والعميل أولاً للبدء</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            {useAI ? (
              <AIInvoiceParser onSave={() => router.push("/")} />
            ) : (
              <div className="space-y-6">
                <Card className={cn("border-2 shadow-md rounded-2xl bg-white", editingId ? "border-accent" : "border-primary/10")}>
                  <CardHeader className={cn("p-4 border-b", editingId ? "bg-accent/5" : "bg-muted/30")}>
                    <CardTitle className={cn("text-sm font-bold flex items-center gap-2", editingId ? "text-accent" : "text-primary")}>
                      {editingId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {editingId ? "تعديل الصنف" : "إضافة صنف للفاتورة"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fish-type-input" className="text-xs font-bold flex items-center gap-2">
                        <Fish className="w-3 h-3 text-primary" />
                        نوع السمك
                      </Label>
                      <Input 
                        id="fish-type-input"
                        placeholder="مثال: تونة، بياض..." 
                        className="h-11 rounded-xl"
                        value={currentItem.fishType}
                        onChange={(e) => setCurrentItem({...currentItem, fishType: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold">الكمية (كجم)</Label>
                        <Input 
                          type="text" 
                          inputMode="decimal"
                          placeholder="0" 
                          className="h-11 rounded-xl tabular-nums"
                          value={formatInputNumber(currentItem.quantity)}
                          onChange={(e) => handleInputNumberChange('quantity', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold">سعر الكيلو (ر.ي)</Label>
                        <Input 
                          type="text" 
                          inputMode="decimal"
                          placeholder="0" 
                          className="h-11 rounded-xl tabular-nums"
                          value={formatInputNumber(currentItem.pricePerKg)}
                          onChange={(e) => handleInputNumberChange('pricePerKg', e.target.value)}
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleAddItem} 
                      className={cn("w-full h-11 rounded-xl font-bold gap-2", editingId ? "bg-accent" : "lux-gradient")}
                    >
                      {editingId ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                      {editingId ? "تحديث الصنف" : "إضافة للفاتورة"}
                    </Button>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <h3 className="text-sm font-black flex items-center gap-2 px-2">
                    <TableIcon className="w-4 h-4 text-primary" />
                    الأصناف المضافة ({addedItems.length})
                  </h3>
                  
                  {addedItems.length > 0 ? (
                    <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                      <Table dir="rtl">
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead className="text-right text-[10px] font-bold">النوع</TableHead>
                            <TableHead className="text-center text-[10px] font-bold">الكمية</TableHead>
                            <TableHead className="text-center text-[10px] font-bold">سعر الكيلو</TableHead>
                            <TableHead className="text-center text-[10px] font-bold">الإجمالي</TableHead>
                            <TableHead className="text-left text-[10px] font-bold">إجراءات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {addedItems.map((item) => (
                            <TableRow key={item.tempId} className="animate-in fade-in slide-in-from-right-1">
                              <TableCell className="text-right text-xs font-bold">{item.fishType}</TableCell>
                              <TableCell className="text-center text-[10px] tabular-nums">{item.quantity.toLocaleString('en-US')} kg</TableCell>
                              <TableCell className="text-center text-[10px] tabular-nums">{item.pricePerKg.toLocaleString('en-US')}</TableCell>
                              <TableCell className="text-center text-xs font-black text-primary tabular-nums">{item.total.toLocaleString('en-US')}</TableCell>
                              <TableCell className="text-left p-2">
                                <div className="flex items-center gap-1">
                                  <button 
                                    onClick={() => startEditItem(item)} 
                                    className="p-1.5 text-accent hover:bg-accent/10 rounded-full transition-colors"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => removeItem(item.tempId)} 
                                    className="p-1.5 text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Card>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground text-xs border-2 border-dashed rounded-[2rem]">
                      لم يتم إضافة أي أصناف بعد
                    </div>
                  )}
                </div>

                {addedItems.length > 0 && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <Card className="border-none shadow-md rounded-[2rem] bg-white overflow-hidden">
                      <CardHeader className="p-4 bg-secondary/20 border-b">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-primary" />
                          طريقة التحصيل المالي
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-5 space-y-5">
                        <div className="grid grid-cols-3 gap-2">
                          {["نقد", "دين", "جزئي"].map((t) => (
                            <button
                              key={t}
                              onClick={() => setPaymentType(t)}
                              className={cn(
                                "py-3 text-[11px] font-bold rounded-xl border transition-all",
                                paymentType === t ? "bg-primary text-white border-primary shadow-md" : "bg-muted/30 text-muted-foreground"
                              )}
                            >
                              {t}
                            </button>
                          ))}
                        </div>

                        {paymentType === "جزئي" && (
                          <div className="space-y-4 p-4 bg-muted/20 rounded-2xl border border-dashed animate-in slide-in-from-top-2">
                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-accent">المبلغ المستلم الآن</Label>
                              <Input 
                                type="text" 
                                inputMode="decimal"
                                placeholder="0" 
                                className="h-12 rounded-xl border-accent/30 text-accent font-black text-lg tabular-nums"
                                value={formatInputNumber(paidAmount)}
                                onChange={handlePaidAmountChange}
                              />
                            </div>
                            <div className="flex justify-between items-center p-3 bg-white rounded-xl border shadow-sm">
                              <span className="text-xs font-bold text-muted-foreground">المتبقي (دين على العميل):</span>
                              <span className="text-lg font-black text-destructive tabular-nums">{(grandTotal - (parseFloat(paidAmount) || 0)).toLocaleString('en-US')} ر.ي</span>
                            </div>
                          </div>
                        )}

                        <div className="p-5 bg-primary rounded-2xl text-white shadow-inner space-y-3">
                          <div className="flex justify-between items-center opacity-80">
                            <span className="text-xs font-bold">إجمالي قيمة الفاتورة</span>
                            <span className="text-sm font-bold tabular-nums">{grandTotal.toLocaleString('en-US')} ر.ي</span>
                          </div>
                          <div className="flex justify-between items-center border-t border-white/10 pt-3">
                            <span className="text-sm font-black">المطلوب سداده الآن</span>
                            <span className="text-xl font-black tabular-nums">{numPaidAmount.toLocaleString('en-US')} ر.ي</span>
                          </div>
                          {remainingAmount > 0 && (
                             <div className="flex justify-between items-center bg-white/10 p-2 rounded-xl mt-2">
                               <span className="text-[10px] font-bold flex items-center gap-1">
                                 <ArrowDownToLine className="w-3 h-3" />
                                 سيتم تسجيل دين بمبلغ:
                               </span>
                               <span className="text-sm font-black tabular-nums">{remainingAmount.toLocaleString('en-US')} ر.ي</span>
                             </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Button 
                      className="w-full h-14 rounded-2xl text-lg font-black shadow-xl gap-2 lux-gradient" 
                      onClick={handleFinalSave}
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                      حفظ وإصدار الفاتورة النهائية
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
