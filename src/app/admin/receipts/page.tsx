
"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Search, 
  Filter, 
  FileText, 
  Loader2, 
  Calendar, 
  User, 
  Download,
  History,
  ArrowDownToLine,
  ArrowUpFromLine
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

export default function AllReceiptsPage() {
  const router = useRouter()
  const db = useFirestore()
  const { user } = useUser()
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")

  const receiptsQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "paymentTransactions"), orderBy("transactionDate", "desc"))
  }, [db, user])

  const { data: receipts, isLoading } = useCollection(receiptsQuery)

  const filteredReceipts = useMemo(() => {
    if (!receipts) return []
    return receipts.filter(r => {
      const matchesSearch = r.entityName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           r.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = typeFilter === "all" || r.type === typeFilter
      return matchesSearch && matchesType
    })
  }, [receipts, searchTerm, typeFilter])

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="p-6 bg-white border-b sticky top-0 z-20 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <button onClick={() => router.push("/")} className="p-2 -mr-2">
            <ChevronLeft className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-black text-primary flex items-center gap-2">
            <FileText className="w-5 h-5" />
            سجل الإيصالات (السداد)
          </h1>
          <Button variant="outline" size="icon" className="rounded-xl border-none bg-muted/50">
            <Download className="w-5 h-5 text-primary" />
          </Button>
        </div>

        <div className="relative" dir="rtl">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="بحث باسم المستلم أو الطرف الآخر..." 
            className="pr-11 h-12 rounded-2xl bg-muted/30 border-none text-right" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" dir="rtl">
          {["all", "customer_payment", "supplier_payment"].map((st) => (
            <button
              key={st}
              onClick={() => setTypeFilter(st)}
              className={cn(
                "px-5 py-2 rounded-full text-[10px] font-black shrink-0 transition-all border",
                typeFilter === st ? "lux-gradient text-white border-transparent shadow-md" : "bg-white text-muted-foreground border-muted-foreground/10"
              )}
            >
              {st === "all" ? "الكل" : (st === 'customer_payment' ? 'استلام (قبض)' : 'صرف (دفع)')}
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
                  <TableHead className="text-right font-black text-[10px]">البيان / التاريخ</TableHead>
                  <TableHead className="text-center font-black text-[10px]">المبلغ</TableHead>
                  <TableHead className="text-center font-black text-[10px]">النوع</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.map((r) => (
                  <TableRow key={r.id} className="active:bg-muted/50 transition-colors">
                    <TableCell className="text-right py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-foreground truncate max-w-[150px]">{r.entityName || "جهة غير معروفة"}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] text-muted-foreground font-bold flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" />
                            {r.transactionDate ? format(new Date(r.transactionDate), "dd/MM/yyyy", { locale: ar }) : ""}
                          </span>
                          {r.notes && <span className="text-[9px] text-primary/60 font-bold bg-primary/5 px-1.5 rounded">ملاحظة: {r.notes}</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-black text-sm tabular-nums">
                      <span className={cn(r.type === 'customer_payment' ? "text-green-700" : "text-orange-700")}>
                        {r.amount?.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className={cn(
                        "inline-flex items-center justify-center p-1.5 rounded-lg shadow-inner",
                        r.type === 'customer_payment' ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"
                      )}>
                        {r.type === 'customer_payment' ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredReceipts.length === 0 && (
              <div className="text-center py-20 text-muted-foreground font-bold text-sm">
                لا توجد إيصالات سداد مسجلة
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
