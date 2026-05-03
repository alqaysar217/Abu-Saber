
"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Box, 
  Search, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingDown, 
  TrendingUp,
  Ship,
  Fish,
  Scale,
  History
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  useFirestore, 
  useUser, 
  useCollection, 
  useMemoFirebase 
} from "@/firebase"
import { collection, query } from "firebase/firestore"
import { cn } from "@/lib/utils"

export default function InventoryPage() {
  const router = useRouter()
  const db = useFirestore()
  const { user } = useUser()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCampaign, setFilterCampaign] = useState("all")

  // Subscriptions
  const purchasesQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return collection(db, "users", user.uid, "purchases")
  }, [db, user])
  const { data: purchases, isLoading: loadingPurchases } = useCollection(purchasesQuery)

  const invoicesQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return collection(db, "users", user.uid, "invoices")
  }, [db, user])
  const { data: invoices, isLoading: loadingInvoices } = useCollection(invoicesQuery)

  const campaignsQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return collection(db, "users", user.uid, "campaigns")
  }, [db, user])
  const { data: campaigns } = useCollection(campaignsQuery)

  // Inventory Logic: Group by FishType and Campaign
  const inventoryData = useMemo(() => {
    if (!purchases || !invoices) return []

    const stockMap = new Map()

    // 1. Process Purchases (Add to stock)
    purchases.forEach(p => {
      const items = p.items || []
      items.forEach((item: any) => {
        const key = `${p.campaignId}_${item.fishType}`
        const current = stockMap.get(key) || { 
          campaignId: p.campaignId, 
          fishType: item.fishType, 
          purchasedQty: 0, 
          soldQty: 0 
        }
        current.purchasedQty += (item.quantity || 0)
        stockMap.set(key, current)
      })
    })

    // 2. Process Invoices (Subtract from stock)
    invoices.forEach(inv => {
      const items = inv.items || []
      items.forEach((item: any) => {
        const key = `${inv.campaignId}_${item.fishType}`
        const current = stockMap.get(key) || { 
          campaignId: inv.campaignId, 
          fishType: item.fishType, 
          purchasedQty: 0, 
          soldQty: 0 
        }
        current.soldQty += (item.quantity || 0)
        stockMap.set(key, current)
      })
    })

    return Array.from(stockMap.values()).map(item => {
      const campaign = campaigns?.find(c => c.id === item.campaignId)
      return {
        ...item,
        campaignName: campaign?.name || "حملة عامة",
        remainingQty: item.purchasedQty - item.soldQty
      }
    }).filter(item => {
      const matchesSearch = item.fishType.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCampaign = filterCampaign === "all" || item.campaignId === filterCampaign
      return matchesSearch && matchesCampaign
    }).sort((a, b) => a.remainingQty - b.remainingQty)
  }, [purchases, invoices, campaigns, searchTerm, filterCampaign])

  const isLoading = loadingPurchases || loadingInvoices

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <header className="p-6 bg-white border-b sticky top-0 z-30 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <button onClick={() => router.push("/")} className="p-2 -mr-2">
            <ChevronLeft className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-black text-primary flex items-center gap-2">
            <Box className="w-5 h-5" />
            جرد المخزون (الثلاجة)
          </h1>
          <div className="w-10" />
        </div>

        <div className="flex gap-2" dir="rtl">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="بحث بنوع السمك..." 
              className="pr-11 h-12 rounded-2xl bg-muted/30 border-none text-right" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="h-12 rounded-2xl bg-muted/30 border-none text-[10px] font-black px-4 outline-none"
            value={filterCampaign}
            onChange={e => setFilterCampaign(e.target.value)}
          >
            <option value="all">كل الحملات</option>
            {campaigns?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <div className="grid grid-cols-2 gap-4">
           <Card className="border-none shadow-sm bg-orange-50 text-orange-700 rounded-3xl">
             <CardContent className="p-5 flex flex-col items-center gap-1">
                <TrendingUp className="w-5 h-5 opacity-50" />
                <span className="text-[9px] font-black uppercase">إجمالي الوارد</span>
                <span className="text-lg font-black tabular-nums">{inventoryData.reduce((acc, curr) => acc + curr.purchasedQty, 0).toLocaleString()} <span className="text-[9px]">كجم</span></span>
             </CardContent>
           </Card>
           <Card className="border-none shadow-sm bg-green-50 text-green-700 rounded-3xl">
             <CardContent className="p-5 flex flex-col items-center gap-1">
                <TrendingDown className="w-5 h-5 opacity-50" />
                <span className="text-[9px] font-black uppercase">إجمالي المبيع</span>
                <span className="text-lg font-black tabular-nums">{inventoryData.reduce((acc, curr) => acc + curr.soldQty, 0).toLocaleString()} <span className="text-[9px]">كجم</span></span>
             </CardContent>
           </Card>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" /></div>
        ) : (
          <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table dir="rtl">
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-right font-black text-[10px] py-4">نوع السمك</TableHead>
                    <TableHead className="text-center font-black text-[10px]">الحملة</TableHead>
                    <TableHead className="text-center font-black text-[10px]">اشتريت</TableHead>
                    <TableHead className="text-center font-black text-[10px]">بعت</TableHead>
                    <TableHead className="text-center font-black text-[10px]">المتبقي</TableHead>
                    <TableHead className="text-center font-black text-[10px]">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryData.map((item, idx) => (
                    <TableRow key={`${item.campaignId}_${item.fishType}`} className="border-b-muted/10">
                      <TableCell className="text-right py-4">
                        <div className="flex items-center gap-2">
                           <Fish className="w-3.5 h-3.5 text-primary/40" />
                           <span className="text-xs font-black">{item.fishType}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-[10px] font-bold text-muted-foreground truncate max-w-[80px] inline-block">{item.campaignName}</span>
                      </TableCell>
                      <TableCell className="text-center font-bold text-xs tabular-nums text-muted-foreground">{item.purchasedQty}</TableCell>
                      <TableCell className="text-center font-bold text-xs tabular-nums text-muted-foreground">{item.soldQty}</TableCell>
                      <TableCell className="text-center font-black text-xs tabular-nums">
                         <span className={cn(item.remainingQty <= 0 ? "text-destructive" : "text-green-600")}>
                           {item.remainingQty}
                         </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.remainingQty <= 0 ? (
                          <Badge className="bg-red-50 text-red-600 border-none shadow-none text-[8px] font-black px-1.5">منتهي</Badge>
                        ) : (
                          <Badge className="bg-green-50 text-green-600 border-none shadow-none text-[8px] font-black px-1.5">متوفر</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {inventoryData.length === 0 && (
              <div className="text-center py-20 text-muted-foreground font-bold text-sm bg-muted/5">
                <Box className="w-12 h-12 mx-auto mb-3 opacity-10" />
                لا توجد بيانات مخزون حالية
              </div>
            )}
          </div>
        )}

        <Card className="border-none bg-primary/5 rounded-[2rem] p-6 border border-dashed border-primary/20">
           <div className="flex items-start gap-4" dir="rtl">
              <AlertTriangle className="w-6 h-6 text-primary shrink-0" />
              <div className="space-y-1">
                <h4 className="font-black text-primary text-sm">كيف يعمل الجرد؟</h4>
                <p className="text-[11px] text-muted-foreground font-bold leading-relaxed">
                  يقوم النظام آلياً بمقارنة إجمالي الكميات التي اشتريتها في كل حملة مع الكميات التي بعتها. إذا ظهر الرقم بالسالب، فهذا يعني أنك بعت كمية أكبر مما هو مسجل في فواتير الشراء.
                </p>
              </div>
           </div>
        </Card>
      </main>
    </div>
  )
}
