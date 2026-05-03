
"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Search, 
  Wallet, 
  Loader2, 
  ChevronLeft, 
  Calendar, 
  Ship, 
  Banknote,
  CheckCircle2,
  FileText,
  AlertCircle,
  ArrowUpDown,
  Download,
  ArrowRight,
  Eye,
  Hash,
  Users
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
  
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>('date_desc')
  const [filterCampaignId, setFilterCampaignId] = useState<string>("all")
  const [filterDebtStatus, setFilterDebtStatus] = useState<string>("unpaid") 
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  // Subscriptions
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
    return query(collection(db, "users", user.uid, "invoices"), orderBy("invoiceDate", "desc"))
  }, [db, user])
  const { data: invoices } = useCollection(invoicesQuery)

  const purchasesQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "purchases"), orderBy("purchaseDate", "desc"))
  }, [db, user])
  const { data: purchases } = useCollection(purchasesQuery)

  const expensesQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "expenses"), orderBy("expenseDate", "desc"))
  }, [db, user])
  const { data: expenses } = useCollection(expensesQuery)

  const allDebtsItems = useMemo(() => {
    if (!invoices || !purchases || !expenses) return []
    const combined: any[] = []
    
    invoices.filter(inv => inv.paymentType !== "نقد").forEach(inv => {
      const customer = customers?.find(c => c.id === inv.customerId)
      const campaign = campaigns?.find(c => c.id === inv.campaignId)
      combined.push({
        ...inv,
        entityName: customer?.name || "عميل غير معروف",
        campaignName: campaign?.name || "حملة غير معروفة",
        date: inv.invoiceDate,
        remainingAmount: inv.remainingAmount !== undefined ? inv.remainingAmount : ((inv.totalAmount || 0) - (inv.paidAmount || 0)),
        trType: 'sale',
        typeLabel: 'دين لك (بيع)'
      })
    })

    purchases.filter(p => p.paymentType !== "نقد").forEach(p => {
      const supplier = suppliers?.find(s => s.id === p.supplierId)
      const campaign = campaigns?.find(c => c.id === p.campaignId)
      combined.push({
        ...p,
        entityName: supplier?.name || "مورد غير معروف",
        campaignName: campaign?.name || "حملة غير معروفة",
        date: p.purchaseDate,
        remainingAmount: p.remainingAmount !== undefined ? p.remainingAmount : ((p.totalAmount || 0) - (p.paidAmount || 0)),
        trType: 'purchase',
        typeLabel: 'دين عليك (شراء)'
      })
    })

    expenses.filter(e => e.paymentType !== "نقد").forEach(e => {
      const supplier = suppliers?.find(s => s.id === e.payeeId)
      const campaign = campaigns?.find(c => c.id === e.campaignId)
      combined.push({
        ...e,
        entityName: supplier?.name || e.payeeName || "جهة غير معروفة",
        campaignName: campaign?.name || "حملة غير معروفة",
        date: e.expenseDate,
        remainingAmount: e.remainingAmount || 0,
        totalAmount: e.amount,
        trType: 'expense',
        invoiceNumber: "مصروف",
        typeLabel: 'دين عليك (مصروف)'
      })
    })

    return combined.filter(item => {
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

      return matchesSearch && matchesCampaign && matchesStatus && matchesDate
    }).sort((a, b) => {
      if (sortBy === 'amount_desc') return b.remainingAmount - a.remainingAmount
      if (sortBy === 'amount_asc') return a.remainingAmount - b.remainingAmount
      if (sortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime()
      if (sortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime()
      return 0
    })
  }, [invoices, purchases, expenses, customers, suppliers, campaigns, searchTerm, filterCampaignId, filterDebtStatus, fromDate, toDate, sortBy])

  const exportToCSV = () => {
    if (allDebtsItems.length === 0) return
    const headers = ["رقم الفاتورة", "النوع", "الجهة / الاسم", "الحملة", "إجمالي المبلغ", "المدفوع", "المتبقي (الدين)", "التاريخ", "الحالة"]
    const rows = allDebtsItems.map(item => [
      item.invoiceNumber || "-",
      item.typeLabel,
      item.entityName,
      item.campaignName,
      item.totalAmount || item.amount,
      item.paidAmount || 0,
      item.remainingAmount,
      format(new Date(item.date), "yyyy-MM-dd"),
      item.remainingAmount <= 0 ? "مُسددة" : "ديون قائمة"
    ])

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"
    csvContent += headers.join(",") + "\n"
    rows.forEach(row => { csvContent += row.join(",") + "\n" })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Full_Debts_Report_${format(new Date(), "yyyy-MM-dd")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const isLoading = !invoices || !purchases || !campaigns || !expenses

  return (
    <div className="flex flex-col min-h-screen bg-background pb-10">
      <header className="p-6 bg-white border-b sticky top-0 z-10 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <button onClick={() => router.back()} className="p-2 -mr-2">
            <ChevronLeft className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-black text-primary flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            سجل الديون التفصيلي (محاسبي)
          </h1>
          <Button variant="outline" size="icon" className="rounded-xl" onClick={exportToCSV}>
            <Download className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="flex gap-2" dir="rtl">
          <div className="relative flex-1 group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="بحث بالاسم أو رقم الفاتورة..."
              className="pr-11 h-12 rounded-2xl bg-muted/50 border-none text-right" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-muted/20 p-3 rounded-2xl border border-dashed space-y-2" dir="rtl">
          <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" /> فلترة المدة الزمنية:
          </p>
          <div className="flex items-center gap-2">
            <Input type="date" className="h-10 rounded-xl bg-white border-none text-[11px] font-bold text-left" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-30" />
            <Input type="date" className="h-10 rounded-xl bg-white border-none text-[11px] font-bold text-left" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" dir="rtl">
           <select className="h-9 rounded-full bg-muted/50 border-none text-[10px] font-bold px-4 outline-none" value={filterDebtStatus} onChange={e => setFilterDebtStatus(e.target.value)}>
             <option value="all">كل الحالات</option>
             <option value="unpaid">ديون قائمة</option>
             <option value="paid">حسابات مُصفرة</option>
           </select>
           <select className="h-9 rounded-full bg-muted/50 border-none text-[10px] font-bold px-4 outline-none" value={filterCampaignId} onChange={e => setFilterCampaignId(e.target.value)}>
             <option value="all">كل الحملات</option>
             {campaigns?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
           </select>
        </div>
      </header>

      <main className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" /></div>
        ) : (
          <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table dir="rtl" className="min-w-[1200px]">
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-right font-black text-[10px] py-4">رقم الفاتورة</TableHead>
                    <TableHead className="text-right font-black text-[10px]">النوع</TableHead>
                    <TableHead className="text-right font-black text-[10px]">الجهة / الاسم</TableHead>
                    <TableHead className="text-right font-black text-[10px]">الحملة</TableHead>
                    <TableHead className="text-center font-black text-[10px]">الإجمالي</TableHead>
                    <TableHead className="text-center font-black text-[10px]">المدفوع</TableHead>
                    <TableHead className="text-center font-black text-[10px]">المتبقي (الدين)</TableHead>
                    <TableHead className="text-center font-black text-[10px]">التاريخ</TableHead>
                    <TableHead className="text-left font-black text-[10px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allDebtsItems.map((item, index) => (
                    <TableRow key={index} className={cn(index % 2 !== 0 ? "bg-muted/5" : "bg-white")}>
                      <TableCell className="text-right py-4 font-black text-[10px] text-primary">{item.invoiceNumber || "-"}</TableCell>
                      <TableCell className="text-right"><Badge variant="outline" className="text-[8px] font-bold">{item.typeLabel}</Badge></TableCell>
                      <TableCell className="text-right text-xs font-bold">{item.entityName}</TableCell>
                      <TableCell className="text-right text-[10px] font-bold text-muted-foreground">{item.campaignName}</TableCell>
                      <TableCell className="text-center font-bold text-xs tabular-nums">{(item.totalAmount || 0).toLocaleString('en-US')}</TableCell>
                      <TableCell className="text-center font-bold text-xs tabular-nums text-green-700">{(item.paidAmount || 0).toLocaleString('en-US')}</TableCell>
                      <TableCell className="text-center font-black text-xs tabular-nums text-destructive">{(item.remainingAmount || 0).toLocaleString('en-US')}</TableCell>
                      <TableCell className="text-center text-[10px] font-bold tabular-nums text-muted-foreground">{item.date ? format(new Date(item.date), "yyyy/MM/dd") : "-"}</TableCell>
                      <TableCell className="text-left">
                        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg" onClick={() => router.push(`/campaigns/${item.campaignId}?tab=${item.trType === 'sale' ? 'sales' : (item.trType === 'purchase' ? 'purchases' : 'expenses')}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
