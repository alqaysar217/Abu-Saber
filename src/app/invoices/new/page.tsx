
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, ChevronLeft, Save, Loader2, Table as TableIcon, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { AIInvoiceParser } from "@/components/invoice/AIInvoiceParser"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from "@/firebase"
import { collection, addDoc, serverTimestamp, query, where } from "firebase/firestore"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'

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
  
  const [useAI, setUseAI] = useState(false)
  const [loading, setLoading] = useState(false)
  const [campaignId, setCampaignId] = useState("")
  const [customerId, setCustomerId] = useState("")
  
  // States for fast entry
  const [currentItem, setCurrentItem] = useState({ fishType: "", quantity: "", pricePerKg: "" })
  const [addedItems, setAddedItems] = useState<InvoiceItem[]>([])

  // Fetch open campaigns and customers (using suppliers for now as customers if not defined)
  const campaignsQuery = db ? query(collection(db, "campaigns"), where("status", "==", "open")) : null
  const { data: openCampaigns } = useCollection(campaignsQuery)
  
  const { data: suppliers } = useCollection(db ? collection(db, "suppliers") : null)

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
    setCurrentItem({ fishType: "", quantity: "", pricePerKg: "" }) // Reset for next entry
    
    // Auto-focus back to fish type (UX enhancement)
    const fishTypeInput = document.getElementById("fish-type-input")
    if (fishTypeInput) fishTypeInput.focus()
  }

  const removeItem = (idx: number) => {
    setAddedItems(addedItems.filter((_, i) => i !== idx))
  }

  const grandTotal = addedItems.reduce((acc, item) => acc + item.total, 0)

  const handleFinalSave = async () => {
    if (!db) return
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
      date: new Date().toISOString(),
      createdAt: serverTimestamp(),
      type: "sale"
    }

    addDoc(collection(db, "purchases"), invoiceData) // Reusing purchases or a dedicated 'sales' collection
      .then(() => {
        toast({ title: "تم حفظ الفاتورة بنجاح" })
        router.push("/")
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: 'purchases',
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
        {/* Step 1: Selection */}
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground">الحملة المرتبطة</Label>
              <Select onValueChange={setCampaignId} value={campaignId}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="اختر الحملة" />
                </SelectTrigger>
                <SelectContent>
                  {openCampaigns?.map((camp) => (
                    <SelectItem key={camp.id} value={camp.id}>{camp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground">العميل / المشتري</Label>
              <Select onValueChange={setCustomerId} value={customerId}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="اختر العميل" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers?.map((sup) => (
                    <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Mode Toggle */}
        <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-xl">
          <button
            onClick={() => setUseAI(false)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${!useAI ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
          >
            إدخال يدوي سريع
          </button>
          <button
            onClick={() => setUseAI(true)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${useAI ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
          >
            مسح بالذكاء الاصطناعي
          </button>
        </div>

        {!campaignId || !customerId ? (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-2 opacity-50">
            <AlertCircle className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm font-medium">يرجى اختيار الحملة والعميل أولاً للبدء</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            {useAI ? (
              <AIInvoiceParser onSave={() => router.push("/")} />
            ) : (
              <div className="space-y-6">
                {/* Fast Entry Inputs */}
                <Card className="border-2 border-primary/10 shadow-md rounded-2xl bg-white sticky top-20 z-10">
                  <CardContent className="p-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fish-type-input" className="text-xs font-bold">نوع السمك</lebel>
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
                        <Label className="text-[10px] font-bold">الكمية (كجم)</Label>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          className="h-11 rounded-xl border-primary/20"
                          value={currentItem.quantity}
                          onChange={(e) => setCurrentItem({...currentItem, quantity: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold">سعر الكيلو (ر.ي)</Label>
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
                      className="w-full h-12 rounded-xl bg-primary text-white font-bold gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      إضافة للفاتورة
                    </Button>
                  </CardContent>
                </Card>

                {/* List of Added Items */}
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

                {/* Final Actions */}
                {addedItems.length > 0 && (
                  <div className="pt-4 sticky bottom-4">
                    <Button 
                      className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl gap-2" 
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
