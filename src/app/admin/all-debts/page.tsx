
"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { 
  Search, 
  Wallet, 
  Loader2, 
  ChevronLeft, 
  Calendar, 
  ArrowUpDown,
  ArrowRight,
  FileText,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertCircle
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  useFirestore, 
  useCollection, 
  useUser, 
  useMemoFirebase 
} from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { format, startOfDay, endOfDay } from "date-fns"
import { ar } from "date-fns/locale"
import { cn } from "@/lib/utils"

type SortOption = 'amount_desc' | 'amount_asc' | 'date_desc' | 'date_asc'

export default function AllDebtsDetailedPage() {
  const router = useRouter()
  const db = useFirestore()
  const { user } = useUser()
  
  const [activeView, setActiveTab] = useState<string>("to_me") 
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>('date_desc')
  const [filterCampaignId, setFilterCampaignId] = useState<string>("all")
  const [filterDebtStatus, setFilterDebtStatus] = useState<string>("unpaid") 
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  // Data Subscriptions
  const customersQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "customers"))
  }, [db, user])
  const { data: customers } = useCollection(customersQuery)

  const suppliersQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "suppliers"))
  }, [db, user])
  const { data: suppliers } = useCollection(suppliersQuery)

  const campaignsQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "campaigns"))
  }, [db, user])
  const { data: campaigns } = useCollection(campaignsQuery)

  const invoicesQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "invoices"), orderBy("createdAt", "desc"))
  }, [db, user])
  const { data: invoices } = useCollection(invoicesQuery)

  const purchasesQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "purchases"), orderBy("createdAt", "desc"))
  }, [db, user])
  const { data: purchases } = useCollection(purchasesQuery)

  const expensesQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "expenses"), orderBy("createdAt", "desc"))
  }, [db, user])
  const { data: expenses } = useCollection(expensesQuery)

  const reportItems = useMemo(() => {
    const combined: any[] = []
    
    // 1. Invoices (Debts to Me)
    if (invoices) {
      invoices.forEach(inv => {
        const customer = customers?.find(c => c.id === inv.customerId)
        const remaining = inv.remainingAmount !== undefined ? inv.remainingAmount : ((inv.totalAmount || 0) - (inv.paidAmount || 0))
        
        combined.push({
          ...inv,
          id: inv.id,
          entityName: customer?.name || "عميل غير معروف",
          date: inv.invoiceDate,
          remainingAmount: remaining,
          trType: 'sale',
          category: 'to_me',
          notes: inv.notes || inv.description || "-"
        })
      })
    }

    // 2. Purchases (Debts by Me)
    if (purchases) {
      purchases.forEach(p => {
        const supplier = suppliers?.find(s => s.id === p.supplierId)
        const remaining = p.remainingAmount !== undefined ? p.remainingAmount : ((p.totalAmount || 0) - (p.paidAmount || 0))

        combined.push({
          ...p,
          id: p.id,
          entityName: supplier?.name || "مورد غير معروف",
          date: p.purchaseDate,
          remainingAmount: remaining,
          trType: 'purchase',
          category: 'by_me',
          notes: p.notes || p.description || "-"
        })
      })
    }

    // 3. Expenses (Debts by Me)
    if (expenses) {
      expenses.forEach(e => {
        const remaining = e.remainingAmount !== undefined ? e.remainingAmount : ((e.amount || 0) - (e.paidAmount || 0))

        combined.push({
          ...e,
          id: e.id,
          entityName: e.payeeName || "جهة غير معروفة",
          date: e.expenseDate || e.date,
          remainingAmount: remaining,
          totalAmount: e.amount,
          trType: 'expense',
          category: 'by_me',
          invoiceNumber: "مصروف",
          notes: e.notes || "-"
        })
      })
    }

    return combined.filter(item => {
      const matchesCategory = item.category === activeView
      const matchesSearch = item.entityName.toLowerCase().includes(searchTerm.toLowerCase()) || (item.invoiceNumber || "").toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCampaign = filterCampaignId === "all" || item.campaignId === filterCampaignId
      const matchesStatus = filterDebtStatus === "all" || (filterDebtStatus === "unpaid" && item.remainingAmount > 0) || (filterDebtStatus === "paid" && item.remainingAmount <= 0)
      
      let matchesDate = true
      if (fromDate || toDate) {
        const itemDate = new Date(item.date)
        const start = fromDate ? startOfDay(new Date(fromDate)) : new Date(0)
        const end = toDate ? endOfDay(new Date(toDate)) : new Date(8640000000000000)
        matchesDate = itemDate >= start && itemDate <= end
      }

      return matchesCategory && matchesSearch && matchesCampaign && matchesStatus && matchesDate
    }).sort((a, b) => {
      if (sortBy === 'amount_desc') return b.remainingAmount - a.remainingAmount
      if (sortBy === 'amount_asc') return a.remainingAmount - b.remainingAmount
      if (sortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime()
      if (sortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime()
      return 0
    })
  }, [invoices, purchases, expenses, customers, suppliers, campaigns, searchTerm, filterCampaignId, filterDebtStatus, fromDate, toDate, sortBy, activeView])

  const isLoading = !invoices || !purchases || !campaigns || !expenses

  return (
    <div className="flex flex-col min-h-screen bg-background pb-10">
      <header className="p-4 bg-white border-b sticky top-0 z-20 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <button onClick={() => router.back()} className="p-2 -mr-2">
            <ChevronLeft className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-black text-primary flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            سجل الديون التفصيلي
          </h1>
          <div className="w-10" />
        </div>
        
        <Tabs value={activeView} onValueChange={setActiveTab} className="w-full" dir="rtl">
          <TabsList className="grid w-full grid-cols-2 h-12 rounded-2xl p-1 bg-muted/50 border shadow-inner">
            <TabsTrigger 
              value="to_me" 
              className="rounded-xl font-black text-xs gap-2 h-full transition-all data-[state=active]:lux-gradient data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:!bg-none border-none"
              style={{ padding: '0 12px' }}
            >
              <ArrowDownToLine className="w-4 h-4" />
              ديون لك
            </TabsTrigger>
            <TabsTrigger 
              value="by_me" 
              className="rounded-xl font-black text-xs gap-2 h-full transition-all data-[state=active]:lux-gradient data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:!bg-none border-none"
              style={{ padding: '0 12px' }}
            >
              <ArrowUpFromLine className="w-4 h-4" />
              ديون عليك
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2" dir="rtl">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="بحث بالجهة أو الرقم..."
              className="pr-11 h-11 rounded-2xl bg-muted/30 border-none text-right" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
             <select className="h-11 flex-1 rounded-2xl bg-muted/30 border-none text-[10px] font-black px-3 outline-none" value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}>
               <option value="date_desc">الأحدث</option>
               <option value="date_asc">الأقدم</option>
               <option value="amount_desc">الأكبر مبلغاً</option>
               <option value="amount_asc">الأقل مبلغاً</option>
             </select>
             <select className="h-11 flex-1 rounded-2xl bg-muted/30 border-none text-[10px] font-black px-3 outline-none" value={filterDebtStatus} onChange={e => setFilterDebtStatus(e.target.value)}>
               <option value="all">كل الحالات</option>
               <option value="unpaid">ديون قائمة</option>
               <option value="paid">مُصفرة</option>
             </select>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" dir="rtl">
           <div className="flex items-center gap-2 bg-muted/20 p-1.5 rounded-xl border border-dashed shrink-0">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <Input type="date" className="h-7 w-28 rounded-lg bg-white border-none text-[9px] font-bold p-1" value={fromDate} onChange={e => setFromDate(e.target.value)} />
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <Input type="date" className="h-7 w-28 rounded-lg bg-white border-none text-[9px] font-bold p-1" value={toDate} onChange={e => setToDate(e.target.value)} />
           </div>
           <select className="h-10 rounded-2xl bg-muted/30 border-none text-[10px] font-black px-4 outline-none shrink-0" value={filterCampaignId} onChange={e => setFilterCampaignId(e.target.value)}>
             <option value="all">كل الحملات</option>
             {campaigns?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
           </select>
        </div>
      </header>

      <main className="p-2">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" /></div>
        ) : (
          <div className="bg-white rounded-[1.5rem] border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table dir="rtl" className="min-w-[650px]">
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-right font-black text-[9px] py-4 px-2">رقم الفاتورة</TableHead>
                    <TableHead className="text-right font-black text-[9px] px-2">الجهة</TableHead>
                    <TableHead className="text-center font-black text-[9px] px-2">المبلغ</TableHead>
                    <TableHead className="text-center font-black text-[9px] px-2">المدفوع</TableHead>
                    <TableHead className="text-center font-black text-[9px] px-2">المتبقي</TableHead>
                    <TableHead className="text-center font-black text-[9px] px-2">التاريخ</TableHead>
                    <TableHead className="text-center font-black text-[9px] px-2">الحالة</TableHead>
                    <TableHead className="text-right font-black text-[9px] px-2">الملاحظات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportItems.length > 0 ? reportItems.map((item, index) => (
                    <TableRow key={item.id || index} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="text-right py-3 px-2">
                        <Badge className={cn(
                          "font-black text-[8px] rounded-lg px-1.5 shadow-none border-none",
                          item.trType === 'sale' ? "bg-green-100 text-green-700" : (item.trType === 'purchase' ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700")
                        )}>
                          {item.invoiceNumber || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-[10px] font-bold px-2">{item.entityName}</TableCell>
                      <TableCell className="text-center font-bold text-[10px] tabular-nums px-2">{(item.totalAmount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-center font-bold text-[10px] tabular-nums text-green-700 px-2">{(item.paidAmount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-center font-black text-[10px] tabular-nums text-destructive px-2">{(item.remainingAmount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-center text-[9px] font-bold tabular-nums text-muted-foreground px-2">{item.date ? format(new Date(item.date), "yyyy/MM/dd") : "-"}</TableCell>
                      <TableCell className="text-center px-2">
                        <Badge variant="outline" className={cn(
                          "text-[8px] font-black px-1.5",
                          item.remainingAmount <= 0 ? "text-green-600 border-green-200" : "text-destructive border-red-200"
                        )}>
                          {item.remainingAmount <= 0 ? "مُسددة" : "دين"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right max-w-[100px] px-2">
                        <p className="text-[9px] text-muted-foreground truncate" title={item.notes}>{item.notes}</p>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-20">
                        <div className="flex flex-col items-center gap-2 opacity-20">
                          <FileText className="w-12 h-12" />
                          <p className="font-black text-xs">لا توجد بيانات متاحة</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t flex justify-between items-center z-30">
         <div className="flex flex-col">
            <span className="text-[9px] font-black text-muted-foreground">إجمالي المتبقي المفلتر</span>
            <span className={cn(
              "text-lg font-black tabular-nums",
              activeView === 'to_me' ? "text-green-700" : "text-orange-700"
            )}>
               {reportItems.reduce((acc, curr) => acc + (curr.remainingAmount || 0), 0).toLocaleString()} <span className="text-[9px]">ر.ي</span>
            </span>
         </div>
         <Button 
          className="rounded-2xl lux-gradient h-11 px-6 font-black gap-2 text-white text-xs shadow-xl"
          onClick={() => router.push("/debts")}
         >
            <Wallet className="w-4 h-4" />
            السداد السريع
         </Button>
      </footer>
    </div>
  )
}
