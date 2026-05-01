
"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  ArrowDownRight, 
  ArrowUpRight, 
  Package, 
  Fuel, 
  Users, 
  Snowflake, 
  Waves, 
  Utensils, 
  MoreHorizontal,
  Loader2,
  Lock,
  Calendar
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useDoc, useCollection, useUser, useMemoFirebase } from "@/firebase"
import { doc, collection, query, where, updateDoc, serverTimestamp } from "firebase/firestore"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { BottomNav } from "@/components/layout/BottomNav"

export default function CampaignDetailsPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const router = useRouter()
  const { toast } = useToast()
  const { campaignId } = use(params)
  const db = useFirestore()
  const { user } = useUser()

  const campaignRef = useMemoFirebase(() => {
    if (!db || !user || !campaignId) return null
    return doc(db, "users", user.uid, "campaigns", campaignId)
  }, [db, user, campaignId])

  const { data: campaign, isLoading: loadingCampaign } = useDoc(campaignRef)

  const expensesQuery = useMemoFirebase(() => {
    if (!db || !user || !campaignId) return null
    return query(collection(db, "users", user.uid, "campaigns", campaignId, "expenses"))
  }, [db, user, campaignId])

  const { data: expenses, isLoading: loadingExpenses } = useCollection(expensesQuery)

  const purchasesQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "purchases"), where("campaignId", "==", campaignId))
  }, [db, user, campaignId])

  const { data: purchases, isLoading: loadingPurchases } = useCollection(purchasesQuery)

  const totalExpenses = expenses?.reduce((acc, curr) => acc + curr.amount, 0) || 0
  const totalPurchases = purchases?.reduce((acc, curr) => acc + curr.totalAmount, 0) || 0
  const totalCost = totalExpenses + totalPurchases

  const handleCloseCampaign = async () => {
    if (!campaignRef) return
    if (confirm("هل أنت متأكد من إغلاق هذه الحملة؟")) {
      updateDoc(campaignRef, { 
        status: "closed",
        endDate: serverTimestamp() 
      })
      .then(() => {
        toast({ title: "تم إغلاق الحملة بنجاح" })
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: campaignRef.path,
          operation: 'update',
          requestResourceData: { status: "closed" },
        })
        errorEmitter.emit('permission-error', permissionError)
      })
    }
  }

  if (loadingCampaign || loadingExpenses || loadingPurchases) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <h2 className="text-xl font-bold mb-2">عذراً، لم يتم العثور على الحملة</h2>
        <Button onClick={() => router.push("/campaigns")}>العودة لقائمة الحملات</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <header className="p-4 flex items-center justify-between border-b bg-white sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 -mr-2">
          <ChevronLeft className="w-6 h-6 rotate-180" />
        </button>
        <div className="text-center flex-1">
          <h1 className="text-lg font-bold truncate px-4">{campaign.name}</h1>
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
            <Calendar className="w-3 h-3" />
            {campaign.startDate ? format(new Date(campaign.startDate), "PPP", { locale: ar }) : "بدون تاريخ"}
          </p>
        </div>
        <div className="w-6" />
      </header>

      <main className="p-4 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-none shadow-sm rounded-2xl bg-primary text-white">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-[10px] font-bold opacity-80 uppercase">إجمالي التكلفة</span>
              <span className="text-lg font-black tabular-nums">{totalCost.toLocaleString()}</span>
              <span className="text-[10px] opacity-70">ريال يمني</span>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm rounded-2xl bg-white border border-border/50">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">الحالة</span>
              <Badge variant={campaign.status === 'open' ? 'default' : 'secondary'} className="w-fit">
                {campaign.status === 'open' ? 'مفتوحة' : 'مغلقة'}
              </Badge>
              {campaign.status === 'open' && (
                <button 
                  onClick={handleCloseCampaign}
                  className="text-[10px] text-destructive font-bold mt-1 text-right flex items-center gap-1"
                >
                  <Lock className="w-3 h-3" />
                  إغلاق الآن
                </button>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-12 rounded-2xl p-1 mb-6">
            <TabsTrigger value="overview" className="rounded-xl text-xs font-bold">نظرة عامة</TabsTrigger>
            <TabsTrigger value="purchases" className="rounded-xl text-xs font-bold">المشتريات</TabsTrigger>
            <TabsTrigger value="expenses" className="rounded-xl text-xs font-bold">المصاريف</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-orange-50 rounded-2xl space-y-1">
                <div className="flex items-center gap-2 text-orange-600 mb-1">
                  <ArrowDownRight className="w-4 h-4" />
                  <span className="text-[10px] font-bold">إجمالي الشراء</span>
                </div>
                <p className="text-xl font-black text-orange-700 tabular-nums">{totalPurchases.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-accent/5 rounded-2xl space-y-1">
                <div className="flex items-center gap-2 text-accent mb-1">
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="text-[10px] font-bold">إجمالي المصاريف</span>
                </div>
                <p className="text-xl font-black text-accent tabular-nums">{totalExpenses.toLocaleString()}</p>
              </div>
            </div>
            {campaign.notes && (
              <Card className="border-none shadow-sm rounded-2xl">
                <CardHeader className="p-4 pb-0">
                  <CardTitle className="text-sm font-bold">ملاحظات الحملة</CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-sm text-muted-foreground whitespace-pre-wrap">
                  {campaign.notes}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="purchases" className="space-y-3">
            {purchases && purchases.length > 0 ? (
              purchases.map((p: any) => (
                <div key={p.id} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-border/50 shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{p.fishType}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {p.quantity} كجم × {p.pricePerKg?.toLocaleString()} ر.ي
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-orange-600 tabular-nums">{p.totalAmount?.toLocaleString()} ر.ي</span>
                    <p className="text-[10px] text-muted-foreground">{p.date ? format(new Date(p.date), "dd MMM") : ""}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-muted-foreground text-sm">لا توجد مشتريات لهذه الحملة</div>
            )}
          </TabsContent>

          <TabsContent value="expenses" className="space-y-3">
             {expenses && expenses.length > 0 ? (
              expenses.map((e: any) => {
                const typeIcon = {
                  "ديزل": Fuel,
                  "عمال": Users,
                  "ثلج": Snowflake,
                  "ملح": Waves,
                  "أكياس": Package,
                  "أكل": Utensils,
                  "أخرى": MoreHorizontal
                }[e.type as string] || MoreHorizontal

                const Icon = typeIcon;

                return (
                  <div key={e.id} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-border/50 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-accent/10 text-accent rounded-lg">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{e.type}</span>
                        <span className="text-[10px] text-muted-foreground">{e.notes || "لا يوجد ملاحظات"}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-accent tabular-nums">{e.amount?.toLocaleString()} ر.ي</span>
                      <p className="text-[10px] text-muted-foreground">{e.date ? format(new Date(e.date), "dd MMM") : ""}</p>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-10 text-muted-foreground text-sm">لا توجد مصاريف لهذه الحملة</div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />
    </div>
  )
}
