
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
  X
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

  // Header State
  const [campaignId, setCampaignId] = useState("")
  const [supplierId, setSupplierId] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  // Items List State
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

  const { data: openCampaigns, isLoading: loadingCampaigns } = useCollection(campaignsQuery)

  const suppliersQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "suppliers"))
  }, [db, user])

  const { data: suppliers, isLoading: loadingSuppliers } = useCollection(suppliersQuery)

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

    if (currentItem.paymentType === "جزئي" && (paid <= 0 || paid >= lineTotal)) {
      toast({
        variant: "destructive",
        title: "خطأ في السداد",
        description: "في الدفع الجزئي، يجب أن يكون المبلغ المدفوع أكبر من 0 وأقل من الإجمالي",
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
      toast({ title: "تم تحديث الصنف" })
    } else {
      setAddedItems([newItem, ...addedItems])
      toast({ title: "تم إضافة الصنف للقائمة" })
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
    toast({ title: "تم حذف الصنف من القائمة" })
  }

  const grandTotal = addedItems.reduce((acc, item) => acc + item.lineTotal, 0)
  const totalPaid = addedItems.reduce((acc, item) => acc + item.paidAmount, 0)
  const totalDue = grandTotal - totalPaid

  const handleFinalSave = async () => {
    if (!db || !user) return
    if (!campaignId || !supplierId || addedItems.length === 0) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى إكمال بيانات الحملة والمورد والأصناف",
      })
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
          const itemData = {
            id: itemRef.id,
            purchaseId: purchaseRef.id,
            userId: user.uid,
            fishType: item.fishType,
            quantity: item.quantity,
            unitPrice: item.pricePerKg,
            lineTotal: item.lineTotal,
            paymentType: item.paymentType,
            paidAmount: item.paidAmount
          }
          setDoc(itemRef, itemData).catch(err => {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: itemRef.path,
                operation: 'create',
                requestResourceData: itemData
             }))
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
        {/* Section 1: Campaign & Supplier */}
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-orange-50/50 border-b border-orange-100 p-4">
            <CardTitle className="text-sm font-bold text-orange-800 flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              بيانات التوريد الأساسية
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground">الحملة المرتبطة *</Label>
                <Select onValueChange={setCampaignId} value={campaignId} dir="rtl">
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="اختر" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {openCampaigns?.map((camp) => (
                      <SelectItem key={camp.id} value={camp.id}>{camp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground">المورد *</Label>
                <Select onValueChange={setSupplierId} value={supplierId} dir="rtl">
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="اختر" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {suppliers?.map((sup) => (
                      <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground">تاريخ الشراء</Label>
              <Input type="date" className="h-10 rounded-xl text-right" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Item Entry Form */}
        <Card className={cn(
          "border-2 shadow-md rounded-2xl transition-colors duration-300 bg-white",
          editingId ? "border-accent" : "border-primary/10"
        )}>
           <CardHeader className="p-4 pb-2">
              <CardTitle className={cn(
                "text-sm font-bold flex items-center gap-2",
                editingId ? "text-accent" : "text-primary"
              )}>
                {editingId ? <Edit3 className="w-4 h-4" /> : <Fish className="w-4 h-4" />}
                {editingId ? "تعديل الصنف الحالي" : "إضافة صنف سمك جديد"}
              </CardTitle>
           </CardHeader>
           <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fish-type-input" className="text-[10px] font-bold">نوع السمك</Label>
                <Input 
                  id="fish-type-input"
                  placeholder="مثال: هامور، صابات..." 
                  className="h-11 rounded-xl"
                  value={currentItem.fishType}
                  onChange={(e) => setCurrentItem({...currentItem, fishType: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold">الكمية (كجم)</Label>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    className="h-11 rounded-xl"
                    value={currentItem.quantity}
                    onChange={(e) => setCurrentItem({...currentItem, quantity: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold">سعر الكيلو (ر.ي)</Label>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    className="h-11 rounded-xl"
                    value={currentItem.pricePerKg}
                    onChange={(e) => setCurrentItem({...currentItem, pricePerKg: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold">طريقة السداد لهذا الصنف</Label>
                <div className="grid grid-cols-3 gap-2">
                  {["نقد", "دين", "جزئي"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setCurrentItem({...currentItem, paymentType: type})}
                      className={cn(
                        "py-2.5 text-[11px] font-bold rounded-xl border transition-all",
                        currentItem.paymentType === type 
                          ? 'bg-primary text-white border-primary shadow-sm' 
                          : 'bg-muted/30 text-muted-foreground border-border'
                      )}
                    >
                      {type === "نقد" ? "نقد كاش" : (type === "دين" ? "على الحساب" : "دفع جزئي")}
                    </button>
                  ))}
                </div>
              </div>

              {currentItem.paymentType === "جزئي" && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <Label className="text-[10px] font-bold text-accent">المبلغ المسدد لهذا الصنف (ر.ي)</Label>
                  <Input 
                    type="number" 
                    placeholder="أدخل المبلغ المسدد..." 
                    className="h-11 rounded-xl border-accent/30 text-accent font-black"
                    value={currentItem.paidAmount}
                    onChange={(e) => setCurrentItem({...currentItem, paidAmount: e.target.value})}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={handleAddItem} 
                  className={cn(
                    "flex-1 h-12 rounded-xl font-bold gap-2 shadow-lg",
                    editingId ? "bg-accent hover:bg-accent/90" : "lux-gradient"
                  )}
                >
                  {editingId ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  {editingId ? "حفظ التعديلات" : "إضافة للقائمة"}
                </Button>
                {editingId && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setEditingId(null)
                      setCurrentItem({ fishType: "", quantity: "", pricePerKg: "", paymentType: "نقد", paidAmount: "" })
                    }}
                    className="h-12 w-12 rounded-xl"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </Button>
                )}
              </div>
           </CardContent>
        </Card>

        {/* Section 3: Added Items List (Table-like for Mobile) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-black flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-primary" />
              الأصناف المشتراة ({addedItems.length})
            </h3>
          </div>
          
          <div className="space-y-3">
            {addedItems.map((item) => (
              <div key={item.tempId} className="bg-white rounded-[1.5rem] border border-border/50 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-2">
                <div className="p-4 flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-md font-black block">{item.fishType}</span>
                    <div className="flex gap-3 text-[10px] font-bold text-muted-foreground">
                      <span className="flex items-center gap-1"><Scale className="w-3 h-3" /> {item.quantity} كجم</span>
                      <span className="flex items-center gap-1"><Coins className="w-3 h-3" /> {item.pricePerKg.toLocaleString()} ر.ي</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-black text-orange-600 block">{item.lineTotal.toLocaleString()} ر.ي</span>
                    <span className={cn(
                      "text-[9px] font-black px-2 py-0.5 rounded-full inline-block mt-1",
                      item.paymentType === "نقد" ? "bg-green-100 text-green-700" : (item.paymentType === "دين" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700")
                    )}>
                      {item.paymentType === "نقد" ? "نقد" : (item.paymentType === "دين" ? "دين" : `جزئي (${item.paidAmount.toLocaleString()})`)}
                    </span>
                  </div>
                </div>
                <div className="px-4 py-3 bg-muted/30 border-t border-dashed flex justify-end gap-4">
                  <button onClick={() => handleEditItem(item)} className="text-accent text-[11px] font-black flex items-center gap-1">
                    <Edit3 className="w-3.5 h-3.5" /> تعديل
                  </button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="text-destructive text-[11px] font-black flex items-center gap-1">
                        <Trash2 className="w-3.5 h-3.5" /> حذف
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-3xl max-w-[90%]">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-right">تأكيد حذف الصنف</AlertDialogTitle>
                        <AlertDialogDescription className="text-right">
                          هل أنت متأكد من رغبتك في حذف ({item.fishType}) من قائمة المشتريات؟
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-row gap-2">
                        <AlertDialogCancel className="flex-1 rounded-xl">إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRemoveItem(item.tempId)} className="flex-1 rounded-xl bg-destructive text-white border-none">نعم، احذف</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
            
            {addedItems.length === 0 && (
              <div className="text-center py-16 text-muted-foreground text-sm border-2 border-dashed rounded-[2rem] bg-white/50">
                لا توجد أصناف في القائمة حالياً
              </div>
            )}
          </div>
        </div>

        {/* Summary & Save */}
        {addedItems.length > 0 && (
          <div className="space-y-4 animate-in slide-in-from-bottom-5">
            <Card className="border-none shadow-lg rounded-[2rem] bg-primary text-white overflow-hidden">
               <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
                    <span className="text-xs font-bold opacity-80">إجمالي الفاتورة:</span>
                    <span className="text-xl font-black">{grandTotal.toLocaleString()} ر.ي</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold opacity-70 block uppercase">تم سداده</span>
                      <span className="text-md font-black text-accent-foreground">{totalPaid.toLocaleString()}</span>
                    </div>
                    <div className="space-y-1 border-r border-white/10">
                      <span className="text-[10px] font-bold opacity-70 block uppercase">متبقي (دين)</span>
                      <span className={cn("text-md font-black", totalDue > 0 ? "text-orange-400" : "text-white")}>
                        {totalDue.toLocaleString()}
                      </span>
                    </div>
                  </div>
               </CardContent>
            </Card>

            <Button 
              className="w-full h-14 rounded-2xl text-lg font-black shadow-xl gap-2 bg-orange-600 hover:bg-orange-700 transition-all active:scale-95" 
              onClick={handleFinalSave}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
              حفظ وتأكيد عملية الشراء
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
