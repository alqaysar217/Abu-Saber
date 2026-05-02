
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
  FileText
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

export default function AllSalesPage() {
  const router = useRouter()
  const db = useFirestore()
  const { user } = useUser()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const salesQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "invoices"), orderBy("invoiceDate", "desc"))
  }, [db, user])

  const { data: sales, isLoading } = useCollection(salesQuery)

  const customersQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "customers"))
  }, [db, user])
  const { data: customers } = useCollection(customersQuery)

  const filteredSales = useMemo(() => {
    if (!sales) return []
    return sales.filter(s => {
      const customer = customers?.find(c => c.id === s.customerId)
      const matchesSearch = customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           s.id?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === "all" || s.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [sales, customers, searchTerm, statusFilter])

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="p-6 bg-white border-b sticky top-0 z-20 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <button onClick={() => router.push("/")} className="p-2 -mr-2">
            <ChevronLeft className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-black text-primary flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            كافة المبيعات (الفواتير)
          </h1>
          <Button variant="outline" size="icon" className="rounded-xl border-none bg-muted/50">
            <Download className="w-5 h-5 text-primary" />
          </Button>
        </div>

        <div className="flex gap-2" dir="rtl">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="بحث باسم العميل أو الفاتورة..." 
              className="pr-11 h-12 rounded-2xl bg-muted/30 border-none text-right" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-12 rounded-2xl gap-2 border-none bg-muted/30 font-bold px-4">
            <Filter className="w-4 h-4" />
            تصفية
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" dir="rtl">
          {["all", "مدفوعة", "دين", "جزئي"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                "px-5 py-2 rounded-full text-[10px] font-black shrink-0 transition-all border",
                statusFilter === st ? "lux-gradient text-white border-transparent shadow-md" : "bg-white text-muted-foreground border-muted-foreground/10"
              )}
            >
              {st === "all" ? "الكل" : st}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 p-4 pb-10">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" /></div>
        ) : (
          <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
            <Table dir="rtl">
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-right font-black text-[10px]">العميل / التاريخ</TableHead>
                  <TableHead className="text-center font-black text-[10px]">المبلغ</TableHead>
                  <TableHead className="text-center font-black text-[10px]">الحالة</TableHead>
                  <TableHead className="text-left font-black text-[10px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => {
                  const customer = customers?.find(c => c.id === sale.customerId)
                  return (
                    <TableRow key={sale.id} className="active:bg-muted/50 transition-colors">
                      <TableCell className="text-right py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-foreground truncate max-w-[120px]">{customer?.name || "عميل غير معروف"}</span>
                          <span className="text-[9px] text-muted-foreground font-bold flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" />
                            {sale.invoiceDate ? format(new Date(sale.invoiceDate), "dd MMM yyyy", { locale: ar }) : ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-black text-xs tabular-nums text-green-700">
                        {sale.totalAmount?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "text-[8px] px-1.5 py-0 border-none font-black shadow-none",
                          sale.status === "مدفوعة" ? "bg-green-50 text-green-600" : (sale.status === "دين" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600")
                        )}>
                          {sale.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-left">
                        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg" onClick={() => router.push(`/campaigns/${sale.campaignId}?tab=sales`)}>
                          <Eye className="w-4 h-4 text-primary" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            {filteredSales.length === 0 && (
              <div className="text-center py-20 text-muted-foreground font-bold text-sm">
                لا توجد سجلات مبيعات مطابقة
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
