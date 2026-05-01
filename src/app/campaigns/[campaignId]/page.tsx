
"use client"

import { use, useState, useEffect } from "react"
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
  Calendar,
  LayoutDashboard,
  ShoppingBag,
  Receipt,
  Archive,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  Edit3,
  Table as TableIcon,
  X,
  User
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFirestore, useDoc, useCollection, useUser, useMemoFirebase } from "@/firebase"
import { doc, collection, query, where, updateDoc, deleteDoc, orderBy } from "firebase/firestore"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { BottomNav } from "@/components/layout/BottomNav"
import { useToast } from "@/hooks/use-toast"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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

function PurchaseDetailRow({ purchase, suppliers, userId }: { purchase: any, suppliers: any[], userId: string }) {
  const db = useFirestore()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const supplier = suppliers?.find(s => s.id === purchase.supplierId)

  const itemsQuery = useMemoFirebase(() => {
    if (!db || !userId || !purchase.id) return null
    return query(collection(db, "users", userId, "purchases", purchase.id, "items"))
  }, [db, userId, purchase.id])

  const { data: items, isLoading: loadingItems } = useCollection(itemsQuery)

  const handleDeletePurchase = async () => {
    if (!db || !userId) return
    const purchaseRef = doc(db, "users", userId, "purchases", purchase.id)
    
    deleteDoc(purchaseRef)
      .then(() => {
        toast({ title: "تم حذف عملية الشراء بنجاح" })
        setOpen(false)
      })
      .catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: purchaseRef.path,
          operation: 'delete'
        }))
      })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="flex justify-between items-center p-4 bg-white rounded-2xl border border-border/50 shadow-sm active:scale-[0.98] transition-all cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold">{supplier?.name || "مورد غير معروف"}</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {purchase.purchaseDate ? format(new Date(purchase.purchaseDate), "dd MMM yyyy") : "No Date"}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm font-black text-orange-600 tabular-nums">{purchase.totalAmount?.toLocaleString('en-US')} ر.ي</span>
            <div className="flex items-center justify-end gap-1 mt-1">
               <Badge className="text-[8px] px-1.5 py-0 bg-muted text-muted-foreground border-none">
                {purchase.status || "N/A"}
               </Badge>
               <Eye className="w-3 h-3 text-muted-foreground" />
            </div>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-[95%] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 bg-orange-600 text-white">
          <div className="flex justify-between items-center">
             <DialogTitle className="text-right text-lg font-bold flex items-center gap-2">
               <TableIcon className="w-5 h-5" />
               تفاصيل فاتورة المشتريات
             </DialogTitle>
             <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/20 rounded-full">
               <X className="w-5 h-5" />
             </button>
          </div>
          <div className="mt-4 flex flex-col gap-1 text-xs opacity-90">
             <p className="font-bold flex items-center gap-2"><User className="w-3 h-3" /> المورد: {supplier?.name}</p>
             <p className="flex items-center gap-2"><Calendar className="w-3 h-3" /> التاريخ: {purchase.purchaseDate ? format(new Date(purchase.purchaseDate), "dd MMM yyyy") : ""}</p>
          </div>
        </DialogHeader>
        
        <div className="p-4 space-y-4">
           {loadingItems ? (
             <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-orange-600" /></div>
           ) : items && items.length > 0 ? (
             <div className="border rounded-2xl overflow-hidden shadow-inner">
               <Table dir="rtl">
                 <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-right font-bold text-[10px]">النوع</TableHead>
                      <TableHead className="text-center font-bold text-[10px]">الكمية</TableHead>
                      <TableHead className="text-center font-bold text-[10px]">الإجمالي</TableHead>
                      <TableHead className="text-center font-bold text-[10px]">الدفع</TableHead>
                    </TableRow>
                 </TableHeader>
                 <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-right text-xs font-bold">{item.fishType}</TableCell>
                        <TableCell className="text-center text-xs tabular-nums">{item.quantity?.toLocaleString('en-US')} kg</TableCell>
                        <TableCell className="text-center text-xs font-black text-orange-600 tabular-nums">{item.lineTotal?.toLocaleString('en-US')}</TableCell>
                        <TableCell className="text-center text-[10px]">{item.paymentType}</TableCell>
                      </TableRow>
                    ))}
                 </TableBody>
               </Table>
             </div>
           ) : (
             <div className="text-center py-10 text-muted-foreground text-xs">لا توجد أصناف مسجلة</div>
           )}

           <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex justify-between items-center">
              <span className="text-xs font-bold text-orange-800">إجمالي الفاتورة النهائية</span>
              <span className="text-xl font-black text-orange-600 tabular-nums">{purchase.totalAmount?.toLocaleString('en-US')} ر.ي</span>
           </div>

           <div className="flex gap-3 pt-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="flex-1 rounded-xl h-12 gap-2 shadow-md">
                    <Trash2 className="w-4 h-4" />
                    حذف الفاتورة
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-3xl max-w-[90%] mx-auto">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-right text-destructive flex items-center justify-end gap-2">
                      <AlertCircle className="w-5 h-5" />
                      حذف عملية الشراء؟
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-right">
                      هل أنت متأكد من حذف هذه الفاتورة وجميع أصنافها؟ هذا الإجراء لا يمكن التراجع عنه.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-row gap-2 mt-4">
                    <AlertDialogCancel className="flex-1 rounded-xl">إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeletePurchase} className="flex-1 rounded-xl bg-destructive text-white border-none">نعم، احذف</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              <Button variant="outline" className="flex-1 rounded-xl h-12 gap-2 border-orange-200 text-orange-600 hover:bg-orange-50" onClick={() => toast({ title: "ميزة التعديل قادمة قريباً" })}>
                <Edit3 className="w-4 h-4" />
                تعديل البيانات
              </Button>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function CampaignDetailsPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const router = useRouter()
  const { campaignId } = use(params)
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const [archiving, setArchiving] = useState(false)

  const campaignRef = useMemoFirebase(() => {
    if (!db || !user || !campaignId) return null
    return doc(db, "users", user.uid, "campaigns", campaignId)
  }, [db, user, campaignId])

  const { data: campaign, isLoading: loadingCampaign } = useDoc(campaignRef)

  const suppliersQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "suppliers"))
  }, [db, user])

  const { data: suppliers } = useCollection(suppliersQuery)

  const expensesQuery = useMemoFirebase(() => {
    if (!db || !user || !campaignId) return null
    return query(collection(db, "users", user.uid, "campaigns", campaignId, "expenses"))
  }, [db, user, campaignId])

  const { data: expenses, isLoading: loadingExpenses } = useCollection(expensesQuery)

  const purchasesQuery = useMemoFirebase(() => {
    if (!db || !user || !campaignId) return null
    return query(collection(db, "users", user.uid, "purchases"), where("campaignId", "==", campaignId))
  }, [db, user, campaignId])

  const { data: purchases, isLoading: loadingPurchases } = useCollection(purchasesQuery)

  const handleArchiveCampaign = async () => {
    if (!campaignRef || !user) return
    
    setArchiving(true)
    const updateData = {
      status: "completed",
      endDate: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    updateDoc(campaignRef, updateData)
      .then(() => {
        toast({
          title: "تمت الأرشفة",
          description: "تم نقل الحملة إلى الأرشيف بنجاح",
        })
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: campaignRef.path,
          operation: 'update',
          requestResourceData: updateData,
        })
        errorEmitter.emit('permission-error', permissionError)
      })
      .finally(() => setArchiving(false))
  }

  const totalExpenses = expenses?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0
  const totalPurchases = purchases?.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0) || 0
  const totalCost = totalExpenses + totalPurchases

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

  const isCompleted = campaign.status === 'completed'

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <header className="p-4 flex items-center justify-between border-b bg-white sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 -mr-2">
          <ChevronLeft className="w-6 h-6 rotate-180" />
        </button>
        <div className="text-center flex-1">
          <h1 className="text-lg font-bold truncate px-4">{campaign.name}</h1>
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 font-bold">
            <Calendar className="w-3 h-3 text-primary" />
            {campaign.startDate ? format(new Date(campaign.startDate), "PPP", { locale: ar }) : "No Date"}
          </p>
        </div>
        {!isCompleted ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="p-2 -ml-2 text-muted-foreground hover:text-orange-600 transition-colors">
                <Archive className="w-5 h-5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl max-w-[90%] mx-auto">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-right flex items-center justify-start gap-2 text-orange-600">
                  <AlertCircle className="w-5 h-5" />
                  تأكيد أرشفة الحملة
                </AlertDialogTitle>
                <div className="text-right text-sm leading-relaxed space-y-3">
                  <div className="text-right text-sm">
                    <p className="text-muted-foreground">هل أنت متأكد من رغبتك في أرشفة هذه الحملة؟</p>
                    <div className="mt-4">
                      <span className="font-bold block text-xs">عند الأرشفة:</span>
                      <ul className="list-disc list-inside mt-1 space-y-1 text-[11px] opacity-80">
                        <li>سيتم إغلاق الحملة وتغيير حالتها إلى "مكتملة".</li>
                        <li>لن تتمكن من إضافة مشتريات أو مصاريف جديدة لها.</li>
                        <li>ستبقى البيانات محفوظة للرجوع إليها لاحقاً.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row gap-3 mt-4">
                <AlertDialogCancel className="flex-1 rounded-xl border-muted-foreground/20">تراجع</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleArchiveCampaign}
                  className="flex-1 rounded-xl bg-orange-600 hover:bg-orange-700 text-white border-none"
                  disabled={archiving}
                >
                  {archiving ? <Loader2 className="w-4 h-4 animate-spin" /> : "نعم، أرشفة"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <div className="p-2 -ml-2 text-accent">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        )}
      </header>

      <main className="p-4 space-y-6">
        {isCompleted && (
          <div className="p-4 bg-muted border-2 border-dashed rounded-2xl flex items-center gap-3 text-muted-foreground">
            <AlertCircle className="w-5 h-5" />
            <p className="text-xs font-bold">هذه الحملة مؤرشفة. تم إغلاقها في {campaign.endDate ? format(new Date(campaign.endDate), "dd MMM yyyy") : ""}</p>
          </div>
        )}

        <Card className="border-none shadow-sm rounded-2xl lux-gradient text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <CardContent className="p-6 flex flex-col items-center text-center gap-2 relative z-10">
            <span className="text-xs font-bold opacity-80 uppercase tracking-wider">إجمالي التكلفة النهائية</span>
            <span className="text-4xl font-black tabular-nums">{totalCost.toLocaleString('en-US')}</span>
            <span className="text-xs opacity-70">ريال يمني</span>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="w-full" dir="rtl">
          <TabsList className="grid w-full grid-cols-3 h-14 rounded-2xl p-1.5 mb-6 bg-muted/50 border border-border/50 shadow-inner overflow-hidden">
            <TabsTrigger 
              value="overview" 
              className="rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1 h-full transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#123524] data-[state=active]:via-[#1a4d36] data-[state=active]:to-[#236045] data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>نظرة عامة</span>
            </TabsTrigger>
            <TabsTrigger 
              value="purchases" 
              className="rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1 h-full transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#123524] data-[state=active]:via-[#1a4d36] data-[state=active]:to-[#236045] data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>المشتريات</span>
            </TabsTrigger>
            <TabsTrigger 
              value="expenses" 
              className="rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1 h-full transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#123524] data-[state=active]:via-[#1a4d36] data-[state=active]:to-[#236045] data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              <Receipt className="w-4 h-4" />
              <span>المصاريف</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 outline-none animate-in fade-in duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100/50 space-y-1">
                <div className="flex items-center gap-2 text-orange-600 mb-1">
                  <ArrowDownRight className="w-4 h-4" />
                  <span className="text-[10px] font-bold">إجمالي الشراء</span>
                </div>
                <p className="text-2xl font-black text-orange-700 tabular-nums">{totalPurchases.toLocaleString('en-US')}</p>
              </div>
              <div className="p-5 bg-accent/5 rounded-2xl border border-accent/10 space-y-1">
                <div className="flex items-center gap-2 text-accent mb-1">
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="text-[10px] font-bold">إجمالي المصاريف</span>
                </div>
                <p className="text-2xl font-black text-accent tabular-nums">{totalExpenses.toLocaleString('en-US')}</p>
              </div>
            </div>
            
            {campaign.notes && (
              <Card className="border-none shadow-sm rounded-2xl bg-white">
                <CardHeader className="p-4 pb-0">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-primary" />
                    ملاحظات الحملة
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-sm text-muted-foreground leading-relaxed">
                  {campaign.notes}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="purchases" className="space-y-3 outline-none animate-in fade-in duration-300">
            {purchases && purchases.length > 0 ? (
              purchases.map((p: any) => (
                <PurchaseDetailRow key={p.id} purchase={p} suppliers={suppliers || []} userId={user.uid} />
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed rounded-3xl">لا توجد عمليات شراء لهذه الحملة</div>
            )}
          </TabsContent>

          <TabsContent value="expenses" className="space-y-3 outline-none animate-in fade-in duration-300">
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
                        <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{e.notes || "لا يوجد ملاحظات"}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-accent tabular-nums">{e.amount?.toLocaleString('en-US')} ر.ي</span>
                      <p className="text-[10px] text-muted-foreground font-bold">{e.date ? format(new Date(e.date), "dd MMM") : ""}</p>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed rounded-3xl">لا توجد مصاريف لهذه الحملة</div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />
    </div>
  )
}
