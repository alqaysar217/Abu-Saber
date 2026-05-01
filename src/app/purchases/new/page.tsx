
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Save, 
  Loader2, 
  Calendar as CalendarIcon, 
  UserPlus, 
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
  CreditCard,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useUser, useMemoFirebase } from "@/firebase"
import { collection, doc, setDoc, serverTimestamp, query, where } from "firebase/firestore"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { cn } from "@/lib/utils"

interface PurchaseItem {
  fishType: string
  quantity: number
  pricePerKg: number
  lineTotal: number
}

export default function NewPurchasePage() {
  const router = useRouter()
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  const [loading, setLoading] = useState(false)

  // Header State
  const [campaignId, setCampaignId] = useState("")
  const [supplierId, setSupplierId] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  // Items List State
  const [currentItem, setCurrentItem] = useState({ fishType: "", quantity: "", pricePerKg: "" })
  const [addedItems, setAddedItems] = useState<PurchaseItem[]>([])

  // Payment State
  const [paymentType, setPaymentType] = useState("نقد") // نقد, دين, جزئي
  const [paidAmount, setPaidAmount] = useState("")

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

  const { data: suppliers, isLoading: loadingSuppliers } = useCollection(suppliersQuery)

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

    const newItem: PurchaseItem = {
      fishType: currentItem.fishType,
      quantity: qty,
      pricePerKg: price,
      lineTotal: qty * price
    }

    setAddedItems([newItem, ...addedItems])
    setCurrentItem({ fishType: "", quantity: "", pricePerKg: "" })
    
    // Focus back to fish type input for faster entry
    const fishInput = document.getElementById("fish-type-input")
    if (fishInput) fishInput.focus()
  }

  const removeItem = (idx: number) => {
    setAddedItems(addedItems.filter((_, i) => i !== idx))
  }

  const grandTotal = addedItems.reduce((acc, item) => acc + item.lineTotal, 0)

  const handleSave = async () => {
    if (!db || !user) return
    if (!campaignId || !supplierId || addedItems.length === 0) {
      toast({
        variant: "destructive",
        title: "خطأ في الإدخال",
        description: "يرجى تحديد الحملة والمورد وإضافة صنف واحد على الأقل",
      })
      return
    }

    // Validation for partial payment
    const partialAmount = parseFloat(paidAmount) || 0
    if (paymentType === "جزئي" && (partialAmount <= 0 || partialAmount >= grandTotal)) {
      toast({
        variant: "destructive",
        title: "خطأ في المبلغ",
        description: "في حالة الدفع الجزئي، يجب أن يكون المبلغ المدفوع أكبر من صفر وأقل من الإجمالي",
      })
      return
    }

    setLoading(true)

    // Calculate paid amount and status
    let finalPaidAmount = 0
    let status = "دين"

    if (paymentType === "نقد") {
      finalPaidAmount = grandTotal
      status = "مدفوعة"
    } else if (paymentType === "جزئي") {
      finalPaidAmount = partialAmount
      status = "جزئي"
    } else {
      finalPaidAmount = 0
      status = "دين"
    }

    const purchaseRef = doc(collection(db, "users", user.uid, "purchases"))
    
    const purchaseData = {
      id: purchaseRef.id,
      campaignId,
      supplierId,
      totalAmount: grandTotal,
      paidAmount: finalPaidAmount,
      paymentType,
      status,
      purchaseDate: new Date(date).toISOString(),
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    // 1. Save main Purchase doc
    setDoc(purchaseRef, purchaseData)
      .then(() => {
        // 2. Save items into subcollection
        addedItems.forEach((item) => {
          const itemRef = doc(collection(purchaseRef, "items"))
          const itemData = {
            id: itemRef.id,
            purchaseId: purchaseRef.id,
            userId: user.uid,
            ...item
          }
          setDoc(itemRef, itemData).catch(err => {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: itemRef.path,
                operation: 'create',
                requestResourceData: itemData
             }))
          })
        })

        toast({
          title: "تم بنجاح",
          description: "تم تسجيل عملية الشراء بنجاح",
        })
        router.push("/")
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: purchaseRef.path,
          operation: 'create',
          requestResourceData: purchaseData,
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
        <h1 className="text-lg font-bold">تسجيل شراء أسماك (متعدد)</h1>
        <div className="w-6" />
      </header>

      <main className="p-4 space-y-6">
        {/* Section 1: Campaign & Supplier */}
        <Card className="border-none shadow-xl rounded-[1.5rem] overflow-hidden">
          <CardHeader className="bg-orange-50 border-b border-orange-100">
            <CardTitle className="text-md font-bold text-orange-700 flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              بيانات التوريد الأساسية
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                <Ship className="w-3 h-3 text-primary" />
                الحملة المرتبطة <span className="text-destructive">*</span>
              </Label>
              <Select onValueChange={setCampaignId} value={campaignId} dir="rtl">
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder={loadingCampaigns ? "جاري التحميل..." : "اختر الحملة"} />
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
                المورد <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select onValueChange={setSupplierId} value={supplierId} dir="rtl">
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder={loadingSuppliers ? "جاري التحميل..." : "اختر المورد"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {suppliers?.map((sup) => (
                        <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="h-11 w-11 p-0 rounded-xl"
                  onClick={() => router.push("/suppliers/new")}
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                <CalendarIcon className="w-3 h-3 text-primary" />
                تاريخ الشراء
              </Label>
              <div className="relative">
                <Input 
                  type="date" 
                  className="h-11 rounded-xl text-right pr-10" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Item Entry */}
        <Card className="border-2 border-primary/10 shadow-md rounded-2xl bg-white">
           <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                <Fish className="w-4 h-4" />
                إضافة صنف سمك جديد
              </CardTitle>
           </CardHeader>
           <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fish-type-input" className="text-[10px] font-bold">نوع السمك</Label>
                <Input 
                  id="fish-type-input"
                  placeholder="مثال: بياض، هامور، صابات..." 
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
                    onChange={(e) => setQuantity(e.target.value)}
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
                    onChange={(e) => setPricePerKg(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                onClick={handleAddItem} 
                className="w-full h-12 rounded-xl lux-gradient text-white font-bold gap-2 shadow-lg"
              >
                <Plus className="w-5 h-5" />
                إضافة للقائمة
              </Button>
           </CardContent>
        </Card>

        {/* Section 3: Added Items List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-primary" />
              الأصناف المشتراة ({addedItems.length})
            </h3>
            {addedItems.length > 0 && (
              <span className="text-xs font-bold text-orange-600 tabular-nums">الإجمالي: {grandTotal.toLocaleString()} ر.ي</span>
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
                  <span className="text-sm font-black tabular-nums">{item.lineTotal.toLocaleString()} ر.ي</span>
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

        {/* Section 4: Payment Options */}
        {addedItems.length > 0 && (
          <Card className="border-none shadow-md rounded-[1.5rem] bg-secondary/10">
            <CardHeader className="p-4 pb-2">
               <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                  <Wallet className="w-4 h-4" />
                  طريقة السداد
               </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {["نقد", "دين", "جزئي"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setPaymentType(type)}
                    className={cn(
                      "py-3 text-xs font-bold rounded-xl border transition-all",
                      paymentType === type 
                        ? 'bg-primary text-white border-primary shadow-md' 
                        : 'bg-white text-muted-foreground border-border'
                    )}
                  >
                    {type === "نقد" && "نقد كاش"}
                    {type === "دين" && "على الحساب"}
                    {type === "جزئي" && "دفع جزئي"}
                  </button>
                ))}
              </div>

              {paymentType === "جزئي" && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <Label htmlFor="paid-amount" className="text-xs font-bold flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-primary" />
                    المبلغ المدفوع الآن (ر.ي)
                  </Label>
                  <Input 
                    id="paid-amount"
                    type="number" 
                    placeholder="0.00" 
                    className="h-11 rounded-xl border-primary/30 text-lg font-black text-primary"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground bg-white p-2 rounded-lg border border-dashed flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    سيتم تسجيل باقي المبلغ ({ (grandTotal - (parseFloat(paidAmount) || 0)).toLocaleString() } ر.ي) كدين للمورد.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer Save Button */}
        {addedItems.length > 0 && (
          <div className="pt-4 sticky bottom-4">
            <Button 
              className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl gap-2 bg-orange-600 hover:bg-orange-700" 
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
              حفظ عملية الشراء ({grandTotal.toLocaleString()} ر.ي)
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
