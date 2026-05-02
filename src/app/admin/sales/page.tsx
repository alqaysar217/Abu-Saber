
"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Search, 
  Filter, 
  Receipt, 
  Loader2, 
  Calendar, 
  User, 
  ArrowUpDown,
  Download,
  Eye,
  FileText,
  Ship,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Fish,
  Scale,
  Coins,
  History,
  Info,
  CheckCircle2,
  AlertCircle
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
import { 
  useFirestore, 
  useUser, 
  useCollection, 
  useMemoFirebase 
} from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { cn } from "@/lib/utils"

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
}

export default function AllSalesDetailedPage() {
  const router = useRouter()
  const db = useFirestore()
  const { user } = useUser()
  
  // States
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCampaign, setFilterCampaign] = useState("all")
  const [filterCustomer, setFilterCustomer] = useState("all")
  const [filterPaymentType, setFilterPaymentType] = useState("all")
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' })

  // Data Fetching
  const salesQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "invoices"), orderBy("invoiceDate", "desc"))
  }, [db, user])
  const { data: invoices, isLoading } = useCollection(salesQuery)

  const customersQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "customers"))
  }, [db, user])
  const { data: customers } = useCollection(customersQuery)

  const campaignsQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "campaigns"))
  }, [db, user])
  const { data: campaigns } = useCollection(campaignsQuery)

  // Flattening and Filtering Data
  const reportData = useMemo(() => {
    if (!invoices) return []

    // 1. Flatten: Invoice -> Items
    let items: any[] = []
    invoices.forEach(inv => {
      const customer = customers?.find(c => c.id === inv.customerId)
      const campaign = campaigns?.find(camp => camp.id === inv.campaignId)
      
      const invoiceItems = inv.items || []
      
      if (invoiceItems.length > 0) {
        invoiceItems.forEach((item: any) => {
          items.push({
            id: `${inv.id}-${item.fishType}-${item.quantity}`,
            invoiceId: inv.id,
            fishType: item.fishType || "غير محدد",
            quantity: item.quantity || 0,
            pricePerKg: item.pricePerKg || item.unitPrice || 0,
            lineTotal: (item.quantity * (item.pricePerKg || item.unitPrice)) || item.lineTotal || 0,
            customerName: customer?.name || "عميل غير معروف",
            customerId: inv.customerId,
            campaignName: campaign?.name || "بدون حملة",
            campaignId: inv.campaignId,
            date: inv.invoiceDate,
            paymentType: inv.paymentType,
            paidAmount: inv.paidAmount || 0,
            remainingAmount: inv.remainingAmount !== undefined ? inv.remainingAmount : ((inv.totalAmount || 0) - (inv.paidAmount || 0)),
            totalAmount: inv.totalAmount,
            status: inv.status,
            notes: inv.notes || inv.description || ""
          })
        })
      } else {
        // Fallback for invoices without nested items
        items.push({
          id: inv.id,
          invoiceId: inv.id,
          fishType: "فواتير قديمة/مجمعة",
          quantity: 1,
          pricePerKg: inv.totalAmount,
          lineTotal: inv.totalAmount,
          customerName: customer?.name || "عميل غير معروف",
          customerId: inv.customerId,
          campaignName: campaign?.name || "بدون حملة",
          campaignId: inv.campaignId,
          date: inv.invoiceDate,
          paymentType: inv.paymentType,
          paidAmount: inv.paidAmount || 0,
          remainingAmount: inv.remainingAmount !== undefined ? inv.remainingAmount : ((inv.totalAmount || 0) - (inv.paidAmount || 0)),
          totalAmount: inv.totalAmount,
          status: inv.status,
          notes: inv.notes || inv.description || ""
        })
      }
    })

    // 2. Filter
    return items.filter(item => {
      const matchesSearch = 
        item.fishType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.invoiceId.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCampaign = filterCampaign === "all" || item.campaignId === filterCampaign
      const matchesCustomer = filterCustomer === "all" || item.customerId === filterCustomer
      const matchesPayment = filterPaymentType === "all" || item.paymentType === filterPaymentType

      return matchesSearch && matchesCampaign && matchesCustomer && matchesPayment
    }).sort((a, b) => {
      // 3. Sort
      const direction = sortConfig.direction === 'asc' ? 1 : -1
      if (sortConfig.key === 'date') return (new Date(a.date).getTime() - new Date(b.date).getTime()) * direction
      if (sortConfig.key === 'amount') return (a.lineTotal - b.lineTotal) * direction
      return 0
    })
  }, [invoices, customers, campaigns, searchTerm, filterCampaign, filterCustomer, filterPaymentType, sortConfig])

  // Export to CSV Function
  const exportToCSV = () => {
    if (reportData.length === 0) return

    const headers = ["نوع السمك", "الكمية", "سعر الكيلو", "إجمالي الصنف", "إجمالي الفاتورة", "المدفوع نقداً", "المتبقي (دين)", "العميل", "التاريخ", "الحملة", "نوع الدفع", "الملاحظات"]
    const rows = reportData.map(item => [
      item.fishType,
      item.quantity,
      item.pricePerKg,
      item.lineTotal,
      item.totalAmount,
      item.paidAmount,
      item.remainingAmount,
      item.customerName,
      format(new Date(item.date), "yyyy-MM-dd"),
      item.campaignName,
      item.paymentType,
      `"${item.notes}"`
    ])

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" // Add BOM for Excel Arabic support
    csvContent += headers.join(",") + "\n"
    rows.forEach(row => {
      csvContent += row.join(",") + "\n"
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `تقرير_مبيعات_تفصيلي_${format(new Date(), "yyyy-MM-dd")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const toggleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }))
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <header className="p-6 bg-white border-b sticky top-0 z-30 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <button onClick={() => router.push("/")} className="p-2 -mr-2">
            <ChevronLeft className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-black text-primary flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            تقرير المبيعات الشامل
          </h1>
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-xl border-none bg-muted/50 text-primary"
            onClick={exportToCSV}
          >
            <Download className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex gap-2" dir="rtl">
          <div className="relative flex-1 group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary" />
            <Input 
              placeholder="بحث بنوع السمك أو العميل..." 
              className="pr-11 h-12 rounded-2xl bg-muted/30 border-none text-right" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Button 
            variant="outline" 
            className="h-12 rounded-2xl px-4 gap-2 border-none bg-muted/30 text-primary font-bold"
            onClick={() => toggleSort('date')}
          >
            <ArrowUpDown className="w-4 h-4" />
            تاريخ
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" dir="rtl">
          <select 
            className="h-9 rounded-full bg-muted/50 border-none text-[10px] font-bold px-4 outline-none focus:ring-1 focus:ring-primary shrink-0"
            value={filterCampaign}
            onChange={e => setFilterCampaign(e.target.value)}
          >
            <option value="all">كل الحملات</option>
            {campaigns?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select 
            className="h-9 rounded-full bg-muted/50 border-none text-[10px] font-bold px-4 outline-none focus:ring-1 focus:ring-primary shrink-0"
            value={filterCustomer}
            onChange={e => setFilterCustomer(e.target.value)}
          >
            <option value="all">كل العملاء</option>
            {customers?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select 
            className="h-9 rounded-full bg-muted/50 border-none text-[10px] font-bold px-4 outline-none focus:ring-1 focus:ring-primary shrink-0"
            value={filterPaymentType}
            onChange={e => setFilterPaymentType(e.target.value)}
          >
            <option value="all">طريقة الدفع</option>
            <option value="نقد">نقد</option>
            <option value="دين">دين</option>
            <option value="جزئي">جزئي</option>
          </select>
        </div>
      </header>

      <main className="flex-1 p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" />
            <p className="text-xs font-bold text-muted-foreground">جاري تحميل التقارير...</p>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table dir="rtl" className="min-w-[1200px]">
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-right font-black text-[10px] py-4">صنف السمك / الكمية</TableHead>
                    <TableHead className="text-right font-black text-[10px]">العميل / التاريخ</TableHead>
                    <TableHead className="text-center font-black text-[10px]">الحملة</TableHead>
                    <TableHead className="text-center font-black text-[10px]">التحصيل (المدفوع/المتبقي)</TableHead>
                    <TableHead className="text-center font-black text-[10px]">إجمالي الصنف</TableHead>
                    <TableHead className="text-right font-black text-[10px]">المستلم/ملاحظات</TableHead>
                    <TableHead className="text-left font-black text-[10px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((item) => (
                    <TableRow key={item.id} className="active:bg-muted/50 transition-colors border-b-muted/20">
                      <TableCell className="text-right py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/5 text-primary rounded-xl shrink-0">
                            <Fish className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-foreground">{item.fishType}</span>
                            <span className="text-[9px] text-muted-foreground font-bold flex items-center gap-1 mt-0.5">
                              <Scale className="w-2.5 h-2.5" />
                              {item.quantity.toLocaleString()} كجم × {item.pricePerKg.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-foreground truncate max-w-[150px]">{item.customerName}</span>
                          <span className="text-[9px] text-muted-foreground font-bold flex items-center gap-1 mt-0.5">
                            <Calendar className="w-2.5 h-2.5" />
                            {item.date ? format(new Date(item.date), "dd MMM yyyy", { locale: ar }) : ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-[9px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-lg truncate max-w-[100px]">
                          {item.campaignName}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex gap-2">
                             <Badge className={cn(
                               "text-[8px] px-1.5 py-0 border-none font-black shadow-none",
                               item.paymentType === "نقد" ? "bg-green-50 text-green-600" : (item.paymentType === "دين" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600")
                             )}>
                               {item.paymentType}
                             </Badge>
                             <span className="text-[9px] font-black text-green-700 tabular-nums">مدفوع: {item.paidAmount.toLocaleString()}</span>
                          </div>
                          {item.remainingAmount > 0 && (
                            <span className="text-[9px] font-black text-destructive tabular-nums bg-destructive/5 px-2 rounded">
                              متبقي: {item.remainingAmount.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-black text-xs tabular-nums text-primary">
                        {item.lineTotal.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right max-w-[150px]">
                        <p className="text-[9px] text-muted-foreground font-medium truncate italic" title={item.notes}>
                          {item.notes || "- لا يوجد -"}
                        </p>
                      </TableCell>
                      <TableCell className="text-left">
                        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-primary" onClick={() => router.push(`/campaigns/${item.campaignId}?tab=sales`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {reportData.length === 0 && (
              <div className="text-center py-20 text-muted-foreground font-bold text-sm bg-muted/10">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                لا توجد سجلات مبيعات تطابق هذه الفلاتر
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex justify-between items-center z-40">
         <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">إجمالي المبيعات المفلترة</span>
            <span className="text-lg font-black text-primary tabular-nums">
               {reportData.reduce((acc, curr) => acc + curr.lineTotal, 0).toLocaleString()} <span className="text-[10px]">ر.ي</span>
            </span>
         </div>
         <Button 
          className="rounded-2xl lux-gradient h-12 px-6 font-black gap-2 shadow-lg"
          onClick={() => router.push("/invoices/new")}
         >
            <Receipt className="w-5 h-5" />
            فاتورة جديدة
         </Button>
      </footer>
    </div>
  )
}
