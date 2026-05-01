
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
  Coins
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { AIInvoiceParser } from "@/components/invoice/AIInvoiceParser"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useUser, useMemoFirebase } from "@/firebase"
import { collection, addDoc, serverTimestamp, query, where } from "firebase/firestore"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { cn } from "@/lib/utils"

interface InvoiceItem {
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
  
  const [currentItem, setCurrentItem] = useState({ fishType: "", quantity: "", pricePerKg: "" })
  const [addedItems, setAddedItems] = useState<InvoiceItem[]>([])

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
    return query(collection(db, "users", user.uid, "suppliers"))
  }, [db, user])

  const { data: customers } = useCollection(customersQuery)

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
      fishType: currentItem.fishType,
      quantity: qty,
      pricePerKg: price,
      total: qty * price
    }

    setAddedItems([newItem, ...addedItems])
    setCurrentItem({ fishType: "", quantity: "", pricePerKg: "" })
    
    const fishTypeInput = document.getElementById("fish-type-input")
    if (fishTypeInput) fishTypeInput.focus()
  }

  const removeItem = (idx: number) => {
    setAddedItems(addedItems.filter((_, i) => i !== idx))
  }

  const grandTotal = addedItems.reduce((acc, item) => acc + item.total, 0)

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
      items: addedItems,
      totalAmount: grandTotal,
      paidAmount: 0,
      paymentType: "نقد",
      status: "دين",
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
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <header className="p-4 flex items-center justify-between border-b bg-white sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 -mr-2">
          <ChevronLeft className="w-6 h-6 rotate-180" />
        </button>
        <h1 className="text-lg font-bold">فاتورة مبيعات</h1>
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
              <Label className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                <User className="w-3 h-3 text-primary" />
                العميل / المشتري
              </Label>
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
            إدخال يدوي سريع
          </button>
          <button
            onClick={() => setUseAI(true)}
            className={cn(
              "flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2",
              useAI ? 'lux-gradient text-white shadow-lg' : 'text-muted-foreground hover:bg-white/50'
            )}
          >
            <Sparkles className={cn("w-4 h-4", useAI ? "text-white" : "text-primary")} />
            مسح بالذكاء الاصطناعي
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
                <Card className="border-2 border-primary/10 shadow-md rounded-2xl bg-white sticky top-20 z-10">
                  <CardContent className="p-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fish-type-input" className="text-xs font-bold flex items-center gap-2">
                        <Fish className="w-3 h-3 text-primary" />
                        نوع السمك
                      </Label>
                      <Input 
                        id="fish-type-input"
                        placeholder="مثال: تونة، بياض..." 
                        className="h-11 rounded-xl border-primary/20"
                        value={currentItem.fishType}
                        onChange={(e) => setCurrentItem({...currentItem, fishType: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold flex items-center gap-2">
                          <Scale className="w-3 h-3 text-primary" />
                          الكمية (كجم)
                        </Label>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          className="h-11 rounded-xl border-primary/20"
                          value={currentItem.quantity}
                          onChange={(e) => setCurrentItem({...currentItem, quantity: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold flex items-center gap-2">
                          <Coins className="w-3 h-3 text-primary" />
                          سعر الكيلو (ر.ي)
                        </Label>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          className="h-11 rounded-xl border-primary/20"
                          value={currentItem.pricePerKg}
                          onChange={(e) => setCurrentItem({...currentItem, pricePerKg: e.target.value})}
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleAddItem} 
                      className="w-full h-12 rounded-xl lux-gradient text-white font-bold gap-2 shadow-lg"
                    >
                      <Plus className="w-5 h-5" />
                      إضافة للفاتورة
                    </Button>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <TableIcon className="w-4 h-4 text-primary" />
                      الأصناف المضافة ({addedItems.length})
                    </h3>
                    {addedItems.length > 0 && (
                      <span className="text-xs font-bold text-primary tabular-nums">الإجمالي: {grandTotal.toLocaleString()} ر.ي</span>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {addedItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-border/50 shadow-sm animate-in slide-in-from-right-2">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">{item.fishType}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {item.quantity} كجم × {item.pricePerKg.toLocaleString()} ر.ي
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-black tabular-nums">{item.total.toLocaleString()} ر.ي</span>
                          <button onClick={() => removeItem(idx)} className="text-destructive p-2 hover:bg-destructive/10 rounded-full transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {addedItems.length === 0 && (
                      <div className="text-center py-10 text-muted-foreground text-xs border-2 border-dashed rounded-2xl">
                        لم يتم إضافة أي أصناف بعد
                      </div>
                    )}
                  </div>
                </div>

                {addedItems.length > 0 && (
                  <div className="pt-4 sticky bottom-4">
                    <Button 
                      className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl gap-2 lux-gradient" 
                      onClick={handleFinalSave}
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                      حفظ وإصدار الفاتورة ({grandTotal.toLocaleString()} ر.ي)
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
