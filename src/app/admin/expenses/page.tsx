
"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Search, 
  Filter, 
  ShoppingCart, 
  Loader2, 
  Calendar, 
  Download,
  Eye,
  Fuel,
  Users,
  Snowflake,
  Waves,
  Utensils,
  MoreHorizontal,
  Car,
  Package
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

const expenseIcons: Record<string, any> = {
  "ديزل": Fuel,
  "عمال": Users,
  "ثلج": Snowflake,
  "ملح": Waves,
  "صيانة": Car,
  "أكياس": Package,
  "أكل": Utensils,
  "أخرى": MoreHorizontal,
}

export default function AllExpensesPage() {
  const router = useRouter()
  const db = useFirestore()
  const { user } = useUser()
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")

  const expensesQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "expenses"), orderBy("expenseDate", "desc"))
  }, [db, user])

  const { data: expenses, isLoading } = useCollection(expensesQuery)

  const filteredExpenses = useMemo(() => {
    if (!expenses) return []
    return expenses.filter(e => {
      const matchesSearch = e.type?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           e.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           e.payeeName?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = typeFilter === "all" || e.type === typeFilter
      return matchesSearch && matchesType
    })
  }, [expenses, searchTerm, typeFilter])

  const expenseTypes = ["all", ...Array.from(new Set((expenses || []).map(e => e.type)))]

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="p-6 bg-white border-b sticky top-0 z-20 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <button onClick={() => router.push("/")} className="p-2 -mr-2">
            <ChevronLeft className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-black text-primary flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            كافة المصروفات
          </h1>
          <Button variant="outline" size="icon" className="rounded-xl border-none bg-muted/50">
            <Download className="w-5 h-5 text-primary" />
          </Button>
        </div>

        <div className="relative" dir="rtl">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="بحث في المصاريف أو الملاحظات..." 
            className="pr-11 h-12 rounded-2xl bg-muted/30 border-none text-right" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" dir="rtl">
          {expenseTypes.map((st) => (
            <button
              key={st}
              onClick={() => setTypeFilter(st)}
              className={cn(
                "px-5 py-2 rounded-full text-[10px] font-black shrink-0 transition-all border",
                typeFilter === st ? "lux-gradient text-white border-transparent shadow-md" : "bg-white text-muted-foreground border-muted-foreground/10"
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
                  <TableHead className="text-right font-black text-[10px]">النوع / التاريخ</TableHead>
                  <TableHead className="text-center font-black text-[10px]">المبلغ</TableHead>
                  <TableHead className="text-center font-black text-[10px]">الدفع</TableHead>
                  <TableHead className="text-left font-black text-[10px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((e) => {
                  const Icon = expenseIcons[e.type] || MoreHorizontal
                  return (
                    <TableRow key={e.id} className="active:bg-muted/50 transition-colors">
                      <TableCell className="text-right py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded-xl text-primary/70">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-foreground">{e.type}</span>
                            <span className="text-[9px] text-muted-foreground font-bold flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" />
                              {e.expenseDate ? format(new Date(e.expenseDate), "dd/MM/yyyy", { locale: ar }) : ""}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-black text-xs tabular-nums text-accent">
                        {e.amount?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "text-[8px] px-1.5 py-0 border-none font-black",
                          e.paymentType === "نقد" ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"
                        )}>
                          {e.paymentType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-left">
                        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg" onClick={() => router.push(`/campaigns/${e.campaignId}?tab=expenses`)}>
                          <Eye className="w-4 h-4 text-primary" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            {filteredExpenses.length === 0 && (
              <div className="text-center py-20 text-muted-foreground font-bold text-sm">
                لا توجد مصروفات مسجلة مطابقة
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
