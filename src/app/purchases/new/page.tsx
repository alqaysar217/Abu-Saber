
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Save, Loader2, Calendar as CalendarIcon, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useUser, useMemoFirebase } from "@/firebase"
import { collection, addDoc, serverTimestamp, query, where } from "firebase/firestore"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'

export default function NewPurchasePage() {
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

  const { data: suppliers, isLoading: loadingSuppliers } = useCollection(suppliersQuery)

  const [campaignId, setCampaignId] = useState("")
  const [supplierId, setSupplierId] = useState("")
  const [fishType, setFishType] = useState("")
  const [quantity, setQuantity] = useState("")
  const [pricePerKg, setPricePerKg] = useState("")
  const [paymentType, setPaymentType] = useState("نقد")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const totalAmount = (parseFloat(quantity) || 0) * (parseFloat(pricePerKg) || 0)

  const handleSave = async () => {
    if (!db || !user) return
    if (!campaignId || !supplierId || !fishType || !quantity || !pricePerKg) {
      toast({
        variant: "destructive",
        title: "خطأ في الإدخال",
        description: "يرجى ملء جميع الحقول المطلوبة",
      })
      return
    }

    setLoading(true)
    const purchaseData = {
      campaignId,
      supplierId,
      fishType,
      quantity: parseFloat(quantity),
      pricePerKg: parseFloat(pricePerKg),
      totalAmount,
      paymentType,
      date: new Date(date).toISOString(),
      userId: user.uid,
      createdAt: serverTimestamp(),
    }

    addDoc(collection(db, "users", user.uid, "purchases"), purchaseData)
      .then(() => {
        toast({
          title: "تم بنجاح",
          description: "تم تسجيل عملية الشراء بنجاح",
        })
        router.push("/")
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: `users/${user.uid}/purchases`,
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
        <h1 className="text-lg font-bold">تسجيل شراء أسماك</h1>
        <div className="w-6" />
      </header>

      <main className="p-4 space-y-6">
        <Card className="border-none shadow-xl rounded-[1.5rem] overflow-hidden">
          <CardHeader className="bg-orange-50 border-b border-orange-100">
            <CardTitle className="text-md font-bold text-orange-700">بيانات التوريد</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-bold">الحملة <span className="text-destructive">*</span></Label>
              <Select onValueChange={setCampaignId}>
                <SelectTrigger className="h-12 rounded-xl">
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
              <Label className="text-sm font-bold">المورد <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select onValueChange={setSupplierId}>
                    <SelectTrigger className="h-12 rounded-xl">
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
                  className="h-12 w-12 p-0 rounded-xl"
                  onClick={() => router.push("/suppliers/new")}
                >
                  <UserPlus className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold">نوع السمك <span className="text-destructive">*</span></Label>
              <Input 
                placeholder="مثال: تونة، بياض، هامور" 
                className="h-12 rounded-xl"
                value={fishType}
                onChange={(e) => setFishType(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-bold">الكمية (كجم)</Label>
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  className="h-12 rounded-xl"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold">سعر الكيلو (ر.ي)</Label>
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  className="h-12 rounded-xl"
                  value={pricePerKg}
                  onChange={(e) => setPricePerKg(e.target.value)}
                />
              </div>
            </div>

            <div className="p-4 bg-orange-600 text-white rounded-2xl flex justify-between items-center shadow-md">
              <span className="font-bold">إجمالي المشتريات:</span>
              <span className="text-xl font-black tabular-nums">{totalAmount.toLocaleString()} ر.ي</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-bold">طريقة الدفع</Label>
                <Select onValueChange={setPaymentType} defaultValue={paymentType}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="نقد">نقد</SelectItem>
                    <SelectItem value="دين">دين</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold">التاريخ</Label>
                <div className="relative">
                  <Input 
                    type="date" 
                    className="h-12 rounded-xl text-right pr-10" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                  <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <Button 
            className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg gap-2 bg-orange-600 hover:bg-orange-700" 
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
            حفظ عملية الشراء
          </Button>
          <Button 
            variant="ghost" 
            className="w-full h-12 rounded-xl text-muted-foreground font-bold"
            onClick={() => router.back()}
          >
            إلغاء
          </Button>
        </div>
      </main>
    </div>
  )
}
